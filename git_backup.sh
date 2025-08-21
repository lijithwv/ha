#!/bin/bash

# Navigate to HA config folder
cd /config

# Full path to git
GIT_BIN=/usr/bin/git

# Stage changes
git add .

# Commit only if there are staged changes
git commit -m "Auto backup $(date '+%Y-%m-%d %H:%M:%S')"

# Push to remote
git push origin main 2>&1 | tee /config/git_push.log

