import { describe, expect, it, vi } from 'vitest';
import type { IEmailSender } from '../../src/ports/IEmailSender.js';
import type { ListingRunOutcome } from '../../src/scraping/SequentialListingOrchestrator.js';
import { PostScrapeNotifier } from '../../src/email/PostScrapeNotifier.js';

describe('PostScrapeNotifier', () => {
  it('exports excel then sends via IEmailSender', async () => {
    const send = vi.fn(async () => ({ id: 'email_1' }));
    const emailSender: IEmailSender = { send };

    const build = vi.fn(async () => ({
      filename: 'seek-job-listings-2026-08-12.xlsx',
      buffer: Buffer.from('PK'),
    }));

    const notifier = new PostScrapeNotifier({
      emailSender,
      from: 'Seek Jobs <jobs@example.com>',
      to: ['a@consult.co'],
      workbookBuilder: { build },
    });

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
        totalPages: 1,
        reportedJobCount: 1,
      },
    ];

    const result = await notifier.notify(outcomes, { outDir: 'output' });

    expect(build).toHaveBeenCalledWith(outcomes, expect.any(Date));
    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0];
    expect(message.to).toEqual(['a@consult.co']);
    expect(message.attachments[0].filename).toBe('seek-job-listings-2026-08-12.xlsx');
    expect(result.emailId).toBe('email_1');
    expect(result.excelPath).toMatch(/seek-job-listings-2026-08-12\.xlsx$/);
  });

  it('does not send when there are no successful jobs', async () => {
    const send = vi.fn(async () => ({ id: 'email_1' }));
    const notifier = new PostScrapeNotifier({
      emailSender: { send },
      from: 'Seek Jobs <jobs@example.com>',
      to: ['a@consult.co'],
      workbookBuilder: { build: vi.fn() },
    });

    const result = await notifier.notify(
      [{ url: 'https://au.seek.com/x-jobs', jobs: [], totalPages: 0, reportedJobCount: null, error: 'fail' }],
      { outDir: 'output' }
    );

    expect(send).not.toHaveBeenCalled();
    expect(result.skipped).toBe(true);
  });
});
