# VM_Seek_Job_A_List

Bi-weekly GCP VM job to scrape Seek employer listing pages, export Excel, and email consultants via Resend.

## Local scrape (no under-30 / 30+ split)

Chrome-extension logic split short vs long listings. On the VM we scrape **every listing URL the same way, sequentially** — 500 jobs then 30 jobs still means finish the first, then the second.

### SOLID layout

| Piece | Role |
|---|---|
| `IListingScraper` | Port — scrape one listing URL |
| `PlaywrightListingScraper` | Adapter — Playwright + pagination |
| `SequentialListingOrchestrator` | Use-case — URLs in order, continue on error |
| `SeekJobCardParser` / count / location parsers | Pure parsing (unit-tested) |
| `CsvJobExporter` / `ExcelJobWorkbookBuilder` | Per-listing CSV + combined `.xlsx` |
| `IEmailSender` / `ResendEmailSender` | Port + Resend adapter |
| `PostScrapeNotifier` | After scrape: attach Excel and email recipients |

### Commands

```bash
npm install
npx playwright install chromium
cp .env.example .env   # then fill Resend key, from, and EMAIL_TO
npm test                          # unit tests (TDD)
npm run test:integration          # live Seek (set SEEK_LIVE=0 to skip)
npm run scrape                    # default sample URLs + email if .env is set
npm run scrape -- --no-email --max-pages 3
npm run scrape -- --headed --max-pages 3
npm run scrape -- https://au.seek.com/William-Adams-Pty-Ltd-jobs https://au.seek.com/hakka-jobs
```

Files land in `output/` (per-listing CSV + combined `seek-job-listings-YYYY-MM-DD.xlsx`).

### Email (Resend)

Set these in `.env` (or the VM environment):

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | API key from https://resend.com/api-keys |
| `RESEND_FROM` | Verified sender, e.g. `Seek Jobs <jobs@your-domain.com>` |
| `EMAIL_TO` | Comma-separated consultant inboxes |

`--no-email` scrapes and writes Excel without calling Resend.

Resend test mode can use `onboarding@resend.dev` as `RESEND_FROM` and only deliver to your own account email until a domain is verified.

### Sample URLs

- https://au.seek.com/William-Adams-Pty-Ltd-jobs
- https://au.seek.com/hakka-jobs
