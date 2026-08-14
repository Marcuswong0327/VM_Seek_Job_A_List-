import { describe, expect, it } from 'vitest';
import {
  CARD_LOAD_TIMEOUT_MS,
  MAX_CONSECUTIVE_PAGE_FAILURES,
  decideNextPageAction,
} from '../../src/scraping/SeekPagination.js';

describe('CARD_LOAD_TIMEOUT_MS', () => {
  it('caps waiting for job cards at 30 seconds', () => {
    expect(CARD_LOAD_TIMEOUT_MS).toBe(30_000);
  });
});

describe('decideNextPageAction', () => {
  it('continues after a timed-out page so later pages can still be scraped', () => {
    expect(
      decideNextPageAction({
        pageCount: 2,
        maxPages: 10,
        addedOnPage: 0,
        cardsPresent: false,
        pageFailed: true,
        consecutiveFailures: 1,
        maxConsecutiveFailures: MAX_CONSECUTIVE_PAGE_FAILURES,
      })
    ).toBe('continue');
  });

  it('stops the listing after too many consecutive page failures, not the whole job run', () => {
    expect(
      decideNextPageAction({
        pageCount: 3,
        maxPages: 10,
        addedOnPage: 0,
        cardsPresent: false,
        pageFailed: true,
        consecutiveFailures: 2,
        maxConsecutiveFailures: MAX_CONSECUTIVE_PAGE_FAILURES,
      })
    ).toBe('stop');
  });

  it('continues when cards loaded but were all duplicates of earlier pages', () => {
    expect(
      decideNextPageAction({
        pageCount: 3,
        maxPages: 10,
        addedOnPage: 0,
        cardsPresent: true,
        pageFailed: false,
        consecutiveFailures: 0,
        maxConsecutiveFailures: MAX_CONSECUTIVE_PAGE_FAILURES,
      })
    ).toBe('continue');
  });

  it('stops when a page loaded with no job cards', () => {
    expect(
      decideNextPageAction({
        pageCount: 4,
        maxPages: 10,
        addedOnPage: 0,
        cardsPresent: false,
        pageFailed: false,
        consecutiveFailures: 0,
        maxConsecutiveFailures: MAX_CONSECUTIVE_PAGE_FAILURES,
      })
    ).toBe('stop');
  });
});
