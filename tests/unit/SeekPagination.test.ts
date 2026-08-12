import { describe, expect, it } from 'vitest';
import { buildSeekListingPageUrl } from '../../src/scraping/SeekPagination.js';

describe('buildSeekListingPageUrl', () => {
  it('adds page query for page > 1', () => {
    expect(buildSeekListingPageUrl('https://au.seek.com/hakka-jobs', 2)).toBe(
      'https://au.seek.com/hakka-jobs?page=2'
    );
  });

  it('returns the base URL for page 1', () => {
    expect(buildSeekListingPageUrl('https://au.seek.com/hakka-jobs?page=3', 1)).toBe(
      'https://au.seek.com/hakka-jobs'
    );
  });

  it('replaces an existing page param', () => {
    expect(buildSeekListingPageUrl('https://au.seek.com/hakka-jobs?page=2&sortmode=ListedDate', 4)).toBe(
      'https://au.seek.com/hakka-jobs?page=4&sortmode=ListedDate'
    );
  });
});
