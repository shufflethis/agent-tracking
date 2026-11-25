"use client";

import { useState } from "react";

type ScenarioId = "loop" | "mcp" | "wait" | "cron";

type Scenario = {
  id: ScenarioId;
  tab: string;
  agent: string;
  signal: string;
  shieldStatus: string;
  shieldAction: string;
  tone: "crit" | "warn" | "violet";
  cloudNote: string;
  terminalLine: string;
  alertTitle: string;
  alertBody: string;
  metric: string;
};

const SCENARIOS: Record<"en" | "de", Scenario[]> = {
  en: [
    {
      id: "loop",
      tab: "Runaway Loop",
      agent: "Claude Code · checkout-api",
      signal: "5× Bash exit 1 in 84s",
      shieldStatus: "CIRCUIT BREAKER TRIPPED",
      shieldAction: "Blocked locally on-device (<2 ms)",
      tone: "crit",
      cloudNote: "Metadata only: loop_signal + hashed session ID",
      terminalLine: "[agenttracking guard] STOP: 5 consecutive Bash failures. PreToolUse blocked locally. Zero extra tokens spent.",
      alertTitle: "Telegram · Runaway loop stopped",
      alertBody: "checkout-api hit 5× failing Bash calls on dev-eu-01. Local guard paused the turn. Prompts stayed on-device.",
      metric: "~$40–$120 overnight token burn prevented",
    },
    {
      id: "mcp",
      tab: "Shadow MCP Drift",
      agent: "Cursor + Claude · billing-repo",
      signal: "New unpinned MCP + CLAUDE.md hash changed",
      shieldStatus: "CONFIG DRIFT FLAGGED",
      shieldAction: "SHA-256 fingerprint diff captured",
      tone: "violet",
      cloudNote: "Hashes & counts only — env secrets & tokens never read",
      terminalLine: "[agenttracking audit] HIGH: +1 unpinned npx MCP server added in .mcp.json · permission hash changed",
      alertTitle: "Slack #sec-agents · MCP & config drift",
      alertBody: "billing-repo added 1 unpinned MCP server and modified permission rules on laptop-sarah. Zero code or secrets transmitted.",
      metric: "Zero-prompt compliance (EU / GDPR ready)",
    },
    {
      id: "wait",
      tab: "Silent Permission Hang",
      agent: "Claude Code · nightly-refactor",
      signal: "Waiting on user input (18m idle)",
      shieldStatus: "WAITING STATE DETECTED",
      shieldAction: "Notification hook routed instantly",
      tone: "warn",
      cloudNote: "Lifecycle state: waiting_input (no prompt text)",
      terminalLine: "[agenttracking hook] session=7a91f3 state=waiting_input tool=Bash elapsed=18m -> alert dispatched",
      alertTitle: "Telegram · Claude is waiting on you",
      alertBody: "nightly-refactor on prod-worker-2 has been waiting for tool approval for 18 min. Open terminal or run `agenttracking pause`.",
      metric: "Zero dead overnight sessions",
    },
    {
      id: "cron",
      tab: "Missed Cron Run",
      agent: "Cron · db-backup-eu (--every 24h)",
      signal: "Expected 03:00 UTC · No heartbeat",
      shieldStatus: "MISSED SCHEDULE",
      shieldAction: "Watchdog fired without needing an exit code",
      tone: "crit",
      cloudNote: "Expected window exceeded + optional masked stderr",
      terminalLine: "[agenttracking wrap] schedule=24h last_ok=2026-11-24T03:00Z status=missed -> alert sent to Slack & email",
      alertTitle: "Discord · Expected cron never started",
      alertBody: "db-backup-eu missed its 03:00 UTC window on prod-eu-1. Standard cron sent no mail because the job never ran.",
      metric: "Catches silent skips & hung jobs",
    },
  ],
  de: [
    {
      id: "loop",
      tab: "Endlosschleife",
      agent: "Claude Code · checkout-api",
      signal: "5× Bash Exit 1 in 84 Sek.",
      shieldStatus: "SCHUTZBREMSE AUSGELÖST",
      shieldAction: "Lokal auf dem Gerät gestoppt (<2 ms)",
      tone: "crit",
      cloudNote: "Nur Metadaten: loop_signal + gehashte Session-ID",
      terminalLine: "[agenttracking guard] STOP: 5 Bash-Fehler am Stück. PreToolUse lokal blockiert. Keine weiteren Tokens verbrannt.",
      alertTitle: "Telegram · Fehlerschleife gestoppt",
      alertBody: "checkout-api hatte 5× fehlgeschlagene Bash-Calls auf dev-eu-01. Lokaler Guard hat pausiert. Prompts blieben lokal.",
      metric: "~40–120 $ nächtlicher Token-Burn verhindert",
    },
    {
      id: "mcp",
      tab: "Shadow-MCP-Drift",
      agent: "Cursor + Claude · billing-repo",
      signal: "Neuer ungepinnter MCP + CLAUDE.md geändert",
      shieldStatus: "CONFIG-DRIFT ERKANNT",
      shieldAction: "SHA-256-Fingerabdruck-Diff gemeldet",
      tone: "violet",
      cloudNote: "Nur Hashes & Zähler — Secrets & Keys bleiben lokal",
      terminalLine: "[agenttracking audit] HIGH: +1 ungepinnter npx-MCP-Server in .mcp.json · Berechtigungs-Hash geändert",
      alertTitle: "Slack #sec-agents · MCP- & Config-Drift",
      alertBody: "billing-repo hat 1 ungepinnten MCP-Server ergänzt und Regeln auf laptop-sarah geändert. Kein Code/Secret übertragen.",
      metric: "Zero-Prompt-Compliance (EU / DSGVO)",
    },
    {
      id: "wait",
      tab: "Wartet stumm auf Ja",
      agent: "Claude Code · nightly-refactor",
      signal: "Wartet auf Eingabe (18 Min. still)",
      shieldStatus: "WARTESTATUS ERKANNT",
      shieldAction: "Notification-Hook sofort weitergeleitet",
      tone: "warn",
      cloudNote: "Lebenszyklus-Status: waiting_input (kein Prompt)",
      terminalLine: "[agenttracking hook] session=7a91f3 state=waiting_input tool=Bash elapsed=18m -> Alert gesendet",
      alertTitle: "Telegram · Claude wartet auf dich",
      alertBody: "nightly-refactor auf prod-worker-2 wartet seit 18 Min. auf deine Freigabe. Terminal öffnen oder lokal pausieren.",
      metric: "Keine toten Nachtläufe mehr",
    },
    {
      id: "cron",
      tab: "Fehlender Cron-Job",
      agent: "Cron · db-backup-eu (--every 24h)",
      signal: "Erwartet 03:00 UTC · Kein Heartbeat",
      shieldStatus: "LAUF AUSGEBLIEBEN",
      shieldAction: "Watchdog meldet ganz ohne Exit-Code",
      tone: "crit",
      cloudNote: "Zeitfenster überschritten + optional maskiertes stderr",
      terminalLine: "[agenttracking wrap] schedule=24h last_ok=2026-11-24T03:00Z status=missed -> Alert an Slack & Mail",
      alertTitle: "Discord · Erwarteter Cron nie gestartet",
      alertBody: "db-backup-eu hat sein 03:00-Fenster auf prod-eu-1 verpasst. Normales Cron schwieg, weil der Job nie lief.",
      metric: "Erkennt stumme Ausfälle & Hänger",
    },
  ],
};

export default function AgentGuardMotion({ lang }: { lang: "en" | "de" }) {
  const list = SCENARIOS[lang];
  const [activeId, setActiveId] = useState<ScenarioId>("loop");
  const active = list.find((s) => s.id === activeId) ?? list[0];
  const de = lang === "de";

  const toneColor = active.tone === "crit" ? "#ff6b6b" : active.tone === "warn" ? "#f0c14b" : "#a870e0";

  return (
    <div className="agm-wrap" role="region" aria-label={de ? "Interaktive Architektur-Animation" : "Interactive architecture motion graphic"}>
      <div className="agm-tabs" role="tablist">
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === activeId}
            className={`agm-tab${s.id === activeId ? " is-active" : ""}`}
            onClick={() => setActiveId(s.id)}
          >
            <span className={`agm-dot tone-${s.tone}`} aria-hidden="true" />
            {s.tab}
          </button>
        ))}
      </div>

      <div className="agm-stage">
        <svg viewBox="0 0 960 280" className="agm-svg" role="img" aria-label={`${active.tab}: ${active.shieldAction}`}>
          <defs>
            <linearGradient id="agmCyanViolet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3fd8ca" />
              <stop offset="100%" stopColor="#8b3fca" />
            </linearGradient>
            <linearGradient id="agmZoneBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(63,216,202,0.08)" />
              <stop offset="100%" stopColor="rgba(139,63,202,0.05)" />
            </linearGradient>
            <filter id="agmGlow">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Subtle grid */}
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
            <line x1="0" y1="70" x2="960" y2="70" />
            <line x1="0" y1="140" x2="960" y2="140" />
            <line x1="0" y1="210" x2="960" y2="210" />
            <line x1="320" y1="0" x2="320" y2="280" />
            <line x1="640" y1="0" x2="640" y2="280" />
          </g>

          {/* Left Zone: Local Machine */}
          <rect x="16" y="18" width="584" height="244" rx="14" fill="rgba(17,17,17,0.75)" stroke="#262629" strokeDasharray="5 5" />
          <text x="34" y="42" fill="#9a9aa4" fontSize="11" fontFamily="var(--mono)" letterSpacing="1.4">
            {de ? "DEINE MASCHINE (PROMPTS & CODE BLEIBEN HIER)" : "YOUR MACHINE (PROMPTS, CODE & SECRETS NEVER LEAVE)"}
          </text>

          {/* Agent nodes on left */}
          {[
            { y: 66, label: "Claude Code", sub: "PreToolUse / Stop", hit: activeId === "loop" || activeId === "wait" },
            { y: 122, label: "Cursor / Codex / Gemini", sub: "Hooks & MCP configs", hit: activeId === "mcp" },
            { y: 178, label: "Cron / CI / Antigravity", sub: "wrap --every · agy", hit: activeId === "cron" },
          ].map((node) => (
            <g key={node.label}>
              <rect
                x="34"
                y={node.y}
                width="210"
                height="44"
                rx="9"
                fill={node.hit ? "rgba(255,255,255,0.05)" : "#151517"}
                stroke={node.hit ? toneColor : "#2d2d32"}
                strokeWidth={node.hit ? "1.6" : "1"}
              />
              <circle cx="52" cy={node.y + 22} r="4.5" fill={node.hit ? toneColor : "#3fd8ca"} className={node.hit ? "agm-pulse" : undefined} />
              <text x="66" y={node.y + 19} fill="#f0f0f0" fontSize="12.5" fontWeight="600" fontFamily="var(--display)">{node.label}</text>
              <text x="66" y={node.y + 34} fill="#9a9aa4" fontSize="10.5" fontFamily="var(--mono)">{node.sub}</text>
            </g>
          ))}

          {/* Animated tracks: Agents -> Local Shield */}
          <path d="M 244 88 C 296 88, 296 140, 344 140" fill="none" stroke={activeId === "loop" || activeId === "wait" ? toneColor : "#2e2e34"} strokeWidth="2" className="agm-flow" />
          <path d="M 244 144 L 344 144" fill="none" stroke={activeId === "mcp" ? toneColor : "#2e2e34"} strokeWidth="2" className="agm-flow" />
          <path d="M 244 200 C 296 200, 296 148, 344 148" fill="none" stroke={activeId === "cron" ? toneColor : "#2e2e34"} strokeWidth="2" className="agm-flow" />

          {/* Moving pulse dot into shield */}
          <circle r="4.5" fill={toneColor} filter="url(#agmGlow)">
            <animateMotion
              dur="1.8s"
              repeatCount="indefinite"
              path={activeId === "cron" ? "M 244 200 C 296 200, 296 148, 344 148" : activeId === "mcp" ? "M 244 144 L 344 144" : "M 244 88 C 296 88, 296 140, 344 140"}
            />
          </circle>

          {/* Center Local Zero-Prompt Guardrail Gate */}
          <rect x="344" y="64" width="236" height="156" rx="14" fill="url(#agmZoneBg)" stroke="url(#agmCyanViolet)" strokeWidth="1.8" />
          <text x="364" y="90" fill="#3fd8ca" fontSize="11" fontFamily="var(--mono)" letterSpacing="1.2">
            LOCAL GUARD &amp; AUDIT
          </text>
          <text x="364" y="114" fill="#f0f0f0" fontSize="15" fontWeight="700" fontFamily="var(--display)">
            {active.shieldStatus}
          </text>
          <text x="364" y="135" fill="#c4c4c8" fontSize="11.5" fontFamily="var(--body)">
            {active.shieldAction}
          </text>

          {/* Status pill inside shield */}
          <rect x="364" y="152" width="196" height="26" rx="6" fill="rgba(6,6,6,0.65)" stroke={toneColor} strokeOpacity="0.65" />
          <text x="376" y="169" fill={toneColor} fontSize="10.5" fontFamily="var(--mono)">
            {active.signal.slice(0, 31)}
          </text>
          <text x="364" y="201" fill="#6ee7a8" fontSize="10.5" fontFamily="var(--mono)">
            ✓ 0 prompts · 0 code · 0 secrets sent
          </text>

          {/* Track: Local Shield -> EU Cloud Monitor */}
          <path d="M 580 142 L 664 142" fill="none" stroke="#3fd8ca" strokeWidth="2" strokeDasharray="6 6" className="agm-flow-slow" />
          <circle r="3.5" fill="#3fd8ca" filter="url(#agmGlow)">
            <animateMotion dur="2.2s" repeatCount="indefinite" path="M 580 142 L 664 142" />
          </circle>

          {/* Privacy boundary divider label */}
          <rect x="594" y="110" width="56" height="20" rx="5" fill="#060606" stroke="#3a3a40" />
          <text x="622" y="123" textAnchor="middle" fill="#9a9aa4" fontSize="9.5" fontFamily="var(--mono)">
            META
          </text>

          {/* Right Zone: EU Fleet & Instant Alerts */}
          <rect x="664" y="18" width="280" height="244" rx="14" fill="#111111" stroke="#2d2d32" />
          <text x="682" y="42" fill="#3fd8ca" fontSize="11" fontFamily="var(--mono)" letterSpacing="1.2">
            {de ? "EU-CLOUD (DE) · ALERTS & FLOTTE" : "EU CLOUD (DE) · FLEET & ALERTS"}
          </text>

          {/* Alert Card inside SVG */}
          <rect x="682" y="62" width="244" height="96" rx="10" fill="#18181b" stroke={toneColor} strokeWidth="1.2" />
          <circle cx="698" cy="82" r="4" fill={toneColor} className="agm-pulse" />
          <text x="710" y="86" fill="#f0f0f0" fontSize="12" fontWeight="600" fontFamily="var(--display)">
            {active.alertTitle.slice(0, 34)}
          </text>
          <text x="694" y="108" fill="#c4c4c8" fontSize="10.5" fontFamily="var(--body)">
            {active.agent}
          </text>
          <text x="694" y="126" fill="#9a9aa4" fontSize="10" fontFamily="var(--mono)">
            {active.cloudNote.slice(0, 38)}
          </text>
          <text x="694" y="146" fill="#6ee7a8" fontSize="10.5" fontWeight="600" fontFamily="var(--mono)">
            {active.metric}
          </text>

          {/* Alert channel pills */}
          {["Telegram", "Slack", "Discord", "MCP"].map((ch, idx) => (
            <g key={ch} transform={`translate(${682 + idx * 62}, 174)`}>
              <rect width="56" height="24" rx="6" fill="rgba(63,216,202,0.1)" stroke="rgba(63,216,202,0.3)" />
              <text x="28" y="15.5" textAnchor="middle" fill="#9aeee4" fontSize="10" fontFamily="var(--mono)">{ch}</text>
            </g>
          ))}

          <text x="682" y="226" fill="#9a9aa4" fontSize="10.5" fontFamily="var(--mono)">
            {de ? "Free-Plan inkl. Telegram/Slack/Discord" : "Free plan includes Telegram, Slack & Discord"}
          </text>
          <text x="682" y="244" fill="#c4c4c8" fontSize="10.5" fontFamily="var(--mono)">
            GET /api/agents/fleet · MCP get_fleet_status
          </text>
        </svg>

        <div className="agm-footer">
          <code className="agm-term">{active.terminalLine}</code>
          <p className="agm-alert-copy">
            <strong>{active.alertTitle}:</strong> {active.alertBody}
          </p>
        </div>
      </div>
    </div>
  );
}
