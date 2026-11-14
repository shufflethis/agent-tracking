# agenttracking (CLI 0.5.0)

Operational monitoring and a local-only safety fuse for **Claude Code, Cursor, OpenAI Codex CLI, Gemini CLI, cron jobs and GitHub Actions** via [agenttracking.co](https://agenttracking.co).

- **Zero code or prompt capture**: only lifecycle events, hashed session/call IDs, exit codes and tool names leave your machine.
- **Zero runtime dependencies**: pure Node.js (`>=18`).
- **Local safety & spend fuse (`guard`)**: cap tool calls per autonomous turn, cap runtime per turn, stop consecutive failure loops, and block catastrophic shell commands (`rm -rf`, `git push --force`, `git reset --hard`, `DROP TABLE`) **100% locally** in `<1 ms` without sending commands or prompts over the network.

## Quick start

```sh
# Once published to npm:
npx agenttracking@latest connect all

# Or directly from the signed release tarball:
npx --yes https://agenttracking.co/downloads/agenttracking-0.5.0.tgz connect all
```

Supported harnesses:
- `agenttracking connect claude [--project]`
- `agenttracking connect cursor [--project]`
- `agenttracking connect codex`
- `agenttracking connect gemini [--project]`
- `agenttracking connect all`

## Local safety & spend circuit breaker

```sh
# Stop runaway overnight loops and block destructive commands locally:
agenttracking guard --max-failures 5 --max-calls 80 --max-minutes 45 --block-destructive on

# Pause and resume all connected agents on this machine:
agenttracking pause --reason "deploy freeze"
agenttracking resume
```

## Cron jobs & GitHub Actions

```sh
# Linux/macOS crontab (alerts if exit != 0, stuck, or missed schedule):
0 7 * * * agenttracking wrap --name backup --every 24h --tail 20 -- /opt/backup.sh

# Headless CI / GitHub Actions agent job:
agenttracking login --token "$AGENTTRACKING_TOKEN" --host github-actions
agenttracking wrap --kind codex --name pr-review --tail 20 -- codex exec "review diff"
```

## Machine diagnostics & OpenTelemetry

- `agenttracking doctor` inspects connection status, installed hooks, MCP server count and unwrapped cron jobs locally without network calls.
- `agenttracking snapshot` previews sanitized configuration fingerprints and rule counts.
- `agenttracking observe --pid <PID> --name worker --seconds 60` runs optional Linux eBPF syscall-kind observation (`bpftrace`).
- OTLP/HTTP traces: `POST https://agenttracking.co/api/agents/otlp/v1/traces` with `Authorization: Bearer atk_...`.

Source: https://github.com/shufflethis/agent-tracking/tree/main/cli
License: AGPL-3.0-only
