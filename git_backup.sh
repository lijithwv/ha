#!/bin/bash
set -eo pipefail

LOG_FILE="/config/git_backup.log"
exec >> "$LOG_FILE" 2>&1
echo "===== Git Backup started at $(date '+%Y-%m-%d %H:%M:%S') ====="

# Navigate to HA config folder
cd /config

# Git commands
git add .
git commit -m "Auto backup $(date '+%Y-%m-%d %H:%M:%S')" || echo "No changes."
git push origin main

echo "===== Git Backup finished at $(date '+%Y-%m-%d %H:%M:%S') ====="
