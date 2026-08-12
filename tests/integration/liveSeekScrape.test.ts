import { describe, expect, it } from 'vitest';
import { PlaywrightListingScraper } from '../../src/scraping/PlaywrightListingScraper.js';
import { SequentialListingOrchestrator } from '../../src/scraping/SequentialListingOrchestrator.js';

/**
 * Live Seek scrape — run with: npm run test:integration
 * Skipped automatically when SEEK_LIVE=0.
 */
const liveEnabled = process.env.SEEK_LIVE !== '0';

describe.runIf(liveEnabled)('live Seek sequential scrape', () => {
  it('scrapes two employer listing URLs in order without a 30-job split', async () => {
    const urls = [
      'https://au.seek.com/William-Adams-Pty-Ltd-jobs',
      'https://au.seek.com/hakka-jobs',
    ];

    const scraper = new PlaywrightListingScraper({
      headless: true,
      maxPages: 5,
      pageWaitMs: 2000,
      afterNavWaitMs: 3000,
    });
    const orchestrator = new SequentialListingOrchestrator(scraper);
    const outcomes = await orchestrator.run(urls);

    expect(outcomes).toHaveLength(2);
    expect(outcomes[0].url).toBe(urls[0]);
    expect(outcomes[1].url).toBe(urls[1]);

    for (const outcome of outcomes) {
      expect(outcome.error, outcome.error).toBeUndefined();
      expect(outcome.jobs.length).toBeGreaterThan(0);
      const sample = outcome.jobs[0];
      expect(sample.jobTitle.length).toBeGreaterThan(1);
      expect(sample.seekUrl).toMatch(/\/job\//);
    }

    console.log(
      outcomes.map((o) => ({
        url: o.url,
        jobs: o.jobs.length,
        reported: o.reportedJobCount,
        pages: o.totalPages,
      }))
    );
  }, 300_000);
});
