import type { JobListing } from '../domain/JobListing.js';

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** SRP: listing metadata → HTML snapshot stored in GCS. */
export function buildListingSnapshotHtml(job: JobListing): string {
  const title = escapeHtml(job.jobTitle || 'Job Listing');
  const company = escapeHtml(job.company || '');
  const state = escapeHtml(job.state || '');
  const suburbs = escapeHtml(job.suburbs || '');
  const salary = escapeHtml(job.salary || '');
  const postedDate = escapeHtml(job.postedDate || '');
  const contactEmail = escapeHtml(job.contactEmail || '');
  const originalUrl = escapeHtml(job.seekUrl || '');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body>
  <h1>${title}</h1>
  <ul>
    ${company ? `<li><strong>Company:</strong> ${company}</li>` : ''}
    ${state ? `<li><strong>State:</strong> ${state}</li>` : ''}
    ${suburbs ? `<li><strong>Suburbs:</strong> ${suburbs}</li>` : ''}
    ${salary ? `<li><strong>Salary:</strong> ${salary}</li>` : ''}
    ${postedDate ? `<li><strong>Posted:</strong> ${postedDate}</li>` : ''}
    ${contactEmail ? `<li><strong>Email:</strong> ${contactEmail}</li>` : ''}
    ${originalUrl ? `<li><strong>Original URL:</strong> <a href="${originalUrl}">${originalUrl}</a></li>` : ''}
  </ul>
  <p>No description captured.</p>
</body>
</html>`;
}

export function extractSeekJobId(raw: string | undefined): string {
  const text = String(raw || '').trim();
  const directMatch = text.match(/\/job\/(\d+)/i);
  if (directMatch?.[1]) return directMatch[1];
  if (/^\d+$/.test(text)) return text;
  const cleaned = text
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return cleaned || `job-${Date.now()}`;
}
