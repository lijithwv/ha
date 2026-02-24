#!/bin/bash
set -eo pipefail

LOG_FILE="/config/git_backup.log"
echo "===== Git Backup started at $(date '+%Y-%m-%d %H:%M:%S') =====" | tee -a "$LOG_FILE"

# Navigate to HA config folder
cd /config

# Git commands
git add . 2>&1 | tee -a "$LOG_FILE"
git commit -m "Auto backup $(date '+%Y-%m-%d %H:%M:%S')" 2>&1 | tee -a "$LOG_FILE" || echo "Nothing to commit" | tee -a "$LOG_FILE"
git push origin main 2>&1 | tee -a "$LOG_FILE"

echo "===== Git Backup finished at $(date '+%Y-%m-%d %H:%M:%S') =====" | tee -a "$LOG_FILE"
