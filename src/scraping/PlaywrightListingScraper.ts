import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import type { JobListing, ListingScrapeResult, PageScrapeError } from '../domain/JobListing.js';
import type { IListingScraper } from '../ports/IListingScraper.js';
import { parseJobCountFromText } from '../parsing/SeekJobCountParser.js';
import { parseSeekJobCardHtml } from '../parsing/SeekJobCardParser.js';
import {
  buildSeekListingPageUrl,
  CARD_LOAD_TIMEOUT_MS,
  classifyMissingCardsWait,
  decideNextPageAction,
  MAX_CONSECUTIVE_PAGE_FAILURES,
} from './SeekPagination.js';

export const JOB_CARD_SELECTOR =
  'article[data-testid="job-card"], [data-automation="normalJob"], [data-testid="job-result"], div[data-card-type="JobCard"]';

export type PlaywrightListingScraperOptions = {
  headless?: boolean;
  maxPages?: number;
  /** Max time to wait for job cards on a page (event-driven). Default 30s. */
  cardLoadTimeoutMs?: number;
  /** Injected browser factory for tests (DIP). */
  launchBrowser?: () => Promise<Browser>;
};

/**
 * Playwright adapter for IListingScraper.
 * Waits for job-card DOM (up to 30s) instead of a fixed sleep.
 * A timed-out page is skipped; the listing continues unless consecutive failures hit the cap.
 */
export class PlaywrightListingScraper implements IListingScraper {
  private readonly headless: boolean;
  private readonly maxPages: number;
  private readonly cardLoadTimeoutMs: number;
  private readonly launchBrowser: () => Promise<Browser>;

  constructor(options: PlaywrightListingScraperOptions = {}) {
    this.headless = options.headless ?? true;
    this.maxPages = options.maxPages ?? 100;
    this.cardLoadTimeoutMs = options.cardLoadTimeoutMs ?? CARD_LOAD_TIMEOUT_MS;
    this.launchBrowser =
      options.launchBrowser ?? (() => chromium.launch({ headless: this.headless }));
  }

  async scrapeListing(url: string): Promise<ListingScrapeResult> {
    const browser = await this.launchBrowser();
    let context: BrowserContext | undefined;
    try {
      context = await browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        locale: 'en-AU',
      });
      const page = await context.newPage();
      const collected = await this.collectAllPages(page, url);
      return { url, ...collected };
    } finally {
      await context?.close().catch(() => undefined);
      await browser.close().catch(() => undefined);
    }
  }

  private async readReportedJobCount(page: Page): Promise<number | null> {
    const selectors = [
      '[data-automation="jobs-found-title"]',
      '[data-automation="jobSearchResultCount"]',
      '[data-testid="total-jobs-count"]',
      '[data-automation="searchResultCount"]',
    ];

    for (const selector of selectors) {
      const el = page.locator(selector).first();
      if ((await el.count()) === 0) continue;
      const text = await el.textContent();
      const count = parseJobCountFromText(text);
      if (count !== null) return count;
    }

    const bodyText = await page.locator('body').innerText().catch(() => '');
    const match = bodyText.match(/\b([\d,]+)\+?\s*jobs?\b/i);
    return match ? parseJobCountFromText(match[0]) : null;
  }

  private async waitForJobCards(page: Page): Promise<void> {
    await page.locator(JOB_CARD_SELECTOR).first().waitFor({
      state: 'visible',
      timeout: this.cardLoadTimeoutMs,
    });
  }

  private async collectAllPages(
    page: Page,
    listingUrl: string
  ): Promise<{
    jobs: JobListing[];
    totalPages: number;
    reportedJobCount: number | null;
    pageErrors: PageScrapeError[];
  }> {
    const allJobs: JobListing[] = [];
    const seen = new Set<string>();
    const pageErrors: PageScrapeError[] = [];
    let reportedJobCount: number | null = null;
    let pageCount = 0;
    let consecutiveFailures = 0;

    while (pageCount < this.maxPages) {
      pageCount += 1;
      const pageUrl = buildSeekListingPageUrl(listingUrl, pageCount);
      let pageFailed = false;
      let cardsPresent = false;
      let added = 0;

      try {
        await page.goto(pageUrl, {
          waitUntil: 'domcontentloaded',
          timeout: this.cardLoadTimeoutMs,
        });
        await this.waitForJobCards(page);
      } catch {
        if (classifyMissingCardsWait({ pageCount, jobsCollectedSoFar: allJobs.length }) === 'end-of-listing') {
          // Last real page already scraped; this ?page=N does not exist. Stop without email/error noise.
          pageCount -= 1;
          break;
        }
        pageFailed = true;
        consecutiveFailures += 1;
        pageErrors.push({
          page: pageCount,
          error: `Skipped page ${pageCount}: job cards did not appear within ${this.cardLoadTimeoutMs}ms`,
        });
      }

      if (!pageFailed) {
        consecutiveFailures = 0;
        if (reportedJobCount === null) {
          reportedJobCount = await this.readReportedJobCount(page);
        }

        const cardHtmlList = await this.readCardHtml(page);
        cardsPresent = cardHtmlList.length > 0;

        for (const html of cardHtmlList) {
          const job = parseSeekJobCardHtml(html);
          if (!job) continue;
          const key = `${job.jobTitle}||${job.company}||${job.seekUrl}`;
          if (seen.has(key)) continue;
          seen.add(key);
          allJobs.push(job);
          added += 1;
        }
      }

      if (
        decideNextPageAction({
          pageCount,
          maxPages: this.maxPages,
          addedOnPage: added,
          cardsPresent,
          pageFailed,
          consecutiveFailures,
          maxConsecutiveFailures: MAX_CONSECUTIVE_PAGE_FAILURES,
        }) === 'stop'
      ) {
        break;
      }
    }

    return { jobs: allJobs, totalPages: pageCount, reportedJobCount, pageErrors };
  }

  private async readCardHtml(page: Page): Promise<string[]> {
    return page
      .locator(JOB_CARD_SELECTOR)
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).outerHTML));
  }
}
