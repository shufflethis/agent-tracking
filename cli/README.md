# Agent Tracking CLI 0.3.0

Monitor Claude Code sessions and cron jobs using agenttracking.co.
Requires Node.js 22.13 or later.

```sh
npx --yes https://agenttracking.co/downloads/agenttracking-0.3.0.tgz connect claude
```

This versioned package is distributed directly by agenttracking.co, not via the
npm registry. See https://agenttracking.co/docs for connection instructions.

Only lifecycle metadata, hashed session/call/child IDs and tool status are sent.
No prompts, tool arguments or responses are collected by Claude hooks. Cron jobs
can opt into masked stderr with `--tail`.

`wrap --name evaluation --check booking --version v1 -- ./check-booking.sh`
reports a named check using the script's exit code. The script must assert its
expected result. Completed sessions without a check remain unchecked.

Source: https://github.com/shufflethis/agent-tracking/tree/main/cli
License: AGPL-3.0-only (included).


CLI 0.3.0 also captures configuration fingerprints and counts on SessionStart and
ConfigChange. Preview with `agenttracking snapshot`. Configuration contents,
commands, rules, secrets and full paths stay local. These are partial snapshots,
not a determination of effective permissions.

`agenttracking observe --pid <PID> --name linux-agent --seconds 60` optionally
uses bpftrace on Linux. It needs kernel/BPF privileges and observes only the selected
process and new descendants. It sends operation types and hashed process IDs,
never filenames, addresses or payloads. This module does not enforce policies.

OpenTelemetry traces can be sent to `/api/agents/otlp/v1/traces` using OTLP/HTTP
JSON and an agent token. Setup: https://agenttracking.co/app/fleet/telemetry
