import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import type { JobListing, ListingScrapeResult } from '../domain/JobListing.js';
import type { IListingScraper } from '../ports/IListingScraper.js';
import { parseJobCountFromText } from '../parsing/SeekJobCountParser.js';
import { parseSeekJobCardHtml } from '../parsing/SeekJobCardParser.js';
import { buildSeekListingPageUrl, shouldContinueToNextPage } from './SeekPagination.js';

export type PlaywrightListingScraperOptions = {
  headless?: boolean;
  maxPages?: number;
  pageWaitMs?: number;
  afterNavWaitMs?: number;
  /** Injected browser factory for tests (DIP). */
  launchBrowser?: () => Promise<Browser>;
};

/**
 * Playwright adapter for IListingScraper.
 * Paginates a Seek listing URL until Next is gone or maxPages is hit.
 * No job-count routing — every URL is scraped the same way.
 */
export class PlaywrightListingScraper implements IListingScraper {
  private readonly headless: boolean;
  private readonly maxPages: number;
  private readonly pageWaitMs: number;
  private readonly afterNavWaitMs: number;
  private readonly launchBrowser: () => Promise<Browser>;

  constructor(options: PlaywrightListingScraperOptions = {}) {
    this.headless = options.headless ?? true;
    this.maxPages = options.maxPages ?? 100;
    this.pageWaitMs = options.pageWaitMs ?? 1500;
    this.afterNavWaitMs = options.afterNavWaitMs ?? 2500;
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
      const firstUrl = buildSeekListingPageUrl(url, 1);
      await page.goto(firstUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(this.pageWaitMs);

      const reportedJobCount = await this.readReportedJobCount(page);
      const { jobs, totalPages } = await this.collectAllPages(page, url);

      return { url, jobs, totalPages, reportedJobCount };
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

    const bodyText = await page.locator('body').innerText();
    const match = bodyText.match(/\b([\d,]+)\+?\s*jobs?\b/i);
    return match ? parseJobCountFromText(match[0]) : null;
  }

  private async collectAllPages(
    page: Page,
    listingUrl: string
  ): Promise<{ jobs: JobListing[]; totalPages: number }> {
    const allJobs: JobListing[] = [];
    const seen = new Set<string>();
    let pageCount = 0;

    while (pageCount < this.maxPages) {
      pageCount += 1;
      await sleep(this.pageWaitMs);

      let cardHtmlList = await this.readCardHtml(page);

      if (cardHtmlList.length === 0 && pageCount === 1) {
        await sleep(2500);
        cardHtmlList = await this.readCardHtml(page);
      }

      if (cardHtmlList.length === 0) break;

      let added = 0;
      for (const html of cardHtmlList) {
        const job = parseSeekJobCardHtml(html);
        if (!job) continue;
        const key = `${job.jobTitle}||${job.company}||${job.seekUrl}`;
        if (seen.has(key)) continue;
        seen.add(key);
        allJobs.push(job);
        added += 1;
      }

      // Keep requesting ?page=N until a page yields no new jobs (Next button is unreliable under overlays).
      if (
        !shouldContinueToNextPage({
          pageCount,
          maxPages: this.maxPages,
          addedOnPage: added,
        })
      ) {
        break;
      }

      const nextUrl = buildSeekListingPageUrl(listingUrl, pageCount + 1);
      await page.goto(nextUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await sleep(this.afterNavWaitMs);
    }

    return { jobs: allJobs, totalPages: pageCount };
  }

  private async readCardHtml(page: Page): Promise<string[]> {
    return page
      .locator(
        'article[data-testid="job-card"], [data-automation="normalJob"], [data-testid="job-result"], div[data-card-type="JobCard"]'
      )
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLElement).outerHTML));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
