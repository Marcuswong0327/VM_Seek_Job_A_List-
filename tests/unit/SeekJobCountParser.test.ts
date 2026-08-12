import { describe, expect, it } from 'vitest';
import { parseJobCountFromText } from '../../src/parsing/SeekJobCountParser.js';

describe('parseJobCountFromText', () => {
  it('parses a plain job count', () => {
    expect(parseJobCountFromText('24 jobs')).toBe(24);
  });

  it('parses counts with commas', () => {
    expect(parseJobCountFromText('1,234 jobs')).toBe(1234);
  });

  it('parses plus-suffixed counts as the numeric floor', () => {
    expect(parseJobCountFromText('500+ jobs')).toBe(500);
  });

  it('returns null when no job count is present', () => {
    expect(parseJobCountFromText('No results found')).toBeNull();
  });
});
