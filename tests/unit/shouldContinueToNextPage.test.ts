import { describe, expect, it } from 'vitest';
import { shouldContinueToNextPage } from '../../src/scraping/SeekPagination.js';

describe('shouldContinueToNextPage', () => {
  it('continues when the current page added jobs and max is not reached', () => {
    expect(shouldContinueToNextPage({ pageCount: 1, maxPages: 5, addedOnPage: 22 })).toBe(true);
  });

  it('stops when the current page added no jobs', () => {
    expect(shouldContinueToNextPage({ pageCount: 2, maxPages: 5, addedOnPage: 0 })).toBe(false);
  });

  it('stops when maxPages is reached', () => {
    expect(shouldContinueToNextPage({ pageCount: 5, maxPages: 5, addedOnPage: 20 })).toBe(false);
  });
});
