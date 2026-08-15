#!/bin/bash
# GCP Compute Engine startup script: scrape once on boot, then stop the VM
# so vCPU/RAM billing ends instead of sitting idle until a 9am schedule stop.
#
# Paste into Console: VM → Edit → Automation → Startup script
# Skip auto-stop (debug): create ${APP_DIR}/.keep-vm-running
set -uo pipefail

APP_USER="${APP_USER:-shiquan0327}"
APP_DIR="${APP_DIR:-/home/${APP_USER}/VM_Seek_Job_A_List-}"
LOG_DIR="${APP_DIR}/output"
STAMP="$(date -u +%Y-%m-%dT%H%M%SZ)"
LOG_FILE="${LOG_DIR}/startup-scrape-${STAMP}.log"
KEEP_FILE="${APP_DIR}/.keep-vm-running"

mkdir -p "${LOG_DIR}"
chown -R "${APP_USER}:${APP_USER}" "${LOG_DIR}" || true

{
  echo "=== Seek scrape start ${STAMP} ==="
  echo "cwd=${APP_DIR} user=${APP_USER}"
  cd "${APP_DIR}"
  sudo -u "${APP_USER}" -H bash -lc 'cd "'"${APP_DIR}"'" && npm run scrape'
  echo "=== Seek scrape done $(date -u +%Y-%m-%dT%H%M%SZ) exit=$? ==="
} >> "${LOG_FILE}" 2>&1

if [[ -f "${KEEP_FILE}" ]]; then
  echo "=== skip shutdown (${KEEP_FILE} exists) ===" >> "${LOG_FILE}"
  exit 0
fi

echo "=== shutting down VM ===" >> "${LOG_FILE}"
/sbin/shutdown -h now
