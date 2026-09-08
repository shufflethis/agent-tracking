#!/usr/bin/env bash
# The weekly Agent Tracking digest, one mail per account with something to say.
# Crontab line:
#   50 7 * * 1 /bin/bash /root/agent-tracking/scripts/weekly-digest.sh
set -uo pipefail
cd /root/agent-tracking || exit 1
LOG=/root/agent-tracking/.data/weekly-digest.log
LOCK=/root/agent-tracking/.data/weekly-digest.lock
mkdir -p /root/agent-tracking/.data
say() { echo "[$(date -Is)] $*" >> "$LOG"; }
exec 9>"$LOCK"
flock -n 9 || { say "skipped: a run is already in progress"; exit 0; }
. /root/agent-tracking/scripts/_cron-env.sh
say "start ($(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD))"
npx tsx --no-warnings scripts/weekly-digest.ts >> "$LOG" 2>&1
say "done (exit $?)"
tail -n 20000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
