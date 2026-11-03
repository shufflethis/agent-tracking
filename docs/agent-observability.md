# Agent observability

The fleet workspace distinguishes execution state from task outcomes. A session
ending, or a command returning zero, does not establish that a user's task was
correctly completed. Historical `ok` records are displayed as completed; their
outcomes remain unchecked.

## Upgrade

Deploy the server before upgrading clients. Database migration 20 adds nullable
correlation and check metadata without rewriting existing results. CLI 0.2.0 adds
failure, turn-start, waiting and subagent-start hooks. After installing that CLI,
run `npx --yes https://agenttracking.co/downloads/agenttracking-0.2.0.tgz connect claude` again, then start a new Claude Code session.
The versioned package is hosted on agenttracking.co; it is not published on npm.
For a persistent installation use `npm install -g https://agenttracking.co/downloads/agenttracking-0.2.0.tgz`.
The command preserves other hooks and backs up the settings file. Older clients
continue to work but do not provide call correlation or the additional hooks.
Use a Claude Code version supporting the documented hook events.

## What a session shows

Click a start time in `/app/fleet/<agent>` for the paginated timeline. Tool start
and completion share a locally HMAC-hashed call ID, scoped to the session. Only
matched calls with nonnegative elapsed time get a duration. Subagent start/end
share a hashed child ID inside their parent session; this is not a full trace of
the child's internal tool execution. No prompts, error messages, arguments,
responses or transcript paths are added by these hooks.

`PostToolUseFailure` closes a call with an unsuccessful result. `StopFailure`
marks execution failed; a subsequent turn can recover. A completed session with
tool failures is labeled accordingly, including in the morning briefing.
Only explicit input/permission notifications imply waiting. Generic notifications
are insufficient evidence. Timeout-based stuck detection is labeled as suspected;
closure after inactivity is labeled separately from an observed session end.

Timelines retain events for 30 days, while run summaries have their existing
retention. Missing IDs, expired events, disconnected collectors and unsupported
hooks limit coverage. No data-loss warning is not proof of complete coverage.
Queue overflow marks retained events with a data-loss warning and leaves a local
`telemetry-loss` diagnostic shown by `agenttracking status`. Permanent server
refusals also leave that local diagnostic. Partial agent-limit receipts keep the
batch for retry; the server deduplicates accepted events. Entirely discarded runs
cannot be reconstructed. Source warnings do not identify every missing event.

## Repeatable task checks

Use synthetic fixtures and an assertion script that exits zero only when the
expected task result is present. A task runner merely finishing is insufficient.
Keep the fixture set and conditions identical between versions.

```sh
agenttracking wrap --name evaluation --check booking --version baseline -- ./check-booking.sh
# After changing the agent configuration, run the same fixture suite again:
agenttracking wrap --name evaluation --check booking --version candidate -- ./check-booking.sh
```

Both `--check` and `--version` are required together. Labels allow 1–64 letters,
numbers, underscores, periods, colons and hyphens. The command runs normally;
its actual exit code determines the reported check result. No stdout is collected.
Optional `--tail` retains its existing masked-stderr behavior.

The agent page compares sample counts, passes, mean duration and known data gaps
by check name/version over 90 days. Repeat enough trials for the task's variability;
one successful run is not evidence of improvement. Versions are caller-supplied
labels, not automatic fingerprints of a model or configuration. These are checks
reported by the connected machine, not independently verified business receipts.
A named check does not retroactively validate other sessions. Model cost, prompt
quality, network inspection, OpenTelemetry export and kernel policy enforcement
are not inferred from these events.

## Validation

Tests cover failure-hook redaction, parallel call pairing, out-of-order delivery,
repeated IDs, owner isolation, unchecked legacy runs, queue-loss markers, version
comparisons, command exit-code propagation, and upgrade of a populated v19 store.
