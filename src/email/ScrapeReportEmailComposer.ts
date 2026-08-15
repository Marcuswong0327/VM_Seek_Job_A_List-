import type { EmailMessage } from '../ports/IEmailSender.js';
import type { ListingRunOutcome } from '../scraping/SequentialListingOrchestrator.js';

export type ComposeInput = {
  from: string;
  to: string[];
  outcomes: ListingRunOutcome[];
  attachment: { filename: string; content: Buffer };
  generatedAt?: Date;
};

/** SRP: scrape outcomes + xlsx → email with Job Title, Company, and attachment only. */
export class ScrapeReportEmailComposer {
  compose(input: ComposeInput): EmailMessage {
    const rows = input.outcomes
      .filter((o) => !o.error)
      .flatMap((o) => o.jobs)
      .map(
        (job) =>
          `<tr><td>${escapeHtml(job.jobTitle || '')}</td><td>${escapeHtml(job.company || '')}</td></tr>`
      )
      .join('');

    const html = `
      <table>
        <thead><tr><th>Job Title</th><th>Company</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
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
