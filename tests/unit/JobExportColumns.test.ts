import { describe, expect, it } from 'vitest';
import { JOB_EXPORT_HEADERS, toJobExportRow } from '../../src/export/JobExportColumns.js';
import type { JobListing } from '../../src/domain/JobListing.js';

describe('JOB_EXPORT_HEADERS', () => {
  it('matches the consultant workbook column list', () => {
    expect(JOB_EXPORT_HEADERS).toEqual([
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
      'AB Fill Status',
      'State',
      'Company Name',
      'Category',
      'Product',
      'Trading Status',
      'Client Title',
      'First Name',
      'Email',
      'History',
      'History 2.0',
      'History 3.0',
      'History 4.0',
    ]);
  });
});

describe('toJobExportRow', () => {
  it('fills scrape fields and leaves mapping columns blank', () => {
    const job: JobListing = {
      state: 'Melbourne (VIC)',
      suburbs: 'Dandenong',
      jobTitle: 'Plant Mechanic',
      company: 'William Adams Pty Ltd',
      salary: '$90k',
      postedDate: '8 Aug 2026',
      seekUrl: 'https://www.au.seek.com/job/1',
      contactEmail: 'hr@example.com',
      permanentUrl: 'https://storage.googleapis.com/bucket/1.html',
    };

    expect(toJobExportRow(job)).toEqual([
      'Melbourne (VIC)',
      'Dandenong',
      'Plant Mechanic',
      '',
      'William Adams Pty Ltd',
      '$90k',
      '8 Aug 2026',
      'hr@example.com',
      'https://www.au.seek.com/job/1',
      'https://storage.googleapis.com/bucket/1.html',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  });
});
