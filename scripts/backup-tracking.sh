#!/usr/bin/env bash
# Daily encrypted copy of the tracking database, off this machine.
#
# This database holds account addresses and customer domains, so it leaves
# the box only encrypted: a consistent snapshot (VACUUM INTO), then
# AES-256-CBC with a key that lives in .env.production and nowhere in the
# repo. Without that key the file in the repo is noise; keep a copy of the
# key somewhere that is not this server.
#
# Restore:
#   openssl enc -d -aes-256-cbc -pbkdf2 -in tracking.sqlite.enc -out tracking.sqlite -pass env:TRACKING_BACKUP_KEY
#
# Env: TRACKING_BACKUP_KEY (required), TRACKING_BACKUP_REPO (a git checkout with a
# push remote), TRACKING_BACKUP_DIR (folder inside it), TRACKING_BACKUP_GIT_NAME/EMAIL.
#
# Crontab line:
#   35 5 * * * /bin/bash /root/agent-tracking/scripts/backup-tracking.sh
set -uo pipefail
cd /root/agent-tracking || exit 1
SRC=/root/agent-tracking/.data/tracking.sqlite
LOG=/root/agent-tracking/.data/backup-tracking.log
say() { echo "[$(date -Is)] $*" >> "$LOG"; }
. /root/agent-tracking/scripts/_cron-env.sh
DEST="${TRACKING_BACKUP_REPO:-/root/webmcp-corpus}"
SUB="${TRACKING_BACKUP_DIR:-agent-tracking}"
[ -f "$SRC" ] || { say "nothing to back up: $SRC missing"; exit 0; }
[ -n "${TRACKING_BACKUP_KEY:-}" ] || { say "ABORT: TRACKING_BACKUP_KEY is not set"; exit 1; }
[ -d "$DEST/.git" ] || { say "ABORT: $DEST is not a git checkout"; exit 1; }

SNAP=$(mktemp /tmp/tracking-snapshot.XXXXXX.sqlite)
rm -f "$SNAP"
if ! node --no-warnings -e '
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(process.argv[1], { readOnly: true });
  db.exec(`vacuum into ${JSON.stringify(process.argv[2]).replace(/"/g, "\x27")}`);
  db.close();
' "$SRC" "$SNAP" 2>>"$LOG"; then
  say "ABORT: snapshot failed"; rm -f "$SNAP"; exit 1
fi
mkdir -p "$DEST/$SUB"
if ! openssl enc -aes-256-cbc -pbkdf2 -salt -in "$SNAP" -out "$DEST/$SUB/tracking.sqlite.enc" -pass env:TRACKING_BACKUP_KEY 2>>"$LOG"; then
  say "ABORT: encryption failed"; rm -f "$SNAP"; exit 1
fi
size=$(stat -c %s "$SNAP"); rm -f "$SNAP"
cd "$DEST" || exit 1
git add "$SUB/tracking.sqlite.enc"
if git diff --cached --quiet; then say "no change ($size bytes)"; exit 0; fi
git -c "user.name=${TRACKING_BACKUP_GIT_NAME:-agent-tracking backup}" -c "user.email=${TRACKING_BACKUP_GIT_EMAIL:-backup@agent-tracking.com}" commit -q -m "Tracking database at $(date -I), encrypted ($size bytes plain)"
if git push -q origin HEAD:main 2>>"$LOG"; then say "pushed: $size bytes plain, encrypted"; else say "ABORT: push failed, the copy is local only"; exit 1; fi
