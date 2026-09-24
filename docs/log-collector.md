# Log source identity and collector

`POST /api/logs/{domain}` requires the account session or bearer API token. A reliable collector sends three headers together:

```text
X-Log-Source-Id: nginx-web-1
X-Log-Generation: file-2026-09-25-a
X-Log-Start-Record: 1200
```

Each line in the request body gets the ID `start + line index`. The same source, generation and ID can be retried safely. Equal text at different IDs counts as different requests, even when the timestamps match. Reusing one ID with different content is rejected. A new file after rotation needs a new generation. Time is never used as an ongoing deduplication key. Source identity, record receipts, counters, attempts, usage, burst rows and cursor changes commit in one SQLite transaction. A crash before commit leaves the whole batch ready for retry.

The bundled `scripts/log-import.ts` uses the resolved log path as source identity, device/inode/birth time as generation and byte offsets as record IDs. It reads the previous `.1` file before the new file after rotation. If the previous generation is gone, it reports a possible gap. If a file is truncated in place, it starts a new generation. A copied log that preserves neither generation nor record positions needs a deliberate new source/generation and a known cutover point.

The settings upload without headers is a **full, append-only snapshot mode**. It uses source `legacy-upload`, generation `append-only` and line numbers as IDs. Reuploading the same file or a longer file with the same prefix is safe. A rotated, reordered or truncated file cannot be used in this mode; the server rejects ID/content conflicts. Arbitrary overlapping chunks need the three headers. At the first import after upgrading an existing site, the previous maximum timestamp is used once to avoid recounting historical rows, while receipts for the snapshot are established. A late pre-upgrade line included in that first snapshot cannot be recovered; all later imports use positional identity and accept late lines.

For the local collector, a previous JSON cursor is read once when SQLite has no source state. If that cursor or its rotated file is unavailable, the collector stops instead of replaying a previously counted log. After the first new batch, SQLite holds the cursor. `LOG_IMPORT_STATE` is only used for this migration.

The log source takes priority for IP-verified crawler fetches while a source has imported records in the last 36 hours. A stale source lets browser observations appear again. This is a source preference, **not** cross-source request deduplication: browser beacons and server lines have no shared request ID, and upload gaps or partial source coverage remain possible. The source state and last import time must be considered before interpreting a zero.
