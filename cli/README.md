# agenttracking (CLI)

Local circuit breaker, 100% offline MCP security audit, and zero-prompt operational monitoring for **Claude Code, Google Antigravity (`agy`), Cursor, OpenAI Codex CLI, Gemini CLI, cron jobs, and GitHub Actions** via [agenttracking.co](https://agenttracking.co).

- **Zero code or prompt capture**: only lifecycle events, hashed session/call IDs, exit codes, tool names, and SHA-256 config fingerprints leave your machine.
- **Zero runtime dependencies**: pure Node.js (`>=18`).
- **100% offline audit & auto-fix**: `agenttracking audit` and `agenttracking fix` detect and harden unpinned `npx` MCP servers, inline secrets, wildcard permissions, and missing loop fuses with automatic timestamped backups.
- **Local safety & spend fuse (`guard`)**: cap tool calls per autonomous turn, cap runtime per turn, stop consecutive failure loops, and block catastrophic shell commands (`rm -rf`, `git push --force`, `git reset --hard`, `DROP TABLE`) **100% locally** in `<2 ms`.

## Install & quick start

```sh
# Homebrew (macOS / Linux)
brew install shufflethis/tap/agenttracking

# Or SHA-256 verified installer
curl -fsSL https://agenttracking.co/install.sh | sh

# 100% offline audit & 1-command auto-fix (no account required)
agenttracking audit
agenttracking fix

# Connect hooks across all installed coding agents
agenttracking connect all

# Upgrade binary & refresh already-connected hook runtimes
agenttracking upgrade
```

Supported harnesses:
- `agenttracking connect claude [--project]`
- `agenttracking connect agy [--project]`
- `agenttracking connect cursor [--project]`
- `agenttracking connect codex`
- `agenttracking connect gemini [--project]`
- `agenttracking connect all`

## Local safety & spend circuit breaker

```sh
# Stop runaway overnight loops and block destructive commands locally:
agenttracking guard --max-failures 5 --max-calls 80 --max-minutes 45 --block-destructive on

# Inspect active rules, pause, resume, or disable:
agenttracking guard
agenttracking pause --reason "deploy freeze"
agenttracking resume
agenttracking guard --reset
```

## Cron jobs & GitHub Actions

```sh
# Linux/macOS crontab (alerts if exit != 0, stuck, or missed schedule):
0 7 * * * agenttracking wrap --name backup --every 24h --tail 20 -- /opt/backup.sh

# Headless CI / GitHub Actions agent job:
agenttracking login --token "$AGENTTRACKING_TOKEN" --host github-actions
agenttracking wrap --kind codex --name pr-review --tail 20 -- codex exec "review diff"
```

## Clean uninstall & restore

```sh
agenttracking disconnect all          # removes only our hooks; keeps yours intact
brew uninstall agenttracking          # or: rm -f ~/.local/bin/agenttracking
rm -rf ~/.agenttracking               # if you ran 'fix', restore *.bak-agenttracking-* first
```

Source: https://github.com/shufflethis/agent-tracking/tree/main/cli  
License: AGPL-3.0-only
