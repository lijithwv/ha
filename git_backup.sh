#!/bin/bash
export PATH=$PATH:/usr/bin

# Navigate to HA config folder
cd /config || exit 1

# Full path to git
GIT_BIN=/usr/bin/git

# Stage changes
$GIT_BIN add .

# Commit only if there are staged changes
$GIT_BIN commit -m "Auto backup $(date '+%Y-%m-%d %H:%M:%S')"

# Push to remote
$GIT_BIN push origin main

