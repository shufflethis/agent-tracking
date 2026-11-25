import type { Guide } from "./guides";

/**
 * High-intent engineering guides targeting real 2026 search demand:
 * - claude code hooks (2,900/mo US)
 * - claude code cost / costs (5,400/mo US, KD 22-27) & guardrails ($14.71 CPC)
 * - mcp security / mcp server security (480 + 140/mo US, $43-$51 CPC)
 * - claude code monitoring / ai agent monitoring (390 + 140/mo, KD 3, $57 CPC)
 * - claude code cron / cron job monitoring (90 + 110/mo, $13.85 CPC)
 *
 * Every guide includes structured comparison tables, inline SVG diagrams,
 * bespoke visuals, copyable CLI configs, verified primary sources, and FAQPage schema.
 */

export const AGENT_GUIDES_EN: Guide[] = [
  {
    slug: "claude-code-hooks-guide-alerts-guardrails",
    category: "agents",
    question: "How do Claude Code hooks work for alerts, stuck sessions and guardrails?",
    title: "Claude Code hooks guide: Telegram & Slack alerts, stuck sessions and local guardrails",
    summary:
      "Claude Code exposes deterministic lifecycle hooks (PreToolUse, PostToolUse, PostToolUseFailure, Notification, Stop, SessionEnd) in ~/.claude/settings.json. Use PreToolUse to block destructive commands and infinite loops locally, and Notification plus silence tracking to get instant Telegram or Slack alerts when a session stalls or waits for approval.",
    heroImage: {
      src: "/img/agents/guard-architecture.jpg",
      alt: "Zero-prompt Claude Code hook pipeline with local PreToolUse circuit breaker and EU cloud alert routing",
      caption: "Deterministic hooks enforce local limits in under 2 ms before any tool executes, while sending sanitized run metadata only.",
    },
    sections: [
      {
        h: "Why hooks beat polling and log scraping",
        p: [
          "When you run Claude Code interactively at your desk, you see permission prompts and error loops immediately. The moment you run long refactors, multi-repo sessions, or overnight background tasks, standard exit codes stop working: an agent waiting on an interactive confirmation prompt has not exited, so nothing crashes and nothing alerts.",
          "Claude Code's native hook system solves this deterministically. Instead of hoping the model follows a system-prompt instruction, hooks run shell commands on fixed lifecycle transitions defined by Anthropic's [Claude Code hooks specification](https://docs.anthropic.com/en/docs/claude-code/hooks).",
        ],
        diagram: "hooks-flow",
      },
      {
        h: "Every Claude Code hook event compared",
        p: [
          "The most common mistake developers make is attaching alerts to the wrong event—especially using `Stop` to detect permission prompts, which creates constant false positives every time Claude finishes a normal turn. Match each failure mode to the exact lifecycle hook:",
        ],
        table: {
          headers: ["Hook event", "When it fires", "Can block tool?", "Best operational use"],
          rows: [
            ["PreToolUse", "Right before any tool executes", "Yes (exit 2 / JSON deny)", "Local circuit breaker: cap tool loops, block `rm -rf`, `git push --force`, or denied tools"],
            ["PostToolUse", "After a tool succeeds", "No", "Reset consecutive failure counter; record tool name & duration"],
            ["PostToolUseFailure", "After a tool returns an error", "No", "Increment failure streak; trigger runaway-loop alert at 5 consecutive errors"],
            ["Notification", "When Claude needs user attention", "No", "Instant Telegram / Slack / Discord ping for `permission_prompt` or `idle_prompt`"],
            ["Stop", "When Claude finishes responding", "Optional stop-gate", "Mark turn complete; run automated test gate before allowing idle"],
            ["SessionEnd", "When the session terminates", "No", "Close session timeline and feed the morning briefing"],
          ],
        },
        callout: {
          tag: "Silent-hang trap",
          text: "Even a perfect Notification hook cannot fire if the CLI freezes on a network retry or dead subprocess. Always pair hooks with a server-side silence threshold so a running session with zero events for 15–30 minutes is flagged as suspected stuck.",
        },
      },
      {
        h: "Three hook pitfalls that silently break alerts",
        p: [
          "1. **Hooks fail open by default:** If your custom notification script has a typo, missing binary in `$PATH`, or times out, Claude Code logs a non-blocking warning and keeps running. Never rely on bare `curl` scripts without spooling and retries.",
          "2. **Non-interactive shells lack your PATH:** Background hooks do not always load `~/.zshrc` or `nvm`. Use an absolute launcher path so hooks behave identically in interactive terminals, tmux, and cron.",
          "3. **Accidental prompt & secret leakage:** Piping raw hook `stdin` directly to a third-party webhook leaks tool arguments, file paths, and API keys. Always strip payloads locally and transmit only event type, tool name, outcome, and a locally salted session hash.",
        ],
      },
      {
        h: "One-command setup for Claude Code, Cursor, Codex, Gemini & Antigravity",
        p: [
          "Instead of hand-maintaining fragile JSON hooks across five different coding tools, `agenttracking` installs non-destructive, backup-protected hooks with a local offline circuit breaker and free Telegram, Slack, Discord, and webhook alerts (up to 5 agents free forever):",
        ],
        code: `# 1. Optional 100% offline audit first (no account, zero upload)
curl -fsSL https://agenttracking.co/install.sh | sh -s -- audit

# 2. Activate local loop & destructive shell fuse (<2 ms on-device)
agenttracking guard --max-failures 5 --max-calls 80 --max-minutes 45 --block-destructive on

# 3. Connect hooks (backs up ~/.claude/settings.json; keeps existing hooks)
agenttracking connect all

# Cleanly remove at any time:
agenttracking disconnect claude`,
        codeLang: "sh",
      },
      {
        h: "Inspect what leaves your machine",
        p: [
          "Run `agenttracking doctor` locally at any time to verify installed hooks without touching the network. You can also explore an [interactive live fleet demo](/demo/fleet) in your browser before installing anything.",
        ],
      },
    ],
    faq: [
      { q: "Does connecting Claude Code hooks overwrite my existing hooks?", a: "No. `agenttracking connect claude` merges only its own hook entries, creates a backup next to `~/.claude/settings.json`, and leaves all third-party or personal hooks untouched." },
      { q: "Are Telegram, Slack, and Discord alerts really free?", a: "Yes. Up to 5 agents, instant Telegram, Slack, Discord, generic webhooks, email alerts, and the daily morning briefing are all included on the Free plan with no credit card." },
      { q: "Why didn't my Stop hook alert me when Claude got stuck on a permission prompt?", a: "Because `Stop` fires when a turn completes normally, not when Claude pauses waiting for tool approval. Use `Notification` for waiting states and a silence-floor watchdog for frozen processes." },
      { q: "Can I use the local guardrails without creating an account?", a: "Yes. Both `agenttracking audit` and `agenttracking guard` run 100% offline on your machine with zero cloud connection required." },
    ],
    sources: [
      { label: "Anthropic — Claude Code Hooks Reference", url: "https://docs.anthropic.com/en/docs/claude-code/hooks" },
      { label: "Agent Tracking CLI source code (AGPL-3.0)", url: "https://github.com/shufflethis/agent-tracking/tree/main/cli/src" },
    ],
    related: ["stop-claude-code-runaway-costs-and-loops", "claude-code-monitoring-and-stuck-sessions", "mcp-server-security-audit-and-drift"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
  {
    slug: "stop-claude-code-runaway-costs-and-loops",
    category: "agents",
    question: "How do I stop Claude Code runaway costs and infinite retry loops?",
    title: "How to stop Claude Code runaway costs, overnight token burn and infinite tool loops",
    summary:
      "Unattended Claude Code sessions rarely blow up because of one huge prompt—they burn $50 to $180 overnight by repeating the same failing Bash, test, or build command across a growing 150k-token context window. A deterministic local PreToolUse circuit breaker stops consecutive failures, turn calls, and elapsed minutes in under 2 ms before the next expensive API call happens.",
    heroImage: {
      src: "/img/agents/cost-loop-breaker.jpg",
      alt: "Circuit breaker severing an escalating retry loop and returning token spend to a flat baseline",
      caption: "A local PreToolUse fuse cuts off failing retry loops after 5 consecutive errors instead of letting context size compound overnight.",
    },
    sections: [
      {
        h: "The math behind a $120 overnight Claude Code bill",
        p: [
          "Every time an autonomous coding agent retries a failing migration, flaky test, or missing environment variable, the conversation context grows larger. Even with prompt caching, each tool round-trip re-reads tens of thousands of tokens while generating fresh reasoning and edits.",
          "When a session enters a retry spiral—fixing error A, introducing error B, reverting to error A—40 to 120 turns can execute while you sleep. Worse, a soft instruction inside `CLAUDE.md` like “stop if tests fail 3 times” is probabilistic: the model frequently rationalizes “one more try” and keeps spending.",
        ],
        diagram: "cost-breaker",
      },
      {
        h: "Cost impact: unprotected loop vs. local circuit breaker",
        p: [
          "Illustrative comparison based on typical long-context agentic sessions (100k–160k input context + output tokens per retry cycle; exact API pricing varies by model tier and cache hit rate):",
        ],
        table: {
          headers: ["Scenario", "Tool calls before stop", "Typical duration", "Estimated API burn", "Outcome"],
          rows: [
            ["Unprotected overnight loop", "120–300+ calls", "2–6 hours", "$45 – $180+", "Broken branch, exhausted quota, wake up to surprise bill"],
            ["Prompt instruction only (“stop after 3 fails”)", "15–60 calls (unreliable)", "20–90 min", "$8 – $35", "Model often ignores rule when it thinks a fix is close"],
            ["Hard timeout only (`timeout 2h`)", "80–180 calls", "120 min", "$30 – $95", "Kills healthy slow builds OR still burns 2 full hours"],
            ["Local PreToolUse circuit breaker (`guard`)", "5 consecutive fails / 80 cap", "1–4 min on loop", "< $1.50 – $3.00", "Instant local block (<2 ms) + Telegram/Slack alert"],
          ],
        },
        callout: {
          tag: "Key insight",
          text: "Do not rely on billing alerts from your model provider—provider usage dashboards lag by minutes to hours. Only a synchronous local PreToolUse hook can intercept the 6th failing tool call before the API request is even sent.",
        },
      },
      {
        h: "Four deterministic guardrails every autonomous agent needs",
        p: [
          "1. **Consecutive failure cap (`--max-failures 5`):** Resets to zero on any successful tool call or new human prompt, so productive sessions run uninterrupted while broken retry loops halt immediately.",
          "2. **Per-turn tool call cap (`--max-calls 80`):** Prevents agents from endlessly grepping, rewriting, and churning through hundreds of tool calls in a single autonomous turn.",
          "3. **Wall-clock turn budget (`--max-minutes 45`):** Stops slow-motion stalls where a session dribbles one tool call every few minutes all night.",
          "4. **Destructive shell fuse (`--block-destructive on`):** Inspects shell commands locally before execution and blocks catastrophic patterns (`rm -rf /`, force pushes, database drops) without logging or uploading the command content.",
        ],
      },
      {
        h: "Configure the local circuit breaker in 20 seconds",
        p: [
          "Works identically across Claude Code, Cursor, Gemini CLI, and Antigravity, completely locally with zero cloud account required:",
        ],
        code: `# Install CLI (SHA-256 verified) & run local cost/safety audit
curl -fsSL https://agenttracking.co/install.sh | sh -s -- audit

# Enable local spend & safety circuit breaker
agenttracking guard \\
  --max-failures 5 \\
  --max-calls 80 \\
  --max-minutes 45 \\
  --block-destructive on

# Need an emergency stop right now on this machine?
agenttracking pause --reason "investigating loop"
agenttracking resume`,
        codeLang: "sh",
      },
      {
        h: "Combine local caps with instant mobile alerts",
        p: [
          "Stopping a loop locally saves your budget; getting notified lets you unblock the task in two minutes. Connect the machine with `agenttracking connect all` to receive instant Telegram, Slack, or Discord alerts on the Free plan, or try the [live interactive demo](/demo/fleet) to trigger a simulated 5× loop block right in your browser.",
        ],
      },
    ],
    faq: [
      { q: "Does `agenttracking guard` slow down normal Claude Code sessions?", a: "No. The local PreToolUse check reads a tiny local state file and returns in under 2 milliseconds with zero network calls." },
      { q: "Does the circuit breaker reset automatically when I reply to Claude?", a: "Yes. Starting a new prompt resets the turn call count, turn timer, and consecutive failure streak automatically." },
      { q: "Will `guard` stop a legitimate 20-minute build or refactor?", a: "Not if tool calls succeed. `--max-failures 5` only trips on consecutive failures, and you can tune `--max-calls` and `--max-minutes` to match your repository's normal workflow." },
      { q: "Does Agent Tracking read my API billing keys or prompts to cap cost?", a: "No. It caps runaway loops deterministically using local tool failure counts, call budgets, and elapsed turn time—zero prompts or API keys are ever read or uploaded." },
    ],
    sources: [
      { label: "Anthropic — Manage Claude Code Costs", url: "https://docs.anthropic.com/en/docs/claude-code/costs" },
      { label: "Anthropic — Claude Code Hooks & PreToolUse Blocking", url: "https://docs.anthropic.com/en/docs/claude-code/hooks" },
      { label: "Agent Tracking Local Guard Implementation (Open Source)", url: "https://github.com/shufflethis/agent-tracking/blob/main/cli/src/guard.ts" },
    ],
    related: ["claude-code-hooks-guide-alerts-guardrails", "monitor-claude-code-cron-and-headless-agents", "mcp-server-security-audit-and-drift"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
  {
    slug: "mcp-server-security-audit-and-drift",
    category: "agents",
    question: "How do I audit MCP server security and detect config drift across my team?",
    title: "MCP server security best practices: auditing shadow MCPs, unpinned npx & config drift",
    summary:
      "Model Context Protocol (MCP) servers give coding agents direct access to databases, GitHub, Stripe, and internal APIs. The highest real-world risks in engineering teams are unpinned npx packages, cleartext http:// endpoints, hardcoded JSON secrets, blanket Bash(*) permissions, and unnoticed config drift. A zero-prompt local audit catches these risks immediately without ever transmitting source code or credentials.",
    heroImage: {
      src: "/img/agents/mcp-security-drift.jpg",
      alt: "MCP server constellation highlighting an anomalous drifted server isolated by an inspection ring",
      caption: "Continuous SHA-256 config fingerprinting detects shadow MCP additions and permission changes without ever reading secret values.",
    },
    sections: [
      {
        h: "Why shadow MCP servers are the #1 blind spot for engineering leads",
        p: [
          "Across a 25-person engineering org in 2026, developers simultaneously run Claude Code, Cursor, Codex CLI, Gemini CLI, and Antigravity. Any engineer can paste a community MCP server snippet into `.mcp.json`, `~/.claude.json`, or `~/.cursor/mcp.json` in ten seconds.",
          "Traditional MDM, SIEM, and endpoint tools do not inspect coding-agent config files. Meanwhile, cloud LLM tracing platforms require uploading prompts and tool payloads—which most CISOs, GDPR officers, and European works councils immediately reject.",
        ],
        diagram: "mcp-drift",
      },
      {
        h: "MCP security risk matrix & concrete mitigations",
        p: [
          "Every item below maps to real operational vulnerabilities documented in the [Model Context Protocol security specification](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices) and OWASP's guidance for LLM/agentic tool integrations:",
        ],
        table: {
          headers: ["Risk category", "What it looks like in config", "Real-world impact", "How to detect & fix"],
          rows: [
            ["Unpinned `npx` supply-chain drift", "`\"command\": \"npx\", \"args\": [\"-y\", \"@org/mcp\"]`", "Upstream package update silently executes new code on next restart", "Flag unpinned npx via `agenttracking audit`; pin exact `@1.2.3` versions"],
            ["Cleartext remote `http://` MCP", "`\"url\": \"http://mcp.internal.example/sse\"`", "Auth headers and tool arguments exposed on network transit", "Enforce `https://` for all non-localhost endpoints"],
            ["Inline plaintext secrets in JSON", "`\"env\": { \"API_KEY\": \"sk_live_...\" }`", "Accidental commit of `.mcp.json` leaks production tokens", "Detect inline secret keys locally (never read values); use `${ENV_VAR}` or vault"],
            ["Blanket wildcard permissions", "`\"allow\": [\"Bash(*)\", \"Write(*)\"]` or bypass mode", "Tool poisoning or prompt injection gains unrestricted shell execution", "Tighten allowlists + enforce `agenttracking guard --block-destructive on`"],
            ["Silent MCP / `CLAUDE.md` drift", "New MCP server or first-time tool appears on a laptop", "Shadow AI integration or rug-pull tool definition goes unnoticed", "Monitor SHA-256 config fingerprints & first-time tool alerts across the fleet"],
          ],
        },
        callout: {
          tag: "Zero-Prompt Governance (EU / GDPR)",
          text: "Agent Tracking's audit and drift engine hashes configuration structures locally on the developer's machine. Secret values, prompts, and repository contents never leave the laptop—making security rollout straightforward even in strict GDPR / German Mittelstand environments.",
        },
      },
      {
        h: "Run an instant 100% offline MCP security scan",
        p: [
          "You can run a full MCP, permission, and guardrail audit on any macOS or Linux developer machine right now with zero account and zero network calls. Add `--json` to integrate into CI or internal security compliance scripts:",
        ],
        code: `# Run 100% offline MCP & agent safety audit (zero upload)
curl -fsSL https://agenttracking.co/install.sh | sh -s -- audit

# Machine-readable JSON output for security teams / CI
agenttracking audit --json

# Example findings caught locally:
# [HIGH]   No runaway-loop or spend circuit breaker configured
# [HIGH]   1 remote MCP server(s) use unencrypted http://
# [MED]    2 MCP server(s) run unpinned npx packages
# [MED]    1 MCP server config(s) contain inline plaintext secret env vars`,
        codeLang: "sh",
      },
      {
        h: "Continuous fleet drift alerts for teams",
        p: [
          "A one-time audit is a snapshot; real security requires drift detection. When machines are connected to Agent Tracking Pro or Team & Governance, every session sends a sanitized configuration fingerprint (MCP server count, plugin hash, `CLAUDE.md` hash, permission rule hash) and alerts Slack or Telegram whenever a machine adds an MCP server, modifies rules, or invokes a tool for the first time.",
          "Test the drift alert workflow in our [interactive live fleet demo](/demo/fleet) (click **billing-service** to inspect a real MCP drift event).",
        ],
      },
    ],
    faq: [
      { q: "Does `agenttracking audit` ever upload my `.mcp.json` or environment variables?", a: "Never. `agenttracking audit` executes 100% locally with zero outbound HTTP requests. Even when you later connect to the cloud dashboard, only SHA-256 hashes and integer counts are sent—never keys, values, or prompts." },
      { q: "Which agent MCP config files does `agenttracking audit` inspect?", a: "It checks `~/.claude/settings.json`, `~/.claude.json`, `./.mcp.json`, `~/.cursor/mcp.json`, `~/.gemini/settings.json`, and `~/.gemini/antigravity/mcp_config.json`." },
      { q: "Why are unpinned `npx -y` MCP servers dangerous?", a: "Without an explicit `@major.minor.patch` version, `npx -y` automatically fetches the latest registry tag. A compromised maintainer account or malicious release can execute arbitrary code with your developer credentials on the very next session." },
      { q: "How does Team & Governance work for 10–200 engineers?", a: "Team plans (starting at $99/month, invoice billing available) provide a shared fleet view across all developer machines, shadow-MCP & config-drift alerts, centralized guardrail baselines, EU hosting in Germany, and AGPL-3.0 self-hosting if required." },
      { q: "Can we run the audit in GitHub Actions or device compliance checks?", a: "Yes. Run `agenttracking audit --json` to get a structured 0–100 score, letter grade, and machine-readable finding array." },
    ],
    sources: [
      { label: "Model Context Protocol — Security Best Practices", url: "https://modelcontextprotocol.io/specification/draft/basic/security_best_practices" },
      { label: "OWASP Top 10 for LLM & Generative AI Applications", url: "https://genai.owasp.org/" },
      { label: "Agent Tracking Offline Audit Source Code (AGPL-3.0)", url: "https://github.com/shufflethis/agent-tracking/blob/main/cli/src/audit.ts" },
    ],
    related: ["claude-code-hooks-guide-alerts-guardrails", "stop-claude-code-runaway-costs-and-loops", "claude-code-monitoring-and-stuck-sessions"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
  {
    slug: "claude-code-monitoring-and-stuck-sessions",
    category: "agents",
    question: "How do I monitor Claude Code and AI coding agents for stuck or waiting sessions?",
    title: "Claude Code & AI agent monitoring: detecting stuck sessions, waiting prompts and tool failures",
    summary:
      "Traditional uptime tools monitor HTTP endpoints, and LLM observability platforms (Langfuse, LangSmith, AgentOps) trace prompts inside apps you build. Monitoring local and headless coding agents requires a different layer: zero-prompt lifecycle hooks, silence-floor stall detection, multi-harness coverage, and OpenTelemetry trace ingestion.",
    heroImage: {
      src: "/img/agents/guard-architecture.jpg",
      alt: "Three-layer AI agent monitoring and local guardrail control plane",
      caption: "Operational agent monitoring bridges the gap between cron watchdogs and prompt-logging LLM tracers.",
    },
    sections: [
      {
        h: "Why coding agents fail differently from normal software",
        p: [
          "Standard backend services crash with a stack trace and an HTTP 500. Coding agents like Claude Code, Cursor, Codex CLI, Gemini CLI, and Antigravity fail in four quieter ways:",
          "1. **Permission hangs:** The agent pauses indefinitely waiting for `Allow: git push?` in a background terminal or tmux pane. 2. **Silent network/API stalls:** The process remains alive in RAM but produces zero tool calls for 45 minutes. 3. **Retry spirals:** Every single tool call exits 1 while the agent loops through variations all night. 4. **Config drift:** An agent silently gains a new MCP server or modified rule file.",
        ],
        diagram: "monitoring-matrix",
      },
      {
        h: "Complete tool comparison: choosing the right agent monitoring stack",
        p: [
          "Different teams need different layers. Use this objective matrix to avoid forcing an LLM prompt tracer or legacy cron pinger into a job it was not built for:",
        ],
        table: {
          headers: ["Tool category", "Examples", "Sees prompts/code?", "Catches stuck & waiting?", "Local loop & rm-rf fuse?", "Best for"],
          rows: [
            ["Zero-Prompt Agent Monitor", "Agent Tracking", "Never (zero-prompt)", "Yes (hooks + silence floor)", "Yes (<2 ms PreToolUse)", "Teams & devs running Claude Code, Cursor, Codex, Gemini, Agy & cron"],
            ["LLM Tracing & Evals", "Langfuse, LangSmith, AgentOps", "Yes (full prompts & spans)", "No (post-hoc traces)", "No", "Debugging prompts, evals & latency inside custom AI apps you build"],
            ["Cron Dead-Man's Switches", "Cronitor, Healthchecks.io, LastPing", "No", "Missed schedules only", "No", "Simple shell scripts and HTTP uptime checks"],
            ["Generic OTel / APM", "Datadog, Grafana, Sentry", "Depends on config", "Requires custom rules", "No", "Central infra teams willing to build & maintain custom dashboards"],
            ["DIY Shell Hooks", "Custom bash + curl", "Local only", "Partial (fails open)", "Manual scripting", "Single-laptop tinkering before multi-machine sprawl"],
          ],
        },
        callout: {
          tag: "Use both when appropriate",
          text: "If you build an AI SaaS app with LangGraph or the Anthropic SDK, keep Langfuse or LangSmith for your app's prompt evals—and use Agent Tracking for the coding agents and cron jobs operating your repositories and servers.",
        },
      },
      {
        h: "OpenTelemetry (OTLP) + MCP Fleet Queries",
        p: [
          "In addition to native hooks for 5 coding harnesses and `wrap` for cron/CI, Agent Tracking exposes an authenticated OTLP/HTTP JSON receiver (`POST /api/agents/otlp`) for custom workers and a read-only MCP endpoint (`POST /api/mcp`, tool `get_fleet_status`) so you can ask Claude or Cursor directly: *“Which of my overnight agents stalled or hit errors?”*",
        ],
        code: `# Connect all coding-agent harnesses on this machine
curl -fsSL https://agenttracking.co/install.sh | sh -s -- connect all

# Query your monitored fleet directly from Claude or Cursor via MCP:
{
  "mcpServers": {
    "agent-tracking": {
      "url": "https://agenttracking.co/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_READ_TOKEN" }
    }
  }
}`,
        codeLang: "json",
      },
      {
        h: "Try the fleet view before installing",
        p: [
          "Click through six live simulated agents—including a blocked loop, an MCP drift alert, a waiting permission prompt, and healthy cron runs—in the [interactive fleet demo](/demo/fleet) without signing up.",
        ],
      },
    ],
    faq: [
      { q: "How does Agent Tracking detect a stuck session when no hook fires?", a: "The server monitors the last lifecycle event timestamp of every running session. If an active session goes silent beyond the stall threshold without ending, it is marked as `suspected stuck` and triggers an immediate alert." },
      { q: "Can I monitor agents across multiple Linux servers and macOS laptops?", a: "Yes. Each connected machine reports under its own host label into one unified fleet dashboard, with one morning briefing in your local time zone." },
      { q: "Is Agent Tracking self-hostable for air-gapped or private VPC setups?", a: "Yes. The entire application runs as a single Node.js 22 process with a single SQLite file under AGPL-3.0—no Postgres, Redis, or Kafka cluster required." },
      { q: "How does Agent Tracking compare to Datadog or Sentry AI Agent Monitoring?", a: "Datadog and Sentry focus on APM instrumentation inside production web applications at enterprise seat/ingest pricing. Agent Tracking targets coding-agent fleets (Claude Code, Cursor, Codex, Gemini, Antigravity) and cron jobs with zero-code hook installation, local guardrails, and zero prompt collection." },
    ],
    sources: [
      { label: "OpenTelemetry — OTLP/HTTP JSON Specification", url: "https://opentelemetry.io/docs/specs/otlp/" },
      { label: "Anthropic — Claude Code Monitoring & Telemetry Docs", url: "https://docs.anthropic.com/en/docs/claude-code/monitoring-usage" },
    ],
    related: ["claude-code-hooks-guide-alerts-guardrails", "monitor-claude-code-cron-and-headless-agents", "mcp-server-security-audit-and-drift"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
  {
    slug: "monitor-claude-code-cron-and-headless-agents",
    category: "agents",
    question: "How do I safely monitor Claude Code cron jobs and overnight headless agents?",
    title: "Monitoring Claude Code cron jobs & headless agents: missed runs, timeouts and masked logs",
    summary:
      "Running `claude -p` or automated AI scripts from crontab or GitHub Actions fails silently in three ways: interactive permission walls hang the process forever, zombie processes trigger skip-cascades on the next tick, and standard cron never alerts when a job fails to start. Wrapping each job with `agenttracking wrap --every` plus a local guard fuse gives you dead-man's-switch alerts, masked stderr tails, and hard loop protection.",
    sections: [
      {
        h: "Why standard crontab fails for AI coding jobs",
        p: [
          "Classic cron was designed for deterministic 5-second shell scripts that exit 0 or 1. When you schedule a headless Claude Code triage job, automated dependency updater, or nightly report generator, you inherit both Unix cron failure modes and LLM agent failure modes.",
          "If cron daemon restarts, permissions break, or a previous zombie run holds a lockfile, your scheduled agent simply never runs—and cron sends zero email because nothing exited with an error.",
        ],
        diagram: "cron-watchdog",
      },
      {
        h: "Headless & cron failure checklist",
        p: [
          "Protect every unattended AI job against all five failure modes below:",
        ],
        table: {
          headers: ["Failure mode", "What happens silently", "How to prevent & monitor"],
          rows: [
            ["Permission wall hang", "Headless CLI waits forever for `Allow?` prompt", "Set explicit non-interactive permission scope + `agenttracking guard --max-minutes 30`"],
            ["Missed / skipped schedule", "Cron daemon stopped, host rebooted, or lockfile stuck", "Wrap with `agenttracking wrap --every 24h` so missing starts trigger alerts"],
            ["Infinite tool retry loop", "Failing test or flaky API burns tokens for hours", "Enable `agenttracking guard --max-failures 5 --max-calls 80`"],
            ["Secret leak in error logs", "Stderr dumps `Authorization: Bearer ...` into alert emails", "Use `--tail 20` — Agent Tracking automatically masks tokens, API keys & DB URLs locally"],
            ["Silent regression in output", "Script exits 0 even though the generated check failed", "Record named assertions with `wrap --check <name> --version <v>`"],
          ],
        },
        callout: {
          tag: "Automatic secret masking",
          text: "When you pass `--tail 20` to `agenttracking wrap`, the CLI masks Bearer tokens, GitHub/Anthropic/OpenAI/Stripe/AWS/Slack/Telegram keys, database URIs, and SSH headers locally before sending the last 20 lines of stderr.",
        },
      },
      {
        h: "Discover unwrapped crons and wrap them safely",
        p: [
          "`agenttracking doctor` parses your local `crontab -l` offline (never sending raw commands) and prints exact `wrap` suggestions with inferred `--every` intervals. `wrap` preserves your command's stdout, stderr, and exit code 1:1:",
        ],
        code: `# 1. Inspect existing crontab locally (zero network calls)
agenttracking doctor

# 2. Before (blind cron — silent if it hangs or never starts):
# 0 3 * * * /opt/agents/nightly-triage.sh

# 3. After (missed-run watchdog + duration + masked stderr tail):
0 3 * * * agenttracking wrap --name nightly-triage --every 24h --tail 20 -- /opt/agents/nightly-triage.sh

# 4. Works identically in GitHub Actions or systemd timers:
agenttracking wrap --name ci-review --kind codex --tail 20 -- ./scripts/run-review.sh`,
        codeLang: "sh",
      },
      {
        h: "One morning briefing instead of 40 noisy cron mails",
        p: [
          "Healthy jobs stay quiet all night and roll up into a single daily briefing at the hour and IANA time zone you pick. Only real failures, suspected hangs, runaway loops, or missed schedules fire immediate Telegram, Slack, Discord, or email alerts.",
        ],
      },
    ],
    faq: [
      { q: "Does `agenttracking wrap` change my script's exit code or stdout?", a: "No. `wrap` streams stdout and stderr untouched and exits with the exact exit code of the wrapped command so pipes, systemd, and CI runners behave identically." },
      { q: "What happens if agenttracking.co is temporarily unreachable when my cron runs?", a: "Your cron job still executes normally without delay. Telemetry events spool locally and flush on the next run; hooks and wrappers never break production scripts." },
      { q: "Can I use `wrap` with GitHub Actions, Codex CLI, or Python agent scripts?", a: "Yes. Pass `--kind cron`, `--kind codex`, `--kind agy`, or `--kind custom` to wrap any CLI command or CI step." },
      { q: "How many cron jobs can I monitor for free?", a: "Up to 5 agents/cron jobs are free forever—including Telegram, Slack, Discord, webhook, and email alerts plus the daily morning briefing." },
    ],
    sources: [
      { label: "Anthropic — Claude Code Headless / Print Mode", url: "https://docs.anthropic.com/en/docs/claude-code/cli-reference" },
      { label: "Agent Tracking Secret Masker Test Suite (Open Source)", url: "https://github.com/shufflethis/agent-tracking/blob/main/cli/src/mask.test.ts" },
    ],
    related: ["stop-claude-code-runaway-costs-and-loops", "claude-code-hooks-guide-alerts-guardrails", "claude-code-monitoring-and-stuck-sessions"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
];

export const AGENT_GUIDES_DE: Guide[] = [
  {
    slug: "claude-code-hooks-anleitung-alerts-guardrails",
    category: "agents",
    question: "Wie funktionieren Claude Code Hooks für Alerts, hängende Sessions und Guardrails?",
    title: "Claude Code Hooks Guide: Telegram- & Slack-Alerts, hängende Sessions und lokale Guardrails",
    summary:
      "Claude Code bietet deterministische Lebenszyklus-Hooks (PreToolUse, PostToolUse, PostToolUseFailure, Notification, Stop, SessionEnd) in ~/.claude/settings.json. Nutze PreToolUse, um Endlosschleifen und destruktive Befehle lokal zu blockieren, und Notification plus Silence-Watchdog für sofortige Telegram- oder Slack-Meldungen.",
    heroImage: {
      src: "/img/agents/guard-architecture.jpg",
      alt: "Zero-Prompt Claude Code Hook-Pipeline mit lokalem PreToolUse Circuit Breaker und EU-Alert-Routing",
      caption: "Deterministische Hooks setzen lokale Limits in unter 2 ms vor jedem Tool-Aufruf durch — die Cloud erhält nur Status-Metadaten.",
    },
    sections: [
      {
        h: "Warum Hooks zuverlässiger sind als Polling oder System-Prompts",
        p: [
          "Solange du direkt vor dem Terminal sitzt, siehst du Bestätigungsfragen und Fehlerschleifen sofort. Sobald Claude Code über Nacht, in mehreren Repos oder per Cron läuft, versagen klassische Exit-Codes: Ein Agent, der auf ein „Ja“ wartet, ist nicht abgestürzt — also gibt es auch keine Fehlermeldung.",
          "Die nativen Hooks aus der [Claude Code Hooks-Dokumentation](https://docs.anthropic.com/en/docs/claude-code/hooks) lösen das deterministisch: Statt zu hoffen, dass das Modell eine Prompt-Regel einhält, laufen feste Shell-Befehle bei jedem Lebenszyklus-Event.",
        ],
        diagram: "hooks-flow",
      },
      {
        h: "Alle Claude-Code-Hook-Events im Vergleich",
        p: [
          "Der häufigste Fehler in der Praxis ist ein Alert auf dem `Stop`-Event: `Stop` feuert bei jedem normalen Turn-Ende und flutet dich mit Fehlalarmen. Ordne jedes Event sauber seiner Aufgabe zu:",
        ],
        table: {
          headers: ["Hook-Event", "Wann es feuert", "Kann blocken?", "Sinnvoller Einsatz"],
          rows: [
            ["PreToolUse", "Direkt vor jedem Tool-Aufruf", "Ja (Exit 2 / JSON deny)", "Lokale Schutzbremse: Loops kappen, `rm -rf` & Force-Push blockieren"],
            ["PostToolUse", "Nach erfolgreichem Tool-Aufruf", "Nein", "Fehlerzähler zurücksetzen, Tool-Name & Dauer erfassen"],
            ["PostToolUseFailure", "Nach fehlgeschlagenem Tool-Aufruf", "Nein", "Fehler-Streak hochzählen; bei 5× am Stück Loop-Bremse auslösen"],
            ["Notification", "Wenn Claude eine Eingabe braucht", "Nein", "Sofortiger Telegram-, Slack- oder Discord-Ping bei `permission_prompt`"],
            ["Stop", "Wenn Claude einen Turn beendet", "Optional Stop-Gate", "Turn abschließen; optional Test-Gate vor Beendigung prüfen"],
            ["SessionEnd", "Wenn die Session endet", "Nein", "Session-Timeline schließen & fürs Morgen-Briefing erfassen"],
          ],
        },
        callout: {
          tag: "Stille Hänger nicht vergessen",
          text: "Selbst ein perfekter Notification-Hook feuert nicht, wenn ein API-Call oder Subprozess stumm einfriert. Kombiniere Hooks immer mit einer serverseitigen Silence-Schwelle, die eine laufende Session ohne Events nach 15–30 Min. als „hängt vermutlich“ meldet.",
        },
      },
      {
        h: "Drei typische Hook-Fallen in der Praxis",
        p: [
          "1. **Hooks failen standardmäßig offen:** Ein Tippfehler im eigenen Script oder ein Timeout erzeugt nur eine stille Warnung — dein Alert fällt unbemerkt aus.",
          "2. **Fehlender PATH in Non-Interactive Shells:** Hintergrund-Hooks laden nicht immer `~/.zshrc` oder `nvm`. Nutze feste absolute Pfade statt losem `curl`.",
          "3. **Unbeabsichtigter Prompt- & Secret-Leak:** Wer das rohe Hook-`stdin` direkt an externe Webhooks schickt, überträgt Quellcode, Dateipfade und API-Keys. Sende nur Event-Typ, Tool-Name, Erfolg/Fehler und lokal gehashte Session-IDs.",
        ],
      },
      {
        h: "Ein Befehl für Claude Code, Cursor, Codex, Gemini & Antigravity",
        p: [
          "`agenttracking` richtet schonende Hooks (mit Backup deiner bestehenden Config), eine lokale Schutzbremse und kostenlose Telegram-, Slack- und Discord-Alerts (bis 5 Agents gratis) in einem Rutsch ein:",
        ],
        code: `# 1. Optional erst 100 % offline prüfen (kein Login, kein Upload)
curl -fsSL https://agenttracking.co/install.sh | sh -s -- audit

# 2. Lokale Loop- & Destruktiv-Schutzbremse aktivieren (<2 ms lokal)
agenttracking guard --max-failures 5 --max-calls 80 --max-minutes 45 --block-destructive on

# 3. Hooks verbinden (Backup von ~/.claude/settings.json, eigene Hooks bleiben)
agenttracking connect all

# Rückstandslos wieder entfernen:
agenttracking disconnect claude`,
        codeLang: "sh",
      },
      {
        h: "Vorher im Browser testen",
        p: [
          "Du möchtest erst sehen, wie Timelines, Guard-Blocks und Alerts aussehen? Öffne die [interaktive Live-Flotten-Demo](/de/demo/fleet) komplett ohne Login.",
        ],
      },
    ],
    faq: [
      { q: "Überschreibt `connect claude` meine bestehenden Hooks?", a: "Nein. Es ergänzt ausschließlich eigene Einträge, legt ein Backup neben `~/.claude/settings.json` an und lässt alle anderen Hooks unberührt." },
      { q: "Sind Telegram-, Slack- und Discord-Alerts wirklich im Free-Plan enthalten?", a: "Ja. Bis 5 Agents sind Telegram, Slack, Discord, Webhooks, E-Mail-Alerts und das tägliche Morgen-Briefing dauerhaft kostenlos enthalten." },
      { q: "Funktionieren `audit` und `guard` auch ohne Account?", a: "Ja. Beide laufen 100 % lokal auf deinem Rechner ohne einen einzigen Netzwerkaufruf." },
      { q: "Werden meine Prompts oder Tool-Ausgaben übertragen?", a: "Nein, niemals. Die Hooks senden ausschließlich Status-Metadaten, Tool-Namen, Ergebnis und lokal gehashte IDs." },
    ],
    sources: [
      { label: "Anthropic — Claude Code Hooks Referenz", url: "https://docs.anthropic.com/en/docs/claude-code/hooks" },
      { label: "Agent Tracking CLI Quellcode (AGPL-3.0)", url: "https://github.com/shufflethis/agent-tracking/tree/main/cli/src" },
    ],
    related: ["claude-code-kosten-und-endlosschleifen-stoppen", "claude-code-monitoring-und-haengende-sessions", "mcp-server-sicherheit-audit-und-drift"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
  {
    slug: "claude-code-kosten-und-endlosschleifen-stoppen",
    category: "agents",
    question: "Wie stoppe ich Claude Code Kosten-Explosionen und Endlosschleifen über Nacht?",
    title: "Claude Code Kosten & Endlosschleifen stoppen: Lokaler Circuit Breaker gegen Token-Burn",
    summary:
      "Hohe Claude-Code-Rechnungen entstehen selten durch einen einzelnen Prompt, sondern durch unbeaufsichtigte Retry-Spiralen über 100k+ Kontext-Tokens. Ein lokaler PreToolUse-Circuit-Breaker stoppt aufeinanderfolgende Tool-Fehler, zu viele Calls und überlange Turns in unter 2 ms direkt auf deinem Gerät.",
    heroImage: {
      src: "/img/agents/cost-loop-breaker.jpg",
      alt: "Circuit Breaker kappt eine eskalierende Endlosschleife und senkt den Token-Verbrauch auf eine flache Basislinie",
      caption: "Ein lokaler PreToolUse-Schalter kappt Fehler-Loops nach 5 Fehlversuchen, statt über Nacht $50–$180 zu verbrennen.",
    },
    sections: [
      {
        h: "Warum ein einziger Nacht-Loop $50 bis $180 kosten kann",
        p: [
          "Jeder fehlgeschlagene Test- oder Build-Versuch verlängert das Kontextfenster. Selbst mit Prompt-Caching kostet jeder weitere Durchlauf tausende Input- und Output-Tokens. Eine bloße Anweisung in `CLAUDE.md` („brich nach 3 Fehlern ab“) ist nur probabilistisch — das Modell probiert oft trotzdem weiter.",
        ],
        diagram: "cost-breaker",
      },
      {
        h: "Kostenvergleich: Ungeschützt vs. lokaler Circuit Breaker",
        p: [
          "Typische Werte für autonome Refactoring- oder Bugfix-Sessions bei großem Repository-Kontext (exakte Kosten variieren je nach Modell und Cache-Rate):",
        ],
        table: {
          headers: ["Szenario", "Tool-Calls bis Stopp", "Dauer", "Typischer API-Burn", "Ergebnis"],
          rows: [
            ["Ungeschützter Nacht-Loop", "120–300+ Calls", "2–6 Stunden", "45 $ – 180 $+", "Kaputter Branch, leeres Kontingent, Überraschungsrechnung"],
            ["Nur Prompt-Regel („stopp nach 3“)", "15–60 Calls (unsicher)", "20–90 Min.", "8 $ – 35 $", "Modell ignoriert Regel oft kurz vor vermeintlicher Lösung"],
            ["Nur harter Timeout (`timeout 2h`)", "80–180 Calls", "120 Min.", "30 $ – 95 $", "Bricht gute Builds ab oder verbrennt volle 2 Stunden"],
            ["Lokaler PreToolUse Guard", "5 Fehler am Stück / 80 Cap", "1–4 Min. bei Loop", "< 1,50 $ – 3,00 $", "Sofortiger lokaler Stopp (<2 ms) + Telegram/Slack-Alert"],
          ],
        },
        callout: {
          tag: "Entscheidender Unterschied",
          text: "Billing-Alerts der Modell-Anbieter kommen oft erst Minuten bis Stunden später. Nur ein synchroner lokaler PreToolUse-Hook blockiert den 6. fehlgeschlagenen Aufruf, bevor der nächste API-Call überhaupt rausgeht.",
        },
      },
      {
        h: "Lokale Kosten- & Sicherheitsbremse in 20 Sekunden aktivieren",
        p: [
          "Funktioniert 100 % lokal für Claude Code, Cursor, Gemini CLI und Antigravity — ohne Account und ohne Prompt-Übertragung:",
        ],
        code: `# CLI installieren (SHA-256 geprüft) & lokal prüfen
curl -fsSL https://agenttracking.co/install.sh | sh -s -- audit

# Schutzbremse scharfschalten
agenttracking guard \\
  --max-failures 5 \\
  --max-calls 80 \\
  --max-minutes 45 \\
  --block-destructive on

# Sofortiger Not-Aus jederzeit lokal:
agenttracking pause --reason "Loop prüfen"
agenttracking resume`,
        codeLang: "sh",
      },
    ],
    faq: [
      { q: "Bremst `agenttracking guard` normale Sessions aus?", a: "Nein. Die lokale Prüfung dauert unter 2 Millisekunden und macht keinen Netzwerkaufruf." },
      { q: "Setzt sich der Zähler bei einem neuen Prompt automatisch zurück?", a: "Ja. Sobald du eine neue Eingabe machst oder ein Tool erfolgreich läuft, starten die Zähler wieder sauber bei null." },
      { q: "Stoppt `guard` auch gefährliche Shell-Befehle?", a: "Mit `--block-destructive on` blockiert der lokale Hook destruktive Shell-Muster (wie `rm -rf /`, Force-Push oder Drop-Befehle) noch vor der Ausführung." },
      { q: "Muss ich meine API-Keys hinterlegen?", a: "Nein. Der Schutz basiert rein auf lokalen Tool-Fehlerzählern, Call-Budgets und Laufzeit — API-Keys werden nie angefasst." },
    ],
    sources: [
      { label: "Anthropic — Claude Code Kosten verwalten", url: "https://docs.anthropic.com/en/docs/claude-code/costs" },
      { label: "Agent Tracking Guard-Implementierung (AGPL-3.0)", url: "https://github.com/shufflethis/agent-tracking/blob/main/cli/src/guard.ts" },
    ],
    related: ["claude-code-hooks-anleitung-alerts-guardrails", "claude-code-cron-jobs-und-headless-agents-ueberwachen", "mcp-server-sicherheit-audit-und-drift"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
  {
    slug: "mcp-server-sicherheit-audit-und-drift",
    category: "agents",
    question: "Wie prüfe ich MCP-Server-Sicherheit und erkenne Config-Drift im Team?",
    title: "MCP-Server-Sicherheit & Audit: Shadow-MCPs, ungepinnte npx-Pakete & DSGVO-konformes Drift-Monitoring",
    summary:
      "MCP-Server geben Coding-Agents direkten Zugriff auf Datenbanken, GitHub, Stripe und interne APIs. Die größten Risiken im Alltag sind ungepinnte npx-Pakete, unverschlüsselte http://-Endpunkte, Klartext-Secrets in JSON-Configs, Wildcard-Permissions und unbemerkter Config-Drift. Ein Zero-Prompt-Audit erkennt all das lokal und DSGVO-konform.",
    heroImage: {
      src: "/img/agents/mcp-security-drift.jpg",
      alt: "MCP-Server-Konstellation mit isoliertem Drift-Knoten im Sicherheits-Scan",
      caption: "Kryptografische SHA-256-Fingerabdrücke erkennen neue Shadow-MCPs und Regeländerungen, ohne jemals Secret-Werte zu lesen.",
    },
    sections: [
      {
        h: "Warum Shadow-MCPs der größte blinde Fleck für CTOs und Security sind",
        p: [
          "In modernen Engineering-Teams nutzen Entwickler parallel Claude Code, Cursor, Codex CLI, Gemini CLI und Antigravity. Ein neuer MCP-Server ist in 10 Sekunden in `.mcp.json` oder `~/.cursor/mcp.json` eingetragen — komplett außerhalb klassischer MDM- oder SIEM-Sichtbarkeit.",
          "Gleichzeitig scheitern klassische Cloud-LLM-Tracer in Europa sofort an DSGVO, Geheimhaltung und Betriebsrat, weil sie Prompts und Quellcode in US-Clouds hochladen. Genau hier löst Zero-Prompt-Auditing den Konflikt.",
        ],
        diagram: "mcp-drift",
      },
      {
        h: "MCP-Risikomatrix & konkrete Gegenmaßnahmen",
        p: [
          "Abgeleitet aus der offiziellen [MCP Security Best Practices Spezifikation](https://modelcontextprotocol.io/specification/draft/basic/security_best_practices) und OWASP-Empfehlungen für agentische Tool-Integrationen:",
        ],
        table: {
          headers: ["Risiko", "Typisches Muster in der Config", "Auswirkung", "Erkennung & Fix"],
          rows: [
            ["Ungepinntes `npx`", "`\"command\": \"npx\", \"args\": [\"-y\", \"@org/mcp\"]`", "Supply-Chain-Drift bei jedem Neustart", "Mit `agenttracking audit` finden; exakte `@1.2.3`-Version pinnen"],
            ["Klartext `http://` Remote-MCP", "`\"url\": \"http://mcp.intern.example/sse\"`", "Auth-Header & Tool-Payloads unverschlüsselt im Netz", "Alle Nicht-Localhost-Endpunkte auf `https://` umstellen"],
            ["Klartext-Secrets im JSON", "`\"env\": { \"API_KEY\": \"sk_live_...\" }`", "Versehentlicher Git-Commit leakt Produktiv-Keys", "Lokal zählen (Werte nie lesen); `${ENV_VAR}` oder Secret-Manager nutzen"],
            ["Wildcard-Permissions", "`\"allow\": [\"Bash(*)\", \"Write(*)\"]`", "Prompt-Injection erhält freien Shell-Zugriff", "Allowlist einschränken + `guard --block-destructive on`"],
            ["Stiller MCP- & `CLAUDE.md`-Drift", "Neuer MCP-Server oder erstmaliges Tool auf Laptop", "Shadow-AI-Anbindung bleibt monatelang unbemerkt", "Kontinuierliche SHA-256-Fingerprint-Alerts über die Flotte"],
          ],
        },
        callout: {
          tag: "DSGVO- & Betriebsrat-tauglich",
          text: "Weder beim Offline-Audit noch beim laufenden Team-Drift-Monitoring verlassen Prompts, Code oder Secret-Werte den Rechner. Die gehostete Cloud läuft auf Servern in Deutschland (EU) und ist zusätzlich komplett unter AGPL-3.0 selbst hostbar.",
        },
      },
      {
        h: "Sofortiges 100 % Offline-MCP-Audit ausführen",
        p: [
          "Prüfe jede macOS- oder Linux-Maschine in 10 Sekunden ohne Login und ohne Datenübertragung — inklusive `--json`-Ausgabe für CI und Security-Checks:",
        ],
        code: `# 100 % Offline-Sicherheits- & MCP-Audit starten
curl -fsSL https://agenttracking.co/install.sh | sh -s -- audit

# Maschinenlesbare JSON-Ausgabe für CI / Compliance
agenttracking audit --json`,
        codeLang: "sh",
      },
    ],
    faq: [
      { q: "Lädt `agenttracking audit` meine `.mcp.json` oder Secrets hoch?", a: "Niemals. `audit` macht keinen einzigen Netzwerkaufruf. Auch im Cloud-Drift-Modus werden nur SHA-256-Hashes und Zähler übertragen." },
      { q: "Welche Konfigurationsdateien werden geprüft?", a: "`~/.claude/settings.json`, `~/.claude.json`, `./.mcp.json`, `~/.cursor/mcp.json`, `~/.gemini/settings.json` und `~/.gemini/antigravity/mcp_config.json`." },
      { q: "Wie funktioniert Team & Governance für Unternehmen?", a: "Ab 99 $/Monat pro Team (auch auf Rechnung) bekommst du eine geteilte Flotten-Ansicht, Shadow-MCP-Drift-Alerts über alle Entwickler-Laptops, zentrale Guardrail-Standards, EU-Hosting in Deutschland und exportierbare Audit-Logs." },
      { q: "Kann ich einen echten MCP-Drift-Alert vorher live sehen?", a: "Ja — öffne die [interaktive Flotten-Demo](/de/demo/fleet) und klicke auf **billing-service**." },
    ],
    sources: [
      { label: "Model Context Protocol — Security Best Practices", url: "https://modelcontextprotocol.io/specification/draft/basic/security_best_practices" },
      { label: "OWASP Top 10 for LLM & Agentic Applications", url: "https://genai.owasp.org/" },
      { label: "Agent Tracking Audit-Quellcode (AGPL-3.0)", url: "https://github.com/shufflethis/agent-tracking/blob/main/cli/src/audit.ts" },
    ],
    related: ["claude-code-hooks-anleitung-alerts-guardrails", "claude-code-kosten-und-endlosschleifen-stoppen", "claude-code-monitoring-und-haengende-sessions"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
  {
    slug: "claude-code-monitoring-und-haengende-sessions",
    category: "agents",
    question: "Wie überwache ich Claude Code und KI-Coding-Agents auf hängende oder wartende Sessions?",
    title: "Claude Code & AI-Agent-Monitoring: Hängende Sessions, Wartezustände & OpenTelemetry",
    summary:
      "Klassisches Uptime-Monitoring prüft HTTP-Endpunkte, und LLM-Tracer (Langfuse, LangSmith) zeichnen Prompts eigener Apps auf. Für produktive Coding-Agents braucht es eine eigene Schicht: Zero-Prompt-Hooks, Silence-Floor-Erkennung, Multi-Harness-Support und OTLP-Traces.",
    heroImage: {
      src: "/img/agents/guard-architecture.jpg",
      alt: "Dreischichtige Architektur für Zero-Prompt Agent-Monitoring und lokale Guardrails",
      caption: "Operatives Agent-Monitoring schließt die Lücke zwischen Cron-Watchdogs und Prompt-loggenden LLM-Tracern.",
    },
    sections: [
      {
        h: "Warum Coding-Agents anders ausfallen als normale Services",
        p: [
          "Ein Webserver wirft einen HTTP 500. Ein Coding-Agent hängt stumm an einer Bestätigungsfrage, friert im Netzwerk-Retry ein oder dreht sich in einer Tool-Fehlerschleife, ohne jemals mit einem Fehlercode abzubrechen.",
        ],
        diagram: "monitoring-matrix",
      },
      {
        h: "Objektiver Tool-Vergleich für 2026",
        p: [
          "Wähle die passende Kategorie für deinen Anwendungsfall:",
        ],
        table: {
          headers: ["Kategorie", "Beispiele", "Sieht Prompts/Code?", "Erkennt Hänger & Warten?", "Lokale Loop-Bremse?", "Optimal für"],
          rows: [
            ["Zero-Prompt Agent-Monitor", "Agent Tracking", "Nie (Zero-Prompt)", "Ja (Hooks + Silence)", "Ja (<2 ms PreToolUse)", "Devs & Teams mit Claude Code, Cursor, Codex, Gemini, Agy & Cron"],
            ["LLM-Tracing & Evals", "Langfuse, LangSmith, AgentOps", "Ja (volle Prompts)", "Nein (nur fertige Traces)", "Nein", "Prompt-Debugging & Evals in eigenen KI-Apps"],
            ["Cron-Watchdogs", "Cronitor, Healthchecks.io", "Nein", "Nur fehlende Pings", "Nein", "Klassische Shell-Skripte & HTTP-Uptime"],
            ["Generisches OTel / APM", "Datadog, Grafana, Sentry", "Je nach Setup", "Nur mit Eigenbau-Regeln", "Nein", "Große Infra-Teams mit eigenem Dashboard-Aufwand"],
          ],
        },
      },
      {
        h: "OpenTelemetry (OTLP) & Flotten-Status direkt per MCP abfragen",
        p: [
          "Neben den Hooks für 5 Coding-Agents und `wrap` für Cron/CI nimmt Agent Tracking auch OTLP/HTTP-JSON-Traces an und bietet ein Lese-MCP-Tool (`get_fleet_status`), mit dem du direkt in Claude oder Cursor nach dem Zustand deiner Flotte fragen kannst.",
        ],
        code: `curl -fsSL https://agenttracking.co/install.sh | sh -s -- connect all`,
        codeLang: "sh",
      },
    ],
    faq: [
      { q: "Wie erkennt Agent Tracking eine eingefrorene Session ohne Hook-Event?", a: "Der Server prüft den Zeitstempel des letzten Events jeder aktiven Session. Bleiben Events länger als die Silence-Schwelle aus, wird die Session als „hängt vermutlich“ gemeldet." },
      { q: "Kann ich mehrere Server und Laptops gemeinsam überwachen?", a: "Ja. Jede Maschine meldet sich unter ihrem Host-Label an derselben Flotten-Übersicht an." },
      { q: "Lässt sich alles auf einem eigenen Server betreiben?", a: "Ja — ein einziger Node.js-22-Prozess und eine SQLite-Datei unter AGPL-3.0." },
    ],
    sources: [
      { label: "OpenTelemetry — OTLP/HTTP JSON Spezifikation", url: "https://opentelemetry.io/docs/specs/otlp/" },
      { label: "Anthropic — Claude Code Monitoring", url: "https://docs.anthropic.com/en/docs/claude-code/monitoring-usage" },
    ],
    related: ["claude-code-hooks-anleitung-alerts-guardrails", "claude-code-cron-jobs-und-headless-agents-ueberwachen", "mcp-server-sicherheit-audit-und-drift"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
  {
    slug: "claude-code-cron-jobs-und-headless-agents-ueberwachen",
    category: "agents",
    question: "Wie überwache ich Claude Code Cron-Jobs und nächtliche Headless-Agents zuverlässig?",
    title: "Claude Code Cron-Jobs & Headless-Agents überwachen: Fehlende Läufe, Timeouts & maskierte Logs",
    summary:
      "Unbeaufsichtigte `claude -p`-Cron-Jobs scheitern still an Berechtigungsfragen, blockierten Lockfiles oder ausgefallenen Starts — ganz ohne Cron-Mail. Mit `agenttracking wrap --every` und lokalem `guard` erhältst du Dead-Man's-Switch-Alerts, maskierte stderr-Auszüge und harte Schleifen-Limits.",
    sections: [
      {
        h: "Warum normale Cron-Mails bei KI-Jobs versagen",
        p: [
          "Normales Cron verschickt erst dann eine Mail, wenn ein Prozess endet. Bleibt ein Headless-Agent hängen oder startet der Job wegen eines abgestürzten Daemons gar nicht erst, hörst du nichts.",
        ],
        diagram: "cron-watchdog",
      },
      {
        h: "Checkliste für unbeaufsichtigte KI-Cron-Jobs",
        p: [
          "Sichere jeden geplanten Agent-Lauf gegen diese fünf Ausfallarten ab:",
        ],
        table: {
          headers: ["Ausfallart", "Was stumm passiert", "Schutz & Monitoring"],
          rows: [
            ["Permission-Wall-Hänger", "Headless-CLI wartet endlos auf Bestätigung", "Explizite Non-Interactive-Rechte + `guard --max-minutes 30`"],
            ["Ausgebliebener Start", "Daemon gestoppt, Reboot oder alter Lock", "`agenttracking wrap --every 24h` meldet fehlende Läufe automatisch"],
            ["Tool-Endlosschleife", "Kaputter Test verbrennt stundenlang Tokens", "`agenttracking guard --max-failures 5 --max-calls 80`"],
            ["Secret-Leak in Fehlerlogs", "stderr druckt Bearer-Tokens oder DB-URLs", "`--tail 20` maskiert Keys, Tokens & Passwörter lokal vor dem Versand"],
            ["Stille fachliche Regression", "Exit 0 trotz fehlgeschlagenem Prüfschritt", "Benannte Task-Checks via `wrap --check <name> --version <v>`"],
          ],
        },
      },
      {
        h: "Crontab lokal prüfen und sauber umschließen",
        p: [
          "`agenttracking doctor` prüft deine `crontab -l` komplett offline und schlägt fertige `wrap`-Zeilen mit passendem `--every`-Intervall vor. Ausgabe und Exit-Code deines Skripts bleiben 1:1 unverändert:",
        ],
        code: `# Bestehende Crontab lokal analysieren (kein Upload)
agenttracking doctor

# Vorher (blind bei Hänger oder fehlendem Start):
# 0 3 * * * /opt/agents/nightly-triage.sh

# Nachher (Watchdog + Laufzeit + lokal maskiertes stderr):
0 3 * * * agenttracking wrap --name nightly-triage --every 24h --tail 20 -- /opt/agents/nightly-triage.sh`,
        codeLang: "sh",
      },
    ],
    faq: [
      { q: "Verändert `agenttracking wrap` stdout oder den Exit-Code meines Skripts?", a: "Nein. Ausgabe und Exit-Code werden unverändert durchgereicht." },
      { q: "Was passiert, wenn mein Server kurz keine Internetverbindung hat?", a: "Dein Cron-Job läuft trotzdem normal durch; Events werden lokal gepuffert und beim nächsten Mal nachgesendet." },
      { q: "Wie viele Cron-Jobs sind kostenlos?", a: "Bis zu 5 Agents bzw. Cron-Jobs sind dauerhaft kostenlos — inklusive Telegram, Slack, Discord, Webhook und Morgen-Briefing." },
    ],
    sources: [
      { label: "Anthropic — Claude Code CLI Referenz", url: "https://docs.anthropic.com/en/docs/claude-code/cli-reference" },
      { label: "Agent Tracking Secret-Masking Test-Suite", url: "https://github.com/shufflethis/agent-tracking/blob/main/cli/src/mask.test.ts" },
    ],
    related: ["claude-code-kosten-und-endlosschleifen-stoppen", "claude-code-hooks-anleitung-alerts-guardrails", "claude-code-monitoring-und-haengende-sessions"],
    published: "2026-11-25",
    updated: "2026-11-25",
  },
];
