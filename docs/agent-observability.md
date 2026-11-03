# Agent observability

The fleet workspace distinguishes execution state from task outcomes. A session
ending, or a command returning zero, does not establish that a user's task was
correctly completed. Historical `ok` records are displayed as completed; their
outcomes remain unchecked.

## Upgrade

Deploy the server before upgrading clients. Database migration 20 adds nullable
correlation and check metadata without rewriting existing results. CLI 0.3.0 adds
failure, turn-start, waiting and subagent-start hooks. After installing that CLI,
run `npx --yes https://agenttracking.co/downloads/agenttracking-0.3.0.tgz connect claude` again, then start a new Claude Code session.
The versioned package is hosted on agenttracking.co; it is not published on npm.
For a persistent installation use `npm install -g https://agenttracking.co/downloads/agenttracking-0.3.0.tgz`.
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
A named check does not retroactively validate other sessions. Model cost, prompt quality and kernel policy enforcement are not inferred from these events.

## Validation

Tests cover failure-hook redaction, parallel call pairing, out-of-order delivery,
repeated IDs, owner isolation, unchecked legacy runs, queue-loss markers, version
comparisons, command exit-code propagation, and upgrade of a populated v19 store.


## Configuration snapshots (CLI 0.3.0)

SessionStart and ConfigChange hooks capture five fixed sources: user Claude settings,
project settings, local project settings, project `.mcp.json`, and project `CLAUDE.md`.
The collector reads at most 256 KiB per file, refuses final symlinks/nonregular files,
and never recursively scans memories or skill contents. Missing, unreadable and
oversized sources are explicit. File bytes are HMAC-hashed locally with the machine
secret. Only source categories, fingerprints, CLI/Node versions, and bounded counts
of configured MCP entries, enabled plugins and allow/ask/deny rules are sent.
Counts can include duplicates across files and do not describe effective permissions.
Managed configuration, inherited instruction files, runtime overrides and unloaded
skills are outside this snapshot's coverage. A changed fingerprint establishes a
configuration change, not that it caused a different task result.

`agenttracking snapshot` previews the sanitized result locally without sending it.
Run detail shows the newest snapshot in that run and compares it with the previous
captured run of the same agent; event metadata preserves intermediate snapshots for
30 days. Run snapshots have the existing 90-day run retention. Reconnect Claude
once after upgrading so the ConfigChange hook is installed.

## OpenTelemetry receiver

POST `/api/agents/otlp/v1/traces` with a revocable `atk_` agent token and
`Content-Type: application/json`. Supports uncompressed **OTLP/HTTP JSON traces**,
not Protobuf, gRPC, logs or metrics. Configure a compatible exporter with:

```sh
OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=https://agenttracking.co/api/agents/otlp/v1/traces
OTEL_EXPORTER_OTLP_TRACES_PROTOCOL=http/json
OTEL_EXPORTER_OTLP_TRACES_COMPRESSION=none
OTEL_BSP_MAX_EXPORT_BATCH_SIZE=100
OTEL_EXPORTER_OTLP_TRACES_HEADERS='Authorization=Bearer <AGENT_TOKEN>'
```

Some SDKs only support Protobuf: use a JSON-capable exporter or collector rather
than changing the Content-Type of binary data. Credentials stay server-side.
The endpoint accepts at most 100 spans / 512 KiB per request. Timestamps must be
nanosecond decimal strings, within seven days past / five minutes future; IDs are
nonzero hexadecimal trace/span IDs. Invalid spans produce OTLP partial-success
responses. Quota and rate limits return 429. Retries of accepted span IDs are
idempotent. Spans use the same 50,000-event account quota and expire after 30 days.

Retained attributes: `service.name`, `service.version`, `gen_ai.operation.name`
(known operation categories), `gen_ai.tool.name`, `gen_ai.request.model`, and
`gen_ai.usage.input_tokens` / `output_tokens`. IDs are hashed in the account scope.
Span names, status descriptions, events, links and all other attributes are dropped.
Sanitize at the exporter too: server-side filtering prevents storage, not transmission.
Metadata labels themselves must not contain secrets or personal data.

`/app/fleet/telemetry` shows traces across services; parent IDs connect spans.
A successful span does not establish a successful task. Missing parents, sampling,
late delivery, different machine clocks and retention limit trace completeness.
OTLP traces are a separate evidence source, not automatically matched to Claude hook
sessions. Use consistent trace context across instrumented services.

Run `node examples/otel/send-trace.mjs` after CLI login for an explicit synthetic
example. It sends two related spans using the configured machine's token and origin.

## Optional Linux eBPF collector

Requires Linux, bpftrace (tested with 0.20.2 on kernel 6.8), available syscall/scheduler
tracepoints, and sufficient kernel/BPF privileges. No extra daemon is installed.
Run under the account containing the CLI configuration, or set `AGENTTRACKING_HOME`
explicitly when using an appropriately privileged account.

```sh
agenttracking observe --pid 12345 --name linux-agent --seconds 60 --max-events 1000 --print-program
agenttracking observe --pid 12345 --name linux-agent --seconds 60 --max-events 1000
```

Replace the PID. The observer checks process identity at attachment, selects that
process plus newly observed descendants, and stops on target exit, timeout, event
limit or interruption. Maximum one hour / 10,000 events. Existing descendant
processes are not enumerated. Scheduler exec and `openat` / `connect` entry probes
emit only operation type and PID; the CLI HMAC-hashes PIDs per observation before
queueing/uploading. No filenames, destination addresses, arguments, payloads or
memory contents are read by the probes. Observations appear as a custom agent run.
File and connect events are attempts, not successful access or delivery. Other
syscalls, io_uring, inherited/open descriptors and incomplete process ancestry are
outside coverage. This is not a DLP, prompt-injection detector or enforcement engine.
Limit/loss/interruption flags indicate incomplete coverage. No warning is not proof
of complete observation. Source labels describe what the connected collector reports;
the server does not independently attest kernel origin.

`npm run build --prefix cli && node scripts/verify-ebpf.mjs` is an explicit privileged
integration check with synthetic processes, a loopback socket and local mock upload.
It verifies all three operation types, excludes an unselected process and checks
that no filenames, raw PIDs or addresses reach the mock receiver.
