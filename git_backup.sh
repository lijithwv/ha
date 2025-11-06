#!/bin/bash

# Navigate to HA config folder
cd /config

git add .
git commit -m "Auto backup $(date '+%Y-%m-%d %H:%M:%S')"
git push origin main 2>&1 | tee /config/git_push.log
