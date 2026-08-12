import { describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import type { ListingRunOutcome } from '../../src/scraping/SequentialListingOrchestrator.js';
import { ExcelJobWorkbookBuilder } from '../../src/export/ExcelJobWorkbookBuilder.js';

function job(title: string, company: string): ListingRunOutcome['jobs'][number] {
  return {
    state: 'Melbourne (VIC)',
    suburbs: 'Dandenong',
    jobTitle: title,
    company,
    salary: '$90k',
    postedDate: '8 Aug 2026',
    seekUrl: 'https://www.au.seek.com/job/1',
  };
}

describe('ExcelJobWorkbookBuilder', () => {
  it('builds an xlsx buffer with All Jobs rows from successful listings', async () => {
    const outcomes: ListingRunOutcome[] = [
      {
        url: 'https://au.seek.com/William-Adams-Pty-Ltd-jobs',
        jobs: [job('Plant Mechanic', 'William Adams Pty Ltd')],
        totalPages: 1,
        reportedJobCount: 1,
      },
      {
        url: 'https://au.seek.com/hakka-jobs',
        jobs: [job('Chef', 'Hakka')],
        totalPages: 2,
        reportedJobCount: 30,
      },
      {
        url: 'https://au.seek.com/fail-jobs',
        jobs: [],
        totalPages: 0,
        reportedJobCount: null,
        error: 'boom',
      },
    ];

    const workbookFile = await new ExcelJobWorkbookBuilder().build(outcomes, new Date('2026-08-12T00:00:00Z'));

    expect(workbookFile.filename).toBe('seek-job-listings-2026-08-12.xlsx');
    expect(workbookFile.buffer.subarray(0, 2).toString()).toBe('PK');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(workbookFile.buffer);
    const sheet = wb.getWorksheet('All Jobs');
    expect(sheet).toBeTruthy();
    expect(sheet!.getRow(1).values.slice(1, 11)).toEqual([
      'State',
      'Suburbs',
      'Job Title',
      'Role type',
      'Company',
      'Salary',
      'Posted Date',
      'Contact Email',
      'Seek URL',
      'Permanent URL',
    ]);
    expect(sheet!.rowCount).toBe(3);
    expect(sheet!.getRow(2).getCell(3).value).toBe('Plant Mechanic');
    expect(String(sheet!.getRow(2).getCell(4).value ?? '')).toBe('');
    expect(sheet!.getRow(3).getCell(3).value).toBe('Chef');
  });
});
