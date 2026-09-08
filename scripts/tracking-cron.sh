#!/usr/bin/env bash
# Nightly tracking maintenance: prune raw events, re-scan verified sites monthly, manifest alerts.
# Crontab line:
#   40 7 * * * /bin/bash /root/agent-tracking/scripts/tracking-cron.sh
set -uo pipefail
cd /root/agent-tracking || exit 1
LOG=/root/agent-tracking/.data/tracking-cron.log
LOCK=/root/agent-tracking/.data/tracking-cron.lock
mkdir -p /root/agent-tracking/.data
say() { echo "[$(date -Is)] $*" >> "$LOG"; }
exec 9>"$LOCK"
flock -n 9 || { say "skipped: a run is already in progress"; exit 0; }
. /root/agent-tracking/scripts/_cron-env.sh
say "start ($(git rev-parse --abbrev-ref HEAD) @ $(git rev-parse --short HEAD))"
npx tsx --no-warnings scripts/tracking-cron.ts >> "$LOG" 2>&1
say "done (exit $?)"
tail -n 20000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
