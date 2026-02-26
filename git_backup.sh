#!/bin/bash
set -eo pipefail

STATUS_FILE="/config/www/git_backup_status.json"
LOG_FILE="/config/git_backup.log"
exec >> "$LOG_FILE" 2>&1
NOW=$(date '+%Y-%m-%dT%H:%M:%S')

echo "===== Git Backup started at $NOW ====="

# Navigate to HA config folder
cd /config

# Git commands
git add .

if git diff --cached --quiet; then
    echo "No changes."
    # Still mark run as successful
    printf '{"last_run":"%s","last_success":"%s","status":"success","message":"No changes"}' \
    "$NOW" "$NOW" > "$STATUS_FILE"
else
    git commit -m "Auto backup $NOW"
    git push origin main
    echo "Backup successful"
    printf '{"last_run":"%s","last_success":"%s","status":"success","message":"Committed and pushed"}' \
    "$NOW" "$NOW" > "$STATUS_FILE"
fi

echo "===== Git Backup finished at $(date '+%Y-%m-%d %H:%M:%S') ====="
