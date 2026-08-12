import * as cheerio from 'cheerio';
import type { JobListing } from '../domain/JobListing.js';
import { parseSeekLocation } from './SeekLocationParser.js';
import { resolvePostedDate } from './SeekPostedDateParser.js';

function firstText($: cheerio.CheerioAPI, root: cheerio.Cheerio<cheerio.Element>, selectors: string[]): string {
  for (const selector of selectors) {
    const el = root.find(selector).first();
    const text = el.text().replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  return '';
}

function firstHref($: cheerio.CheerioAPI, root: cheerio.Cheerio<cheerio.Element>, selectors: string[]): string {
  for (const selector of selectors) {
    const el = root.find(selector).first();
    const href = el.attr('href');
    if (href && href.includes('/job/')) return href;
  }
  return '';
}

/**
 * SRP: HTML card fragment → JobListing.
 * Used by Playwright scraper after outerHTML capture (DIP-friendly for unit tests).
 */
export function parseSeekJobCardHtml(html: string): JobListing | null {
  const $ = cheerio.load(html);
  const root = $('article, [data-testid="job-card"], body').first();

  const titleLink = root.find('a[data-automation="jobTitle"]').first();
  const jobTitle =
    titleLink.text().replace(/\s+/g, ' ').trim() ||
    firstText($, root, ['h3 a[href*="/job"]', '[data-testid="job-title"]']);
  let seekUrl =
    titleLink.attr('href') ||
    firstHref($, root, ['a[href*="/job/"]', 'a[data-automation="jobTitle"]']);

  if (!jobTitle || !seekUrl || jobTitle.length < 2) return null;

  if (seekUrl.startsWith('/')) {
    seekUrl = `https://www.au.seek.com${seekUrl}`;
  }

  try {
    const u = new URL(seekUrl);
    seekUrl = `${u.origin}${u.pathname}`;
  } catch {
    // keep raw
  }

  const company = firstText($, root, [
    '[data-automation="jobCompany"] a',
    '[data-automation="jobCompany"]',
    '[data-testid="job-company"]',
  ]);

  const locationRaw = firstText($, root, [
    '[data-testid="job-card-location"]',
    '[data-automation="jobLocation"]',
    'a[data-automation="jobLocation"]',
  ]);
  const { suburbs, state } = parseSeekLocation(locationRaw);

  const salary = firstText($, root, [
    '[data-automation="jobSalary"]',
    '[data-testid="jobSalary"]',
    '[data-testid="job-salary"]',
  ]);

  const rawDate = firstText($, root, [
    'time[datetime]',
    '[data-automation="jobListingDate"]',
    '[data-testid="job-card-date"]',
  ]);

  return {
    jobTitle,
    company,
    suburbs,
    state,
    salary,
    postedDate: resolvePostedDate(rawDate),
    seekUrl,
  };
}
