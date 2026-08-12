import { describe, expect, it } from 'vitest';
import { CsvJobExporter } from '../../src/export/CsvJobExporter.js';
import type { JobListing } from '../../src/domain/JobListing.js';

describe('CsvJobExporter', () => {
  it('writes a UTF-8 BOM CSV with expected headers and rows', async () => {
    const jobs: JobListing[] = [
      {
        state: 'Melbourne (VIC)',
        suburbs: 'Dandenong',
        jobTitle: 'Plant Mechanic',
        company: 'William Adams Pty Ltd',
        salary: '$90k',
        postedDate: '8 Aug 2026',
        seekUrl: 'https://www.au.seek.com/job/1',
      },
    ];

    const exporter = new CsvJobExporter();
    const csv = await exporter.exportToString(jobs);

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('State,Suburbs,Job Title,Company,Salary,Posted Date,Seek URL');
    expect(csv).toContain('Plant Mechanic');
    expect(csv).toContain('William Adams Pty Ltd');
  });
});
