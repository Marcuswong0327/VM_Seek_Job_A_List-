import type { ListingScrapeResult } from '../domain/JobListing.js';
import type { IListingScraper } from '../ports/IListingScraper.js';

export type ListingRunOutcome = ListingScrapeResult & {
  error?: string;
};

/**
 * SRP: run listing URLs one-by-one in order.
 * OCP: new scrape strategies plug in via IListingScraper — no under/over-30 branching.
 */
export class SequentialListingOrchestrator {
  constructor(private readonly scraper: IListingScraper) {}

  async run(urls: string[]): Promise<ListingRunOutcome[]> {
    const outcomes: ListingRunOutcome[] = [];

    for (const url of urls) {
      try {
        const result = await this.scraper.scrapeListing(url);
        outcomes.push(result);
      } catch (err) {
        outcomes.push({
          url,
          jobs: [],
          totalPages: 0,
          reportedJobCount: null,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return outcomes;
  }
}
