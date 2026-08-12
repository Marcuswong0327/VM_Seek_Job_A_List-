import { describe, expect, it } from 'vitest';
import { resolvePostedDate } from '../../src/parsing/SeekPostedDateParser.js';

describe('resolvePostedDate', () => {
  it('converts relative day ago text using a fixed now', () => {
    const now = new Date('2026-08-11T12:00:00Z');
    expect(resolvePostedDate('3d ago', now)).toBe('8 Aug 2026');
  });

  it('strips Seek expiry suffix after bullet', () => {
    const now = new Date('2026-08-11T12:00:00Z');
    expect(resolvePostedDate('27d ago • Expiring', now)).toBe('15 Jul 2026');
  });
});
