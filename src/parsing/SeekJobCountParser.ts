/**
 * Parse Seek listing total text such as "24 jobs" or "500+ jobs".
 * SRP: text → count only; no DOM or HTTP.
 */
export function parseJobCountFromText(text: string | null | undefined): number | null {
  if (!text) return null;
  const t = String(text).replace(/\u00a0/g, ' ').trim();

  const plusMatch = t.match(/\b([\d,]+)\+\s*jobs?\b/i);
  if (plusMatch) {
    return parseInt(plusMatch[1].replace(/,/g, ''), 10);
  }

  const match = t.match(/\b([\d,]+)\s*jobs?\b/i);
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }

  return null;
}
