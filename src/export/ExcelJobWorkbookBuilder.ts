import ExcelJS from 'exceljs';
import type { ListingRunOutcome } from '../scraping/SequentialListingOrchestrator.js';

export type ExcelWorkbookFile = {
  filename: string;
  buffer: Buffer;
};

export interface IWorkbookBuilder {
  build(outcomes: ListingRunOutcome[], generatedAt?: Date): Promise<ExcelWorkbookFile>;
}

const HEADERS = [
  'Listing URL',
  'State',
  'Suburbs',
  'Job Title',
  'Company',
  'Salary',
  'Posted Date',
  'Seek URL',
] as const;

/** SRP: scrape outcomes → one Excel workbook (All Jobs). */
export class ExcelJobWorkbookBuilder implements IWorkbookBuilder {
  async build(outcomes: ListingRunOutcome[], generatedAt = new Date()): Promise<ExcelWorkbookFile> {
    const wb = new ExcelJS.Workbook();
    wb.created = generatedAt;
    const sheet = wb.addWorksheet('All Jobs');
    sheet.addRow([...HEADERS]);
    sheet.getRow(1).font = { bold: true };

    for (const outcome of outcomes) {
      if (outcome.error) continue;
      for (const job of outcome.jobs) {
        sheet.addRow([
          outcome.url,
          job.state,
          job.suburbs,
          job.jobTitle,
          job.company,
          job.salary,
          job.postedDate,
          job.seekUrl,
        ]);
      }
    }

    sheet.columns.forEach((col) => {
      col.width = 24;
    });

    const stamp = generatedAt.toISOString().slice(0, 10);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return {
      filename: `seek-job-listings-${stamp}.xlsx`,
      buffer,
    };
  }
}
