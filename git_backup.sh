#!/bin/bash

# Navigate to HA config folder
cd /config

# Full path to git
GIT_BIN=/usr/bin/git

# Stage changes
$GIT_BIN add .

# Commit only if there are staged changes
$GIT_BIN commit -m "Auto backup $(date '+%Y-%m-%d %H:%M:%S')"

# Push to remote
$GIT_BIN push origin main

