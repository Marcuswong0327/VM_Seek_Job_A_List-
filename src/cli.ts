#!/usr/bin/env node
import 'dotenv/config';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseMailConfig } from './email/MailConfig.js';
import { PostScrapeNotifier } from './email/PostScrapeNotifier.js';
import { ResendEmailSender } from './email/ResendEmailSender.js';
import { CsvJobExporter } from './export/CsvJobExporter.js';
import { ExcelJobWorkbookBuilder } from './export/ExcelJobWorkbookBuilder.js';
import { PlaywrightListingScraper } from './scraping/PlaywrightListingScraper.js';
import { SequentialListingOrchestrator } from './scraping/SequentialListingOrchestrator.js';
import type { ListingRunOutcome } from './scraping/SequentialListingOrchestrator.js';
import { GcsPermanentUrlAttacher } from './storage/GcsPermanentUrlAttacher.js';
import type { IPermanentUrlAttacher } from './ports/IPermanentUrlAttacher.js';

const DEFAULT_URLS = [
  'https://au.seek.com/William-Adams-Pty-Ltd-jobs',
  'https://au.seek.com/hakka-jobs',
];

function parseArgs(argv: string[]) {
  const urls: string[] = [];
  let headless = true;
  let maxPages = 100;
  let outDir = path.resolve('output');
  let sendEmail = true;
  let attachGcs = true;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--headed') headless = false;
    else if (arg === '--no-email') sendEmail = false;
    else if (arg === '--no-gcs') attachGcs = false;
    else if (arg === '--max-pages') maxPages = Number(argv[++i] || 100);
    else if (arg === '--out') outDir = path.resolve(argv[++i] || 'output');
    else if (arg.startsWith('http')) urls.push(arg);
  }

  return { urls: urls.length ? urls : DEFAULT_URLS, headless, maxPages, outDir, sendEmail, attachGcs };
}

async function attachPermanentUrls(
  outcomes: ListingRunOutcome[],
  attacher: IPermanentUrlAttacher
): Promise<void> {
  for (const outcome of outcomes) {
    if (outcome.error || outcome.jobs.length === 0) continue;
    outcome.jobs = await attacher.attach(outcome.jobs);
  }
}

async function main() {
  const { urls, headless, maxPages, outDir, sendEmail, attachGcs } = parseArgs(process.argv.slice(2));
  console.log(`Sequential scrape of ${urls.length} listing URL(s)…`);
  urls.forEach((u, i) => console.log(`  ${i + 1}. ${u}`));

  const scraper = new PlaywrightListingScraper({ headless, maxPages });
  const orchestrator = new SequentialListingOrchestrator(scraper);
  const exporter = new CsvJobExporter();
  const workbookBuilder = new ExcelJobWorkbookBuilder();

  const outcomes = await orchestrator.run(urls);
  await mkdir(outDir, { recursive: true });

  if (attachGcs) {
    console.log('Uploading listing snapshots to GCS for Permanent URL…');
    await attachPermanentUrls(outcomes, new GcsPermanentUrlAttacher());
  } else {
    console.log('GCS skipped (--no-gcs). Permanent URL will be blank.');
  }

  const summary = [];
  for (const outcome of outcomes) {
    if (outcome.error) {
      console.error(`FAIL ${outcome.url}: ${outcome.error}`);
      summary.push({ url: outcome.url, ok: false, error: outcome.error, jobs: 0 });
      continue;
    }

    const file = await exporter.export(outcome.jobs, { sourceUrl: outcome.url, outDir });
    const pageErrs = outcome.pageErrors || [];
    if (pageErrs.length) {
      console.error(`PAGE ISSUES ${outcome.url}:`);
      for (const pe of pageErrs) {
        console.error(`  page ${pe.page}: ${pe.error}`);
      }
    }
    console.log(
      `OK   ${outcome.url} → ${outcome.jobs.length} jobs` +
        (outcome.reportedJobCount != null ? ` (Seek reports ${outcome.reportedJobCount})` : '') +
        ` across ${outcome.totalPages} page(s) → ${file}`
    );
    summary.push({
      url: outcome.url,
      ok: true,
      jobs: outcome.jobs.length,
      reportedJobCount: outcome.reportedJobCount,
      totalPages: outcome.totalPages,
      file,
      pageErrors: pageErrs,
    });
  }

  const workbook = await workbookBuilder.build(outcomes);
  const excelPath = path.join(outDir, workbook.filename);
  await writeFile(excelPath, workbook.buffer);
  console.log(`Excel: ${excelPath}`);

  const mail = parseMailConfig(process.env);
  if (!sendEmail) {
    console.log('Email skipped (--no-email).');
  } else if (!mail) {
    console.log('Email skipped (set RESEND_API_KEY, RESEND_FROM, EMAIL_TO).');
  } else {
    const notifier = new PostScrapeNotifier({
      emailSender: new ResendEmailSender({ apiKey: mail.apiKey }),
      from: mail.from,
      to: mail.to,
      workbookBuilder,
    });
    const result = await notifier.notify(outcomes, { outDir });
    if (result.skipped) {
      console.log('Email skipped (no jobs to attach).');
    } else {
      console.log(`Email sent to ${mail.to.join(', ')} (id ${result.emailId})`);
    }
  }

  const summaryPath = path.join(outDir, `scrape-summary-${new Date().toISOString().slice(0, 10)}.json`);
  await writeFile(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`Summary: ${summaryPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
