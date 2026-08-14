#!/bin/bash
# GCP Compute Engine startup script: run the Seek scrape on boot.
# Attach in Console: VM instance → Edit → Automation → Startup script
# (or --metadata-from-file startup-script=scripts/vm-startup.sh)
set -euo pipefail

APP_USER="${APP_USER:-shiquan0327}"
APP_DIR="${APP_DIR:-/home/${APP_USER}/VM_Seek_Job_A_List-}"
LOG_DIR="${APP_DIR}/output"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
LOG_FILE="${LOG_DIR}/startup-scrape-${STAMP}.log"

mkdir -p "${LOG_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${LOG_DIR}" || true

{
  echo "=== Seek scrape start ${STAMP} ==="
  echo "cwd=${APP_DIR} user=${APP_USER}"
  cd "${APP_DIR}"
  sudo -u "${APP_USER}" -H bash -lc 'cd "'"${APP_DIR}"'" && npm run scrape'
  echo "=== Seek scrape done $(date -u +%Y-%m-%dT%H%M%SZ) ==="
} >> "${LOG_FILE}" 2>&1
