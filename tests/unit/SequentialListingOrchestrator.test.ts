import { describe, expect, it, vi } from 'vitest';
import type { IListingScraper } from '../../src/ports/IListingScraper.js';
import type { ListingScrapeResult } from '../../src/domain/JobListing.js';
import { SequentialListingOrchestrator } from '../../src/scraping/SequentialListingOrchestrator.js';

function result(url: string, jobCount: number): ListingScrapeResult {
  return {
    url,
    totalPages: 1,
    reportedJobCount: jobCount,
    jobs: Array.from({ length: Math.min(jobCount, 2) }, (_, i) => ({
      state: 'Sydney (NSW)',
      suburbs: 'CBD',
      jobTitle: `Role ${i + 1}`,
      company: 'Acme',
      salary: '',
      postedDate: '',
      seekUrl: `https://au.seek.com/job/${i + 1}`,
    })),
  };
}

describe('SequentialListingOrchestrator', () => {
  it('scrapes URLs in given order regardless of job volume', async () => {
    const callOrder: string[] = [];
    const scraper: IListingScraper = {
      scrapeListing: vi.fn(async (url: string) => {
        callOrder.push(url);
        if (url.includes('big')) return result(url, 520);
        return result(url, 30);
      }),
    };

    const orchestrator = new SequentialListingOrchestrator(scraper);
    const urls = [
      'https://au.seek.com/big-employer-jobs',
      'https://au.seek.com/small-employer-jobs',
    ];

    const outcomes = await orchestrator.run(urls);

    expect(callOrder).toEqual(urls);
    expect(outcomes).toHaveLength(2);
    expect(outcomes[0].reportedJobCount).toBe(520);
    expect(outcomes[1].reportedJobCount).toBe(30);
    expect(scraper.scrapeListing).toHaveBeenCalledTimes(2);
  });

  it('continues to the next URL when one scrape fails', async () => {
    const scraper: IListingScraper = {
      scrapeListing: vi.fn(async (url: string) => {
        if (url.includes('fail')) throw new Error('boom');
        return result(url, 12);
      }),
    };

    const orchestrator = new SequentialListingOrchestrator(scraper);
    const outcomes = await orchestrator.run([
      'https://au.seek.com/fail-jobs',
      'https://au.seek.com/ok-jobs',
    ]);

    expect(outcomes[0].error).toMatch(/boom/);
    expect(outcomes[0].jobs).toEqual([]);
    expect(outcomes[1].jobs).toHaveLength(2);
    expect(outcomes[1].error).toBeUndefined();
  });
});
