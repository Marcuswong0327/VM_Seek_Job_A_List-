/** Pure pagination helpers for Seek listing URLs (SRP). */
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
  if (input.pageCount >= input.maxPages) return false;
  if (input.addedOnPage <= 0) return false;
  return true;
}
