import type { JobListing, ListingScrapeResult } from '../domain/JobListing.js';

/** DIP: orchestrator depends on this, not Playwright. */
export interface IListingScraper {
  scrapeListing(url: string): Promise<ListingScrapeResult>;
}

/** ISP: export only what callers need. */
export interface IJobExporter {
  export(jobs: JobListing[], meta?: { sourceUrl?: string }): Promise<string>;
}
