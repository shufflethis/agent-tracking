"use client";

import { useState } from "react";
import Link from "next/link";
import CopyBlock from "@/components/CopyBlock";
import { AUDIT_ONE_LINER, GUARD_EXAMPLE } from "@/lib/agents/setup";
import { CONNECT_CLAUDE } from "@/lib/agents/format";

type DemoHealth = "problem" | "running" | "ok";

type DemoEvent = {
  time: string;
  event: string;
  tool: string;
  outcome: "ok" | "fail" | "blocked" | "waiting" | "drift";
  duration: string;
};

type DemoAgent = {
  id: string;
  name: string;
  host: string;
  kind: string;
  health: DemoHealth;
  statusLabel: { en: string; de: string };
  summary: { en: string; de: string };
  lastRun: string;
  guardStatus: { en: string; de: string };
  driftNote?: { en: string; de: string };
  mcpCount: number;
  events: DemoEvent[];
};

const INITIAL_AGENTS: DemoAgent[] = [
  {
    id: "checkout-refactor",
    name: "checkout-api",
    host: "prod-worker-eu-1",
    kind: "Claude Code",
    health: "problem",
    statusLabel: { en: "Loop blocked by local guard", de: "Endlosschleife lokal gestoppt" },
    summary: {
      en: "5 consecutive Bash failures in 84s. PreToolUse circuit breaker tripped locally before overnight token burn.",
      de: "5 fehlgeschlagene Bash-Aufrufe in 84 Sek. PreToolUse-Bremse hat lokal gestoppt, bevor über Nacht Tokens verbrannt wurden.",
    },
    lastRun: "02:14 UTC",
    guardStatus: { en: "TRIPPED · max-failures=5 · saved ~$65", de: "AUSGELÖST · max-failures=5 · ~65 $ gespart" },
    mcpCount: 3,
    events: [
      { time: "02:14:41", event: "PreToolUse", tool: "Bash", outcome: "blocked", duration: "1 ms" },
      { time: "02:14:38", event: "PostToolUseFailure", tool: "Bash", outcome: "fail", duration: "1.4 s" },
      { time: "02:14:22", event: "PostToolUseFailure", tool: "Bash", outcome: "fail", duration: "1.2 s" },
      { time: "02:14:04", event: "PostToolUseFailure", tool: "Bash", outcome: "fail", duration: "1.3 s" },
      { time: "02:13:49", event: "PostToolUse", tool: "Edit", outcome: "ok", duration: "210 ms" },
      { time: "02:13:17", event: "SessionStart", tool: "claude-code", outcome: "ok", duration: "—" },
    ],
  },
  {
    id: "billing-mcp",
    name: "billing-service",
    host: "macbook-sarah",
    kind: "Cursor",
    health: "problem",
    statusLabel: { en: "MCP & config drift", de: "MCP- & Config-Drift" },
    summary: {
      en: "1 new unpinned npx MCP server added in .mcp.json and first-time tool `stripe_refund_create` observed.",
      de: "1 neuer ungepinnter npx-MCP-Server in .mcp.json erkannt und erstmaliger Aufruf von `stripe_refund_create` gemeldet.",
    },
    lastRun: "09:42 UTC",
    guardStatus: { en: "ACTIVE · destructive fuse on", de: "AKTIV · Destruktiv-Schutz an" },
    driftNote: {
      en: "Fingerprint changed: mcpServers 2 -> 3 (1 unpinned npx) · permissions hash unchanged · zero secret values read.",
      de: "Fingerabdruck geändert: mcpServers 2 -> 3 (1 ungepinntes npx) · Berechtigungs-Hash unverändert · keine Secret-Werte gelesen.",
    },
    mcpCount: 3,
    events: [
      { time: "09:42:19", event: "ConfigDrift", tool: ".mcp.json", outcome: "drift", duration: "4 ms" },
      { time: "09:42:15", event: "FirstTimeTool", tool: "stripe_refund_create", outcome: "drift", duration: "340 ms" },
      { time: "09:41:50", event: "PostToolUse", tool: "Read", outcome: "ok", duration: "48 ms" },
      { time: "09:40:02", event: "SessionStart", tool: "cursor-agent", outcome: "ok", duration: "—" },
    ],
  },
  {
    id: "nightly-migration",
    name: "schema-migrator",
    host: "ci-runner-eu-2",
    kind: "Claude Code",
    health: "problem",
    statusLabel: { en: "Waiting on your approval (24m)", de: "Wartet auf Freigabe (24 Min.)" },
    summary: {
      en: "Headless session hit an interactive permission prompt and stalled silently. Telegram alert dispatched after 5 min.",
      de: "Headless-Session blieb an einer Bestätigungsfrage hängen. Telegram-Alert wurde nach 5 Min. ausgelöst.",
    },
    lastRun: "01:05 UTC",
    guardStatus: { en: "ACTIVE · max-minutes=45", de: "AKTIV · max-minutes=45" },
    mcpCount: 2,
    events: [
      { time: "01:29:00", event: "Notification", tool: "waiting_input", outcome: "waiting", duration: "24 min" },
      { time: "01:05:44", event: "PostToolUse", tool: "Edit", outcome: "ok", duration: "190 ms" },
      { time: "01:05:12", event: "PostToolUse", tool: "Grep", outcome: "ok", duration: "95 ms" },
      { time: "01:05:00", event: "SessionStart", tool: "claude-code", outcome: "ok", duration: "—" },
    ],
  },
  {
    id: "pg-backup",
    name: "postgres-backup",
    host: "prod-worker-eu-1",
    kind: "Cron job",
    health: "ok",
    statusLabel: { en: "Healthy · expected every 24h", de: "Unauffällig · alle 24h erwartet" },
    summary: {
      en: "Completed with exit 0 in 38s. Next expected heartbeat at 03:00 UTC tomorrow.",
      de: "Mit Exit 0 in 38 Sek. abgeschlossen. Nächster erwarteter Heartbeat morgen um 03:00 UTC.",
    },
    lastRun: "03:00 UTC",
    guardStatus: { en: "Wrapped · --every 24h --tail 20", de: "Umschlossen · --every 24h --tail 20" },
    mcpCount: 0,
    events: [
      { time: "03:00:38", event: "CronEnd", tool: "pg_dump", outcome: "ok", duration: "38 s" },
      { time: "03:00:00", event: "CronStart", tool: "pg_dump", outcome: "ok", duration: "—" },
    ],
  },
  {
    id: "docs-sync-agy",
    name: "docs-maintainer",
    host: "macbook-gorden",
    kind: "Antigravity (agy)",
    health: "running",
    statusLabel: { en: "Running · 14 tool calls", de: "Läuft · 14 Tool-Calls" },
    summary: {
      en: "Active turn within guard budget (14/80 calls, 0 consecutive failures). Prompts never leave the machine.",
      de: "Aktiver Turn innerhalb des Budgets (14/80 Calls, 0 Fehler am Stück). Prompts verlassen die Maschine nie.",
    },
    lastRun: "Just now",
    guardStatus: { en: "ACTIVE · 14/80 calls · 0/5 fails", de: "AKTIV · 14/80 Calls · 0/5 Fehler" },
    mcpCount: 4,
    events: [
      { time: "now", event: "PostToolUse", tool: "run_command", outcome: "ok", duration: "620 ms" },
      { time: "1m ago", event: "PostToolUse", tool: "edit_file", outcome: "ok", duration: "110 ms" },
      { time: "3m ago", event: "SessionStart", tool: "agy", outcome: "ok", duration: "—" },
    ],
  },
  {
    id: "pr-reviewer-codex",
    name: "pr-triage",
    host: "ci-runner-eu-2",
    kind: "Codex CLI",
    health: "ok",
    statusLabel: { en: "Completed · 0 alerts", de: "Beendet · 0 Alarme" },
    summary: {
      en: "Reviewed 3 PRs in 4m 12s via wrapped CI runner. All tool checks passed.",
      de: "3 PRs in 4m 12s im CI-Runner geprüft. Alle Tool-Checks bestanden.",
    },
    lastRun: "08:15 UTC",
    guardStatus: { en: "ACTIVE · destructive fuse on", de: "AKTIV · Destruktiv-Schutz an" },
    mcpCount: 1,
    events: [
      { time: "08:19:12", event: "SessionEnd", tool: "codex-cli", outcome: "ok", duration: "4.2 min" },
      { time: "08:16:04", event: "PostToolUse", tool: "gh_pr_diff", outcome: "ok", duration: "410 ms" },
      { time: "08:15:00", event: "SessionStart", tool: "codex-cli", outcome: "ok", duration: "—" },
    ],
  },
];

export default function FleetDemo({ lang }: { lang: "en" | "de" }) {
  const de = lang === "de";
  const [agents, setAgents] = useState<DemoAgent[]>(INITIAL_AGENTS);
  const [filter, setFilter] = useState<"all" | "problem" | "ok">("all");
  const [selectedId, setSelectedId] = useState<string>(INITIAL_AGENTS[0].id);
  const [toast, setToast] = useState<string | null>(null);

  const visible = agents.filter((a) => (filter === "all" ? true : filter === "problem" ? a.health === "problem" : a.health !== "problem"));
  const selected = agents.find((a) => a.id === selectedId) ?? visible[0] ?? agents[0];
  const problemCount = agents.filter((a) => a.health === "problem").length;

  function triggerPause() {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === selected.id
          ? {
              ...a,
              health: "ok",
              statusLabel: { en: "Paused locally (safe)", de: "Lokal pausiert (sicher)" },
              guardStatus: { en: "PAUSED · PreToolUse blocks all tools", de: "PAUSIERT · PreToolUse blockiert Tools" },
              events: [
                { time: "just now", event: "LocalPause", tool: "agenttracking pause", outcome: "blocked", duration: "1 ms" },
                ...a.events,
              ],
            }
          : a,
      ),
    );
    setToast(de ? `Lokal pausiert: ${selected.name}. Neue Tool-Aufrufe werden auf ${selected.host} sofort blockiert.` : `Paused locally: ${selected.name}. New tool calls are blocked immediately on ${selected.host}.`);
  }

  function simulateLoop() {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === selected.id
          ? {
              ...a,
              health: "problem",
              statusLabel: { en: "Loop blocked by local guard", de: "Endlosschleife lokal gestoppt" },
              guardStatus: { en: "TRIPPED · 5/5 failures · Telegram sent", de: "AUSGELÖST · 5/5 Fehler · Telegram gesendet" },
              events: [
                { time: "just now", event: "PreToolUse", tool: "Bash", outcome: "blocked", duration: "1 ms" },
                { time: "just now", event: "PostToolUseFailure", tool: "Bash", outcome: "fail", duration: "1.1 s" },
                ...a.events,
              ],
            }
          : a,
      ),
    );
    setToast(de ? `Simulation: 5. Bash-Fehler in Folge → Lokaler Circuit Breaker hat ${selected.name} gestoppt & Telegram-Alert geschickt.` : `Simulated: 5th consecutive Bash failure → local circuit breaker stopped ${selected.name} & dispatched Telegram alert.`);
  }

  const chipClass = (h: DemoHealth) => (h === "problem" ? "chip fail" : h === "running" ? "chip accent" : "chip pass");
  const outcomeClass = (o: DemoEvent["outcome"]) =>
    o === "ok" ? "chip pass" : o === "waiting" ? "chip warn" : o === "drift" ? "chip accent" : "chip fail";

  return (
    <div className="fdemo">
      <div className="fdemo-banner">
        <span className="chip accent">{de ? "Interaktive Sandbox · Kein Login nötig" : "Interactive sandbox · No login required"}</span>
        <p>
          {de
            ? "Simulierte Flotte über 3 Maschinen (Claude Code, Cursor, Codex CLI, Antigravity, Cron). Klicke auf jeden Agent, prüfe Timelines & MCP-Drift oder löse lokal die Schutzbremse aus."
            : "Simulated fleet across 3 machines (Claude Code, Cursor, Codex CLI, Antigravity, Cron). Click any agent to inspect timelines & MCP drift, or test the local circuit breaker."}
        </p>
      </div>

      <div className="fdemo-stats">
        <div className="card fdemo-kpi">
          <span className="smallcaps">{de ? "Überwachte Agents" : "Monitored agents"}</span>
          <strong>{agents.length}</strong>
          <small>{de ? "über 3 Maschinen · 5 Harnesses" : "across 3 hosts · 5 harnesses"}</small>
        </div>
        <div className="card fdemo-kpi">
          <span className="smallcaps">{de ? "Braucht Aufmerksamkeit" : "Needs attention"}</span>
          <strong style={{ color: problemCount ? "var(--crit)" : "var(--good)" }}>{problemCount}</strong>
          <small>{de ? "Loops, MCP-Drift & Wartezeit" : "Loops, MCP drift & waiting"}</small>
        </div>
        <div className="card fdemo-kpi">
          <span className="smallcaps">{de ? "Übertragene Prompts" : "Prompts transmitted"}</span>
          <strong style={{ color: "var(--good)" }}>0</strong>
          <small>{de ? "Zero-Prompt-Architektur (EU)" : "Zero-prompt architecture (EU)"}</small>
        </div>
        <div className="card fdemo-kpi">
          <span className="smallcaps">{de ? "MCP-Server inventarisiert" : "MCP servers tracked"}</span>
          <strong>13</strong>
          <small>{de ? "1 ungepinnt · Drift-Alert aktiv" : "1 unpinned · drift alerts on"}</small>
        </div>
      </div>

      <div className="fdemo-controls">
        <div className="fdemo-filters" role="group" aria-label="Filter agents">
          {(
            [
              ["all", de ? `Alle (${agents.length})` : `All (${agents.length})`],
              ["problem", de ? `Probleme (${problemCount})` : `Needs attention (${problemCount})`],
              ["ok", de ? `Ruhig / Aktiv (${agents.length - problemCount})` : `Healthy / Running (${agents.length - problemCount})`],
            ] as const
          ).map(([k, label]) => (
            <button key={k} type="button" className={`agm-tab${filter === k ? " is-active" : ""}`} onClick={() => setFilter(k)}>
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn ghost"
          style={{ padding: "8px 14px", fontSize: 13 }}
          onClick={() => {
            setAgents(INITIAL_AGENTS);
            setToast(de ? "Sandbox zurückgesetzt." : "Sandbox reset.");
          }}
        >
          {de ? "Zurücksetzen" : "Reset demo"}
        </button>
      </div>

      {toast ? (
        <div className="callout mid" role="status" style={{ marginBottom: 20 }}>
          <span className="tag">{de ? "Live-Simulation" : "Live simulation"}</span>
          <p style={{ margin: 0 }}>{toast}</p>
        </div>
      ) : null}

      <div className="fdemo-grid">
        <div className="card fdemo-list">
          <div className="tablewrap" style={{ margin: 0, border: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>{de ? "Typ" : "Harness"}</th>
                  <th>Status</th>
                  <th>{de ? "Letzter Lauf" : "Last run"}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                    className={a.id === selected.id ? "fdemo-row is-selected" : "fdemo-row"}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(a.id); } }}
                  >
                    <td>
                      <strong>{a.name}</strong>
                      <span className="fdemo-host">{a.host}</span>
                    </td>
                    <td>{a.kind}</td>
                    <td><span className={chipClass(a.health)}>{a.statusLabel[lang]}</span></td>
                    <td className="mono" style={{ fontSize: 12.5 }}>{a.lastRun}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="card fdemo-detail">
          <div className="fdemo-detail-head">
            <div>
              <p className="smallcaps" style={{ margin: "0 0 4px" }}>{selected.kind} · {selected.host}</p>
              <h2 style={{ margin: 0, fontSize: 22 }}>{selected.name}</h2>
            </div>
            <span className={chipClass(selected.health)}>{selected.statusLabel[lang]}</span>
          </div>

          <p style={{ color: "var(--ink-2)", margin: "12px 0 14px", fontSize: 14.5 }}>{selected.summary[lang]}</p>

          <div className="fdemo-meta">
            <div><span className="smallcaps">Local Guard</span><code>{selected.guardStatus[lang]}</code></div>
            <div><span className="smallcaps">MCP Server</span><code>{selected.mcpCount} {de ? "erkannt (0 Secrets gesendet)" : "inventoried (0 secrets sent)"}</code></div>
          </div>

          {selected.driftNote ? (
            <div className="fdemo-drift">
              <strong>{de ? "Konfigurations- & MCP-Drift:" : "Config & MCP drift:"}</strong> {selected.driftNote[lang]}
            </div>
          ) : null}

          <div className="fdemo-actions">
            <button type="button" className="btn" style={{ padding: "8px 14px", fontSize: 13 }} onClick={triggerPause}>
              {de ? "Agent lokal pausieren" : "Pause agent locally"}
            </button>
            <button type="button" className="btn ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={simulateLoop}>
              {de ? "5× Fehler-Loop simulieren" : "Simulate 5× error loop"}
            </button>
          </div>

          <h3 style={{ fontSize: 15, margin: "20px 0 10px" }}>{de ? "Session-Timeline (nur Metadaten)" : "Session timeline (metadata only)"}</h3>
          <ol className="fdemo-timeline">
            {selected.events.map((ev, i) => (
              <li key={`${ev.time}-${ev.tool}-${i}`}>
                <span className="mono fdemo-t">{ev.time}</span>
                <span className="fdemo-ev">{ev.event}</span>
                <code className="mono">{ev.tool}</code>
                <span className={outcomeClass(ev.outcome)}>{ev.outcome}</span>
                <span className="mono fdemo-dur">{ev.duration}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <section className="card fdemo-cta">
        <div>
          <p className="smallcaps" style={{ marginTop: 0 }}>{de ? "In 30 Sekunden auf deiner eigenen Maschine" : "Run on your own machine in 30 seconds"}</p>
          <h2 style={{ marginTop: 0 }}>{de ? "Erst lokal prüfen — ganz ohne Account" : "Audit locally first — zero account required"}</h2>
          <p style={{ color: "var(--ink-2)", maxWidth: "58ch" }}>
            {de
              ? "Führe das lokale Sicherheits- & Kosten-Audit aus (100 % offline) oder verbinde direkt deine Agents für kostenlose Telegram-, Slack- & Discord-Alerts (bis 5 Agents gratis)."
              : "Run the offline safety & MCP audit first (zero network calls), or connect your agents for free Telegram, Slack & Discord alerts (up to 5 agents free forever)."}
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
            <Link className="btn" href={de ? "/login?lang=de&next=/app/fleet" : "/login?next=/app/fleet"}>
              {de ? "Kostenloses Dashboard öffnen" : "Open free dashboard"}
            </Link>
            <Link className="btn ghost" href={de ? "/de#plans" : "/#plans"}>
              {de ? "Preise & Team-Governance" : "Pricing & Team governance"}
            </Link>
          </div>
        </div>
        <div className="fdemo-cta-cmds">
          <CopyBlock kind="terminal" label={de ? "100 % Offline-Audit (kein Login)" : "100% offline audit (no login)"} text={AUDIT_ONE_LINER} lang={lang} />
          <CopyBlock kind="terminal" label={de ? "Agents verbinden & Alerts aktivieren" : "Connect agents & enable alerts"} text={`${CONNECT_CLAUDE}\n${GUARD_EXAMPLE}`} lang={lang} />
        </div>
      </section>
    </div>
  );
}
