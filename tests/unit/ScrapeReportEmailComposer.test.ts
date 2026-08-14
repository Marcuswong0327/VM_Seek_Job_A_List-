import { describe, expect, it } from 'vitest';
import type { ListingRunOutcome } from '../../src/scraping/SequentialListingOrchestrator.js';
import { ScrapeReportEmailComposer } from '../../src/email/ScrapeReportEmailComposer.js';

describe('ScrapeReportEmailComposer', () => {
  it('composes a report email with recipients, summary html, and excel attachment', () => {
    const outcomes: ListingRunOutcome[] = [
      {
        url: 'https://au.seek.com/big-jobs',
        jobs: [{
          state: '',
          suburbs: '',
          jobTitle: 'A',
          company: 'C',
          salary: '',
          postedDate: '',
          seekUrl: 'https://au.seek.com/job/1',
        }],
        totalPages: 10,
        reportedJobCount: 520,
      },
      {
        url: 'https://au.seek.com/fail-jobs',
        jobs: [],
        totalPages: 0,
        reportedJobCount: null,
        error: 'timeout',
      },
    ];

    const attachment = {
      filename: 'seek-job-listings-2026-08-12.xlsx',
      content: Buffer.from('fake-xlsx'),
    };

    const message = new ScrapeReportEmailComposer().compose({
      from: 'Seek Jobs <jobs@example.com>',
      to: ['a@consult.co', 'b@consult.co'],
      outcomes,
      attachment,
      generatedAt: new Date('2026-08-12T00:00:00Z'),
    });

    expect(message.from).toBe('Seek Jobs <jobs@example.com>');
    expect(message.to).toEqual(['a@consult.co', 'b@consult.co']);
    expect(message.subject).toContain('New jobs coming');
    expect(message.html).toContain('1 job');
    expect(message.html).toContain('fail-jobs');
    expect(message.html).toContain('timeout');
    expect(message.attachments[0].filename).toBe('seek-job-listings-2026-08-12.xlsx');
  });

  it('reports skipped page errors without treating the listing as fully failed', () => {
    const outcomes: ListingRunOutcome[] = [
      {
        url: 'https://au.seek.com/hakka-jobs',
        jobs: [{
          state: '',
          suburbs: '',
          jobTitle: 'Chef',
          company: 'Hakka',
          salary: '',
          postedDate: '',
          seekUrl: 'https://au.seek.com/job/1',
        }],
        totalPages: 4,
        reportedJobCount: 90,
        pageErrors: [{ page: 3, error: 'Job cards did not appear within 30000ms' }],
      },
    ];

    const message = new ScrapeReportEmailComposer().compose({
      from: 'Seek Jobs <jobs@example.com>',
      to: ['a@consult.co'],
      outcomes,
      attachment: { filename: 'report.xlsx', content: Buffer.from('x') },
      generatedAt: new Date('2026-08-12T00:00:00Z'),
    });

    expect(message.html).toContain('page 3');
    expect(message.html).toContain('Job cards did not appear');
    expect(message.subject).toContain('New jobs coming');
  });
});
