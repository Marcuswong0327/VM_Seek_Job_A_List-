import { describe, expect, it } from 'vitest';
import { classifyMissingCardsWait } from '../../src/scraping/SeekPagination.js';

describe('classifyMissingCardsWait', () => {
  it('treats a timeout after jobs were already scraped as the end of the listing', () => {
    expect(
      classifyMissingCardsWait({ pageCount: 5, jobsCollectedSoFar: 90 })
    ).toBe('end-of-listing');
  });

  it('treats a timeout on the first page with no jobs as a real page failure', () => {
    expect(
      classifyMissingCardsWait({ pageCount: 1, jobsCollectedSoFar: 0 })
    ).toBe('page-failure');
  });
});
