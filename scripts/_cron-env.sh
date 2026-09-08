#!/usr/bin/env bash
# Shared by the tracking cron wrappers: the unit's EnvironmentFile, read the
# way systemd reads it. Sourcing it with `.` would make bash execute the
# second word of `MAIL_FROM_NAME=Agent Tracking`; everything after the first
# `=` is the value. Same loop as scripts/monitor-cron.sh.
if [ -f /root/agent-tracking/.env.production ]; then
  while IFS= read -r line; do
    case "$line" in ''|'#'*) continue ;; esac
    key=${line%%=*}
    [ "$key" = "$line" ] && continue
    case "$key" in *[!A-Za-z0-9_]*) continue ;; esac
    export "$key=${line#*=}"
  done < /root/agent-tracking/.env.production
fi
