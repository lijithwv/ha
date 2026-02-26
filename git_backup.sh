#!/bin/bash
set -eo pipefail

STATUS_FILE="/config/www/git_backup_status.json"
LOG_FILE="/config/git_backup.log"
exec >> "$LOG_FILE" 2>&1
NOW=$(date '+%Y-%m-%dT%H:%M:%S')

# --- Failure handler ---
handle_error() {
  EXIT_CODE=$?
  echo "Backup failed with exit code $EXIT_CODE"

printf '{"last_run":"%s","status":"failed","message":"Git command failed (exit %s)"}' \
  "$NOW" "$EXIT_CODE" > "$STATUS_FILE"

  exit $EXIT_CODE
}

trap 'echo "Error at line $LINENO in git_backup.sh file"; handle_error' ERR

echo "===== Git Backup started at $NOW ====="

# Navigate to HA config folder
cd /config

# Git commands
git add .

if git diff --cached --quiet; then
    echo "No changes."
    # Still mark run as successful
    printf '{"last_run":"%s","status":"success","message":"No changes"}' \
    "$NOW" > "$STATUS_FILE"
else
    git commit -m "Auto backup $NOW"
    git push origin main
    echo "Backup successful"
    printf '{"last_run":"%s","status":"success","message":"Committed and pushed"}' \
    "$NOW" > "$STATUS_FILE"
fi


echo "===== Git Backup finished at $(date '+%Y-%m-%d %H:%M:%S') ====="
