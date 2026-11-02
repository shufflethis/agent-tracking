#!/usr/bin/env bash
# Agent monitoring every quarter hour: hung/missed status, alerts, morning briefings.
# Crontab line:
#   */15 * * * * /bin/bash /root/agent-tracking/scripts/agents-cron.sh
set -uo pipefail
cd /root/agent-tracking || exit 1
LOG=/root/agent-tracking/.data/agents-cron.log
LOCK=/root/agent-tracking/.data/agents-cron.lock
mkdir -p /root/agent-tracking/.data
say() { echo "[$(date -Is)] $*" >> "$LOG"; }
exec 9>"$LOCK"
flock -n 9 || { say "skipped: a run is already in progress"; exit 0; }
. /root/agent-tracking/scripts/_cron-env.sh
say "start ($(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD))"
npx tsx --no-warnings scripts/agents-cron.ts >> "$LOG" 2>&1
say "done (exit $?)"
tail -n 20000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
