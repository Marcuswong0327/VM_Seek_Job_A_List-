import ExcelJS from 'exceljs';
import type { ListingRunOutcome } from '../scraping/SequentialListingOrchestrator.js';
import { JOB_EXPORT_HEADERS, toJobExportRow } from './JobExportColumns.js';

export type ExcelWorkbookFile = {
  filename: string;
  buffer: Buffer;
};

export interface IWorkbookBuilder {
  build(outcomes: ListingRunOutcome[], generatedAt?: Date): Promise<ExcelWorkbookFile>;
}

/** SRP: scrape outcomes → one Excel workbook (All Jobs). */
export class ExcelJobWorkbookBuilder implements IWorkbookBuilder {
  async build(outcomes: ListingRunOutcome[], generatedAt = new Date()): Promise<ExcelWorkbookFile> {
    const wb = new ExcelJS.Workbook();
    wb.created = generatedAt;
    const sheet = wb.addWorksheet('All Jobs');
    sheet.addRow([...JOB_EXPORT_HEADERS]);
    sheet.getRow(1).font = { bold: true };

    for (const outcome of outcomes) {
      if (outcome.error) continue;
      for (const job of outcome.jobs) {
        sheet.addRow(toJobExportRow(job));
      }
    }

    sheet.columns.forEach((col) => {
      col.width = 22;
    });

    const stamp = generatedAt.toISOString().slice(0, 10);
    const buffer = Buffer.from(await wb.xlsx.writeBuffer());
    return {
      filename: `seek-job-listings-${stamp}.xlsx`,
      buffer,
    };
  }
}
