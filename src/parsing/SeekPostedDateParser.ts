function formatPostedCalendarDate(d: Date): string {
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function normalizeSeekPostedDateText(s: string): string {
  return s
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2022\u00b7]/g, ' • ')
    .replace(/\s*•\s*/g, ' • ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Relative Seek footer text → calendar date (en-GB). */
export function resolvePostedDate(postedString: string | null | undefined, now = new Date()): string {
  if (!postedString) return '';
  let norm = normalizeSeekPostedDateText(postedString);
  if (!norm) return '';

  // Seek often appends "• Expiring" after relative dates.
  norm = norm.split('•')[0].trim();

  const rel = norm.match(/^(?:Posted\s+)?(\d+)\+?\s*(d|h|mo)\s+ago$/i);
  if (rel) {
    const num = parseInt(rel[1], 10);
    const unit = rel[2].toLowerCase();
    const d = new Date(now.getTime());
    if (unit === 'd') d.setDate(d.getDate() - num);
    else if (unit === 'h') d.setHours(d.getHours() - num);
    else if (unit === 'mo') d.setMonth(d.getMonth() - num);
    return formatPostedCalendarDate(d);
  }

  return norm;
}
