#!/usr/bin/env bash
# Server-log import for this site's own Agent Tracking: agent fetches and bursts.
# Crontab line:
#   */15 * * * * /bin/bash /root/agent-tracking/scripts/log-import.sh
set -uo pipefail
cd /root/agent-tracking || exit 1
LOG=/root/agent-tracking/.data/log-import.log
LOCK=/root/agent-tracking/.data/log-import.lock
mkdir -p /root/agent-tracking/.data
say() { echo "[$(date -Is)] $*" >> "$LOG"; }
exec 9>"$LOCK"
flock -n 9 || { say "skipped: a run is already in progress"; exit 0; }
. /root/agent-tracking/scripts/_cron-env.sh
npx tsx --no-warnings scripts/log-import.ts >> "$LOG" 2>&1 || say "FAILED (exit $?)"
tail -n 20000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
