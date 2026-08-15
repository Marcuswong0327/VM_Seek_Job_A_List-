import { describe, expect, it } from 'vitest';
import type { ListingRunOutcome } from '../../src/scraping/SequentialListingOrchestrator.js';
import { ScrapeReportEmailComposer } from '../../src/email/ScrapeReportEmailComposer.js';

describe('ScrapeReportEmailComposer', () => {
  it('lists only Job Title and Company plus the excel attachment', () => {
    const outcomes: ListingRunOutcome[] = [
      {
        url: 'https://au.seek.com/big-jobs',
        jobs: [{
          state: 'Melbourne (VIC)',
          suburbs: 'Dandenong',
          jobTitle: 'Plant Mechanic',
          company: 'William Adams Pty Ltd',
          salary: '$90k',
          postedDate: '8 Aug 2026',
          seekUrl: 'https://au.seek.com/job/1',
        }],
        totalPages: 1,
        reportedJobCount: 1,
      },
      {
        url: 'https://au.seek.com/hakka-jobs',
        jobs: [{
          state: '',
          suburbs: '',
          jobTitle: 'Chef',
          company: 'Hakka Pty Ltd',
          salary: '',
          postedDate: '',
          seekUrl: 'https://au.seek.com/job/2',
        }],
        totalPages: 4,
        reportedJobCount: 90,
        pageErrors: [{ page: 3, error: 'Job cards did not appear within 30000ms' }],
      },
      {
        url: 'https://au.seek.com/fail-jobs',
        jobs: [],
        totalPages: 0,
        reportedJobCount: null,
        error: 'timeout',
      },
    ];

    const message = new ScrapeReportEmailComposer().compose({
      from: 'Seek Jobs <jobs@example.com>',
      to: ['a@consult.co'],
      outcomes,
      attachment: {
        filename: 'seek-job-listings-2026-08-12.xlsx',
        content: Buffer.from('fake-xlsx'),
      },
    });

    expect(message.subject).toContain('New jobs coming');
    expect(message.html).toContain('Plant Mechanic');
    expect(message.html).toContain('William Adams Pty Ltd');
    expect(message.html).toContain('Chef');
    expect(message.html).toContain('Hakka Pty Ltd');
    expect(message.html).not.toContain('fail-jobs');
    expect(message.html).not.toContain('timeout');
    expect(message.html).not.toContain('page 3');
    expect(message.html).not.toContain('Job cards did not appear');
    expect(message.html).not.toContain('https://au.seek.com/big-jobs');
    expect(message.attachments).toEqual([
      {
        filename: 'seek-job-listings-2026-08-12.xlsx',
        content: Buffer.from('fake-xlsx'),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    ]);
  });
});
