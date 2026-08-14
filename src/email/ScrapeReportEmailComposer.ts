import type { EmailMessage } from '../ports/IEmailSender.js';
import type { ListingRunOutcome } from '../scraping/SequentialListingOrchestrator.js';

export type ComposeInput = {
  from: string;
  to: string[];
  outcomes: ListingRunOutcome[];
  attachment: { filename: string; content: Buffer };
  generatedAt?: Date;
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

/** SRP: scrape outcomes + xlsx → email message. No HTTP. */
export class ScrapeReportEmailComposer {
  compose(input: ComposeInput): EmailMessage {
    const ok = input.outcomes.filter((o) => !o.error);
    const failed = input.outcomes.filter((o) => o.error);
    const jobCount = ok.reduce((sum, o) => sum + o.jobs.length, 0);
    const dateLabel = (input.generatedAt ?? new Date()).toISOString().slice(0, 10);

    const okRows = ok
      .map(
        (o) =>
          `<li>${escapeHtml(o.url)} — ${plural(o.jobs.length, 'job')}` +
          (o.reportedJobCount != null ? ` (Seek reports ${o.reportedJobCount})` : '') +
          `</li>`
      )
      .join('');

    const failRows = failed
      .map((o) => `<li>${escapeHtml(o.url)} — ${escapeHtml(o.error || 'error')}</li>`)
      .join('');

    const pageBugRows = input.outcomes
      .flatMap((o) =>
        (o.pageErrors || []).map(
          (pe) =>
            `<li>${escapeHtml(o.url)} — page ${pe.page}: ${escapeHtml(pe.error)}</li>`
        )
      )
      .join('');

    const html = `
      <p>Seek scrape finished on ${dateLabel}.</p>
      <p><strong>${plural(ok.length, 'listing')}</strong> succeeded with <strong>${plural(jobCount, 'job')}</strong>.</p>
      <ul>${okRows}</ul>
      ${
        failed.length
          ? `<p><strong>${plural(failed.length, 'listing')} failed:</strong></p><ul>${failRows}</ul>`
          : ''
      }
      ${
        pageBugRows
          ? `<p><strong>Skipped pages (reported):</strong></p><ul>${pageBugRows}</ul>`
          : ''
      }
      <p>The Excel workbook is attached.</p>
    `.trim();

    return {
      from: input.from,
      to: input.to,
      subject: `New jobs coming! Bi-weekly job alerts`,
      html,
      attachments: [
        {
          filename: input.attachment.filename,
          content: input.attachment.content,
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
