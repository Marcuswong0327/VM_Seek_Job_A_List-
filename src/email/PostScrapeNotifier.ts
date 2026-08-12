import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { IEmailSender } from '../ports/IEmailSender.js';
import type { ListingRunOutcome } from '../scraping/SequentialListingOrchestrator.js';
import type { IWorkbookBuilder } from '../export/ExcelJobWorkbookBuilder.js';
import { ScrapeReportEmailComposer } from './ScrapeReportEmailComposer.js';

export type NotifyResult = {
  emailId?: string;
  excelPath?: string;
  skipped?: boolean;
};

export type PostScrapeNotifierOptions = {
  emailSender: IEmailSender;
  from: string;
  to: string[];
  workbookBuilder: IWorkbookBuilder;
  composer?: ScrapeReportEmailComposer;
};

/** SRP: after scrape, write Excel and email it. */
export class PostScrapeNotifier {
  private readonly emailSender: IEmailSender;
  private readonly from: string;
  private readonly to: string[];
  private readonly workbookBuilder: IWorkbookBuilder;
  private readonly composer: ScrapeReportEmailComposer;

  constructor(options: PostScrapeNotifierOptions) {
    this.emailSender = options.emailSender;
    this.from = options.from;
    this.to = options.to;
    this.workbookBuilder = options.workbookBuilder;
    this.composer = options.composer ?? new ScrapeReportEmailComposer();
  }

  async notify(outcomes: ListingRunOutcome[], meta: { outDir: string }): Promise<NotifyResult> {
    const hasJobs = outcomes.some((o) => !o.error && o.jobs.length > 0);
    if (!hasJobs) {
      return { skipped: true };
    }

    const generatedAt = new Date();
    const workbook = await this.workbookBuilder.build(outcomes, generatedAt);
    await mkdir(meta.outDir, { recursive: true });
    const excelPath = path.join(meta.outDir, workbook.filename);
    await writeFile(excelPath, workbook.buffer);

    const message = this.composer.compose({
      from: this.from,
      to: this.to,
      outcomes,
      attachment: { filename: workbook.filename, content: workbook.buffer },
      generatedAt,
    });

    const sent = await this.emailSender.send(message);
    return { emailId: sent.id, excelPath };
  }
}
