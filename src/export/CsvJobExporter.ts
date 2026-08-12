import type { JobListing } from '../domain/JobListing.js';
import type { IJobExporter } from '../ports/IListingScraper.js';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { JOB_EXPORT_HEADERS, toJobExportRow } from './JobExportColumns.js';

function escapeCsv(value: string): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

/** SRP: JobListing[] → CSV string / file. */
export class CsvJobExporter implements IJobExporter {
  exportToString(jobs: JobListing[]): Promise<string> {
    const lines = [
      JOB_EXPORT_HEADERS.join(','),
      ...jobs.map((job) => toJobExportRow(job).map(escapeCsv).join(',')),
    ];
    return Promise.resolve(`\uFEFF${lines.join('\n')}`);
  }

  async export(jobs: JobListing[], meta?: { sourceUrl?: string; outDir?: string }): Promise<string> {
    const csv = await this.exportToString(jobs);
    const outDir = meta?.outDir ?? path.resolve('output');
    await mkdir(outDir, { recursive: true });

    const stamp = new Date().toISOString().slice(0, 10);
    const slug = slugFromUrl(meta?.sourceUrl) || 'seek-listing';
    const filename = path.join(outDir, `job-search-${slug}-${stamp}.csv`);
    await writeFile(filename, csv, 'utf8');
    return filename;
  }
}

function slugFromUrl(url?: string): string {
  if (!url) return '';
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const slug = parts[0] || 'seek-listing';
    return slug.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  } catch {
    return 'seek-listing';
  }
}
