/** Pure pagination helpers for Seek listing URLs (SRP). */

export const CARD_LOAD_TIMEOUT_MS = 30_000;
export const MAX_CONSECUTIVE_PAGE_FAILURES = 2;

export function buildSeekListingPageUrl(listingUrl: string, page: number): string {
  const u = new URL(listingUrl);
  if (page <= 1) {
    u.searchParams.delete('page');
  } else {
    u.searchParams.set('page', String(page));
  }
  return u.toString().replace(/\/$/, '');
}

/** Decide whether to request page N+1 without depending on Seek's Next button DOM. */
export function shouldContinueToNextPage(input: {
  pageCount: number;
  maxPages: number;
  addedOnPage: number;
}): boolean {
  return (
    decideNextPageAction({
      pageCount: input.pageCount,
      maxPages: input.maxPages,
      addedOnPage: input.addedOnPage,
      cardsPresent: input.addedOnPage > 0,
      pageFailed: false,
      consecutiveFailures: 0,
      maxConsecutiveFailures: MAX_CONSECUTIVE_PAGE_FAILURES,
    }) === 'continue'
  );
}

export type NextPageAction = 'continue' | 'stop';

/**
 * Event-driven pagination: skip a failed page, keep going unless too many
 * consecutive failures or we hit a truly empty last page.
 */
export function decideNextPageAction(input: {
  pageCount: number;
  maxPages: number;
  addedOnPage: number;
  cardsPresent: boolean;
  pageFailed: boolean;
  consecutiveFailures: number;
  maxConsecutiveFailures: number;
}): NextPageAction {
  if (input.pageCount >= input.maxPages) return 'stop';
  if (input.pageFailed) {
    return input.consecutiveFailures >= input.maxConsecutiveFailures ? 'stop' : 'continue';
  }
  if (input.cardsPresent) return 'continue';
  return 'stop';
}
