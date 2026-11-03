#!/usr/bin/env bash
# Daily encrypted copy of the tracking database, off this machine.
#
# This database holds account addresses and customer domains, so it leaves
# the box only encrypted: a consistent snapshot (VACUUM INTO), compressed with
# zstd, then AES-256-CBC with a key that lives in .env.production and nowhere in
# the repo. Without that key the file is noise; keep a copy of the key somewhere
# that is not this server.
#
# Where it goes: one GitHub release per day in a private repo (tag
# tracking-YYYY-MM-DD, one asset). Release assets are not part of the git
# history, so the repo does not grow by the size of the database every day the
# way the old committed tracking.sqlite.enc did (encrypted bytes never delta).
# Retention: the 7 newest days, plus the newest of each of the last 4 ISO weeks,
# plus the newest of each of the last 12 months. Old releases are only pruned
# after today's upload has been verified.
#
# Restore:
#   gh release download tracking-YYYY-MM-DD -R shufflethis/webmcp-corpus -D /tmp/restore
#   openssl enc -d -aes-256-cbc -pbkdf2 -in /tmp/restore/tracking-YYYY-MM-DD.sqlite.zst.enc \
#     -pass env:TRACKING_BACKUP_KEY | zstd -d -o tracking.sqlite
# Backups before 2026-11-04 are the committed agent-tracking/tracking.sqlite.enc
# in the git history of that repo (uncompressed, same openssl line without zstd).
#
# Env: TRACKING_BACKUP_KEY (required), TRACKING_BACKUP_GH_REPO (owner/name,
# default shufflethis/webmcp-corpus), TRACKING_BACKUP_DRY_PRUNE=1 (log what
# would be pruned, delete nothing).
#
# Crontab line:
#   35 5 * * * /bin/bash /root/agent-tracking/scripts/backup-tracking.sh
set -uo pipefail
cd /root/agent-tracking || exit 1
SRC=/root/agent-tracking/.data/tracking.sqlite
LOG=/root/agent-tracking/.data/backup-tracking.log
GH=/usr/bin/gh
say() { echo "[$(date -Is)] $*" >> "$LOG"; }
. /root/agent-tracking/scripts/_cron-env.sh
REPO="${TRACKING_BACKUP_GH_REPO:-shufflethis/webmcp-corpus}"
DAY=$(date +%F)
TAG="tracking-$DAY"
[ -f "$SRC" ] || { say "nothing to back up: $SRC missing"; exit 0; }
[ -n "${TRACKING_BACKUP_KEY:-}" ] || { say "ABORT: TRACKING_BACKUP_KEY is not set"; exit 1; }

umask 077
WORK=$(mktemp -d /tmp/tracking-backup.XXXXXX) || { say "ABORT: no temp dir"; exit 1; }
trap 'rm -rf "$WORK"' EXIT
SNAP="$WORK/snapshot.sqlite"
OUT="$WORK/$TAG.sqlite.zst.enc"

if ! node --no-warnings -e '
  const { DatabaseSync } = require("node:sqlite");
  const db = new DatabaseSync(process.argv[1], { readOnly: true });
  db.exec(`vacuum into ${JSON.stringify(process.argv[2]).replace(/"/g, "\x27")}`);
  db.close();
' "$SRC" "$SNAP" 2>>"$LOG"; then
  say "ABORT: snapshot failed"; exit 1
fi
plain=$(stat -c %s "$SNAP")
if ! zstd -q -10 -T2 -c "$SNAP" 2>>"$LOG" \
   | openssl enc -aes-256-cbc -pbkdf2 -salt -out "$OUT" -pass env:TRACKING_BACKUP_KEY 2>>"$LOG"; then
  say "ABORT: compression/encryption failed"; exit 1
fi
rm -f "$SNAP"
size=$(stat -c %s "$OUT")

# Round trip before anything leaves the box: a backup that does not decrypt is
# worse than none, because it hides that there is none.
if ! openssl enc -d -aes-256-cbc -pbkdf2 -in "$OUT" -pass env:TRACKING_BACKUP_KEY 2>>"$LOG" | zstd -q -t 2>>"$LOG"; then
  say "ABORT: round trip of $OUT failed"; exit 1
fi

notes="Encrypted tracking database ($plain bytes plain, $size bytes zstd+aes-256-cbc). Restore: see scripts/backup-tracking.sh in shufflethis/agent-tracking."
if "$GH" release view "$TAG" -R "$REPO" >/dev/null 2>&1; then
  "$GH" release upload "$TAG" "$OUT" -R "$REPO" --clobber 2>>"$LOG" || { say "ABORT: upload to existing $TAG failed, the copy is local only"; exit 1; }
else
  "$GH" release create "$TAG" "$OUT" -R "$REPO" --target main --latest=false \
    --title "Tracking backup $DAY" --notes "$notes" 2>>"$LOG" || { say "ABORT: release $TAG failed, the copy is local only"; exit 1; }
fi
remote=$("$GH" release view "$TAG" -R "$REPO" --json assets --jq ".assets[] | select(.name==\"$TAG.sqlite.zst.enc\") | .size" 2>>"$LOG")
if [ "$remote" != "$size" ]; then say "ABORT: $TAG asset is ${remote:-missing}, expected $size bytes; nothing pruned"; exit 1; fi
say "uploaded: $TAG ($plain bytes plain, $size bytes encrypted)"

# Retention. Tags are listed newest first by date in the name, not by release time.
tags=$("$GH" release list -R "$REPO" --limit 1000 --json tagName --jq '.[].tagName' 2>>"$LOG" \
  | grep -E '^tracking-[0-9]{4}-[0-9]{2}-[0-9]{2}$' | sort -r)
[ -n "$tags" ] || { say "prune skipped: could not list releases"; exit 0; }
declare -A keep=() week=() month=()
n=0
for t in $tags; do
  d=${t#tracking-}
  n=$((n+1)); [ "$n" -le 7 ] && keep[$t]=1
  w=$(date -d "$d" +%G-%V); m=${d:0:7}
  if [ -z "${week[$w]:-}" ]; then week[$w]=$t; fi
  if [ -z "${month[$m]:-}" ]; then month[$m]=$t; fi
done
for w in $(printf '%s\n' "${!week[@]}" | sort -r | head -4); do keep[${week[$w]}]=1; done
for m in $(printf '%s\n' "${!month[@]}" | sort -r | head -12); do keep[${month[$m]}]=1; done
for t in $tags; do
  [ -n "${keep[$t]:-}" ] && continue
  if [ "${TRACKING_BACKUP_DRY_PRUNE:-}" = 1 ]; then say "would prune: $t"; continue; fi
  if "$GH" release delete "$t" -R "$REPO" --cleanup-tag -y 2>>"$LOG"; then say "pruned: $t"; else say "prune failed: $t"; fi
done
exit 0
