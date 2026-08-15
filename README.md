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
| `CsvJobExporter` / `ExcelJobWorkbookBuilder` | Per-listing CSV + combined `.xlsx` (consultant columns) |
| `GcsPermanentUrlAttacher` | Upload listing HTML snapshot → GCS Permanent URL |
| `IEmailSender` / `ResendEmailSender` | Port + Resend adapter |
| `PostScrapeNotifier` | After scrape: attach Excel and email recipients |

### Commands

```bash
npm install
npx playwright install chromium
cp .env.example .env   # then fill Resend key, from, and EMAIL_TO
npm test                          # unit tests (TDD)
npm run test:integration          # live Seek (set SEEK_LIVE=0 to skip)
npm run scrape                    # default sample URLs + GCS + email if .env is set
npm run scrape -- --no-email --no-gcs --max-pages 3
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

`--no-gcs` skips Google Cloud Storage upload; **Permanent URL** stays blank. By default each scraped job is POSTed to the existing Cloud Run uploader (`upload-seek-job-…run.app`), same as the Chrome extension.

Resend test mode can use `onboarding@resend.dev` as `RESEND_FROM` and only deliver to your own account email until a domain is verified.

### Sample URLs

- https://au.seek.com/William-Adams-Pty-Ltd-jobs
- https://au.seek.com/hakka-jobs

## GCP VM (test run)

Instance schedule only **starts/stops** the VM. It does not run the scraper until you SSH in (or add a startup script).

### 1. SSH from your PC

```bash
gcloud compute ssh YOUR_VM_NAME --zone=YOUR_ZONE --project=YOUR_PROJECT_ID
```

In Console: **Compute Engine → VM instances → SSH**.

### 2. Put the app on the VM

```bash
# Debian/Ubuntu
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs git
git clone YOUR_REPO_URL ~/VM_Seek_Job_A_List-
cd ~/VM_Seek_Job_A_List-
npm install
npx playwright install --with-deps chromium
```

If the repo is only on your laptop, copy it instead:

```bash
gcloud compute scp --recurse "C:\Users\ACER\Downloads\VM_Seek_Job_A_List-" YOUR_VM_NAME:~/VM_Seek_Job_A_List- --zone=YOUR_ZONE
```

Then SSH in and `npm install` + Playwright as above. Do **not** copy `node_modules` from Windows.

### 3. Credentials — file on the VM

Create **`~/VM_Seek_Job_A_List-/.env`** (same folder as `package.json`). This is the only place values need to live. Copy from `.env.example`:

```bash
nano ~/VM_Seek_Job_A_List-/.env
```

| Put this in `.env` | What it is |
|---|---|
| `RESEND_API_KEY` | Resend API key (`re_…`) |
| `RESEND_FROM` | Verified sender, e.g. `Seek Jobs <jobs@your-domain.com>` |
| `EMAIL_TO` | Consultant inboxes, comma-separated |
| `GCS_UPLOAD_ENDPOINT` | Cloud Run upload URL. **Optional** — if omitted, the app already uses `https://upload-seek-job-5658707854.asia-southeast1.run.app` |

Example:

```bash
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM=Seek Jobs A List <onboarding@resend.dev>
EMAIL_TO=marcus.wong@linktal.com.au
GCS_UPLOAD_ENDPOINT=https://upload-seek-job-5658707854.asia-southeast1.run.app
```

Do not commit `.env`. GCP instance metadata is not required for these app secrets.

The VM’s **service account** only matters if Cloud Run is locked to IAM (`allUsers` denied). Then the VM must be allowed to invoke that Cloud Run service. If the Chrome extension could call the URL with no extra auth, the VM can too.

### 4. Test on the VM

```bash
cd ~/VM_Seek_Job_A_List-
npm test
npm run scrape -- --max-pages 2 https://au.seek.com/William-Adams-Pty-Ltd-jobs https://au.seek.com/hakka-jobs
```

First test with `--no-email` if you only want to check scrape + GCS:

```bash
npm run scrape -- --no-email --max-pages 2
```

Excel lands in `~/VM_Seek_Job_A_List-/output/`. Check the VM can reach Resend and Cloud Run (egress / HTTPS allowed).

### 5. Auto-run scrape on start, then stop the VM

Paste the contents of `scripts/vm-startup.sh` into **VM → Edit → Automation → Startup script** (GCP stores a copy; re-paste after you change the file).

On boot it runs `npm run scrape` **once**, then `shutdown -h now`. The instance goes to **Terminated**. **vCPU/RAM billing stops**; the disk still has a small charge.

Recommended instance schedule: **start only** at 8:00 (no need for 8:00–9:00). Optional **stop at 9:00** is only a failsafe if scrape hangs.

```
8:00  schedule START
      boot → scrape (~5 min) → shutdown
8:05  VM stopped (not idle until 9:00)
```

To SSH and debug without auto-stop:

```bash
touch ~/VM_Seek_Job_A_List-/.keep-vm-running
```

Remove that file when you want boot-and-stop again.

Alternatively, on the VM: `crontab -e` with `0 8 * * 1,3 /usr/bin/npm run scrape` only works if the VM is **already running** at that time.


### Network: not your Wi‑Fi or hotspot

The VM uses **Google Cloud’s network** in `asia-southeast1-b` (Singapore). It does **not** use your home Wi‑Fi or phone hotspot. Your laptop can be offline; the VM still reaches Seek, GCS, and Resend through GCP egress.

Your Wi‑Fi is only used for `gcloud ssh` / `scp` from your PC.

