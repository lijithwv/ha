#!/bin/sh
set -eu

# Only encoded JSON may cross the shell command boundary.
case "${1-}" in
  ''|*[!A-Za-z0-9+/=]*) exit 2 ;;
esac

archive_dir=/config/frigate_ai
mkdir -p "$archive_dir"
umask 077
printf '%s' "$1" | base64 -d >> "$archive_dir/activity.jsonl"
