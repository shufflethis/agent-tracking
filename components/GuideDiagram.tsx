/**
 * Crisp technical SVG diagrams embedded inside high-intent guides.
 * Pure inline SVG + CSS animation tokens so every guide renders rich visual
 * architecture with zero layout shift and fast LCP.
 */

export type DiagramKind = "hooks-flow" | "cost-breaker" | "mcp-drift" | "monitoring-matrix" | "cron-watchdog";

export default function GuideDiagram({ kind, lang }: { kind: DiagramKind; lang: "en" | "de" }) {
  const de = lang === "de";

  if (kind === "hooks-flow") {
    return (
      <figure className="gdiag">
        <svg viewBox="0 0 820 210" role="img" aria-label={de ? "Claude Code Hook-Lebenszyklus" : "Claude Code hook lifecycle"}>
          <rect x="8" y="8" width="804" height="194" rx="12" fill="#111111" stroke="#262629" />
          {[
            { x: 28, title: "PreToolUse", sub: de ? "Lokaler Guard" : "Local Guard", col: "#3fd8ca", note: de ? "Stoppt rm -rf & Loops" : "Blocks rm -rf & loops" },
            { x: 222, title: "PostToolUseFailure", sub: de ? "Fehlerzähler" : "Failure Counter", col: "#ff6b6b", note: de ? "5× Fehler → Pause" : "5× fails → Pause" },
            { x: 416, title: "Notification", sub: de ? "Wartet auf Ja" : "Waiting on You", col: "#f0c14b", note: de ? "Sofort an Telegram" : "Instant Telegram ping" },
            { x: 610, title: "Stop / SessionEnd", sub: de ? "Lauf beendet" : "Run Summary", col: "#6ee7a8", note: de ? "Morgen-Briefing" : "Morning briefing" },
          ].map((b, i) => (
            <g key={b.title}>
              <rect x={b.x} y="42" width="176" height="122" rx="10" fill="#18181b" stroke={b.col} strokeWidth="1.4" />
              <text x={b.x + 14} y="68" fill={b.col} fontSize="12" fontFamily="var(--mono)" fontWeight="600">{b.title}</text>
              <text x={b.x + 14} y="94" fill="#f0f0f0" fontSize="14" fontFamily="var(--display)" fontWeight="700">{b.sub}</text>
              <text x={b.x + 14} y="122" fill="#c4c4c8" fontSize="11.5" fontFamily="var(--body)">{b.note}</text>
              <text x={b.x + 14} y="148" fill="#9a9aa4" fontSize="10" fontFamily="var(--mono)">{de ? "0 Prompts gesendet" : "0 prompts sent"}</text>
              {i < 3 ? <path d={`M ${b.x + 176} 103 L ${b.x + 194} 103`} stroke="#3fd8ca" strokeWidth="2" className="agm-flow" /> : null}
            </g>
          ))}
        </svg>
        <figcaption>{de ? "Deterministischer Claude-Code-Hook-Fluss: lokale Schutzregeln vor der Ausführung, sofortige Status-Meldung ohne Prompt-Upload." : "Deterministic Claude Code hook pipeline: local enforcement before tool execution, instant status routing without uploading prompts."}</figcaption>
      </figure>
    );
  }

  if (kind === "cost-breaker") {
    return (
      <figure className="gdiag">
        <svg viewBox="0 0 820 220" role="img" aria-label={de ? "Kostenkurve ohne vs. mit Circuit Breaker" : "Token burn curve without vs with circuit breaker"}>
          <rect x="8" y="8" width="804" height="204" rx="12" fill="#111111" stroke="#262629" />
          <line x1="60" y1="176" x2="770" y2="176" stroke="#3a3a40" strokeWidth="1.2" />
          <line x1="60" y1="30" x2="60" y2="176" stroke="#3a3a40" strokeWidth="1.2" />
          <text x="66" y="42" fill="#9a9aa4" fontSize="10.5" fontFamily="var(--mono)">{de ? "API-Kosten / Tool-Calls über Nacht" : "API Cost / Tool Calls Overnight"}</text>
          {/* Unprotected exponential spike */}
          <path d="M 60 170 Q 260 160, 420 110 T 750 36" fill="none" stroke="#ff6b6b" strokeWidth="2.5" strokeDasharray="6 4" />
          <text x="530" y="54" fill="#ff6b6b" fontSize="12" fontFamily="var(--mono)">{de ? "Ohne Guard: $60–$180+ Retry-Spirale" : "Unprotected: $60–$180+ retry spiral"}</text>
          {/* Protected flatline after breaker */}
          <path d="M 60 170 Q 170 164, 240 142 L 750 142" fill="none" stroke="#3fd8ca" strokeWidth="3" />
          <line x1="240" y1="32" x2="240" y2="176" stroke="#8b3fca" strokeWidth="1.8" strokeDasharray="4 4" />
          <circle cx="240" cy="142" r="6" fill="#3fd8ca" className="agm-pulse" />
          <rect x="254" y="106" width="278" height="28" rx="6" fill="#18181b" stroke="#3fd8ca" />
          <text x="266" y="124" fill="#9aeee4" fontSize="11" fontFamily="var(--mono)">guard trips @ 5 failures / 80 calls</text>
          <text x="540" y="160" fill="#6ee7a8" fontSize="11.5" fontFamily="var(--mono)">{de ? "Mit Guard: Kosten gedeckelt (< $2)" : "With Guard: Spend capped (< $2)"}</text>
        </svg>
        <figcaption>{de ? "Vergleich einer ungeschützten Retry-Spirale mit einer lokalen PreToolUse-Kostenbremse (max-failures 5, max-calls 80, max-minutes 45)." : "Comparison of an unprotected overnight retry spiral versus a local PreToolUse spend fuse (max-failures 5, max-calls 80, max-minutes 45)."}</figcaption>
      </figure>
    );
  }

  if (kind === "mcp-drift") {
    return (
      <figure className="gdiag">
        <svg viewBox="0 0 820 210" role="img" aria-label={de ? "Zero-Prompt MCP Sicherheits- und Drift-Architektur" : "Zero-prompt MCP security and drift architecture"}>
          <rect x="8" y="8" width="804" height="194" rx="12" fill="#111111" stroke="#262629" />
          <rect x="28" y="34" width="236" height="142" rx="10" fill="#18181b" stroke="#2d2d32" />
          <text x="44" y="58" fill="#3fd8ca" fontSize="11" fontFamily="var(--mono)">1. LOCAL CONFIGS</text>
          <text x="44" y="82" fill="#f0f0f0" fontSize="13" fontFamily="var(--mono)">.mcp.json · ~/.claude.json</text>
          <text x="44" y="104" fill="#c4c4c8" fontSize="12" fontFamily="var(--mono)">.cursor/mcp.json · CLAUDE.md</text>
          <text x="44" y="132" fill="#f0c14b" fontSize="11.5" fontFamily="var(--body)">{de ? "Prüft: unpinned npx, http://, Wildcards" : "Checks: unpinned npx, http://, wildcards"}</text>
          <text x="44" y="158" fill="#6ee7a8" fontSize="10.5" fontFamily="var(--mono)">{de ? "Secrets bleiben 100 % lokal" : "Secrets stay 100% local"}</text>

          <path d="M 264 105 L 304 105" stroke="#3fd8ca" strokeWidth="2" className="agm-flow" />

          <rect x="304" y="34" width="220" height="142" rx="10" fill="#18181b" stroke="#8b3fca" strokeWidth="1.6" />
          <text x="320" y="58" fill="#a870e0" fontSize="11" fontFamily="var(--mono)">2. SHA-256 FINGERPRINT</text>
          <text x="320" y="86" fill="#f0f0f0" fontSize="14" fontFamily="var(--display)" fontWeight="700">{de ? "Drift-Vergleich" : "Drift Comparison"}</text>
          <text x="320" y="112" fill="#c4c4c8" fontSize="11.5" fontFamily="var(--body)">{de ? "Erkennt neue MCP-Server, geänderte Regeln & Erst-Tools." : "Flags added MCP servers, altered rules & first-time tools."}</text>
          <text x="320" y="156" fill="#9a9aa4" fontSize="10.5" fontFamily="var(--mono)">hash(config) != prev_hash</text>

          <path d="M 524 105 L 564 105" stroke="#3fd8ca" strokeWidth="2" className="agm-flow" />

          <rect x="564" y="34" width="228" height="142" rx="10" fill="#18181b" stroke="#ff6b6b" strokeWidth="1.4" />
          <text x="580" y="58" fill="#ff6b6b" fontSize="11" fontFamily="var(--mono)">3. TEAM ALERT &amp; AUDIT</text>
          <text x="580" y="86" fill="#f0f0f0" fontSize="14" fontFamily="var(--display)" fontWeight="700">{de ? "Sofort-Meldung" : "Instant Drift Alert"}</text>
          <text x="580" y="112" fill="#c4c4c8" fontSize="11.5" fontFamily="var(--body)">{de ? "Slack / Telegram / Webhook + DSGVO-konformer EU-Audit-Stand." : "Slack / Telegram / Webhook + GDPR-safe EU audit record."}</text>
          <text x="580" y="156" fill="#6ee7a8" fontSize="10.5" fontFamily="var(--mono)">EU / DE Server · AGPL-3.0</text>
        </svg>
        <figcaption>{de ? "Wie Zero-Prompt-MCP-Auditing funktioniert: Nur kryptografische Fingerabdrücke und Zähler verlassen den Entwickler-Rechner." : "How zero-prompt MCP auditing works: only cryptographic fingerprints and sanitized counts leave the developer machine."}</figcaption>
      </figure>
    );
  }

  if (kind === "cron-watchdog") {
    return (
      <figure className="gdiag">
        <svg viewBox="0 0 820 190" role="img" aria-label={de ? "Cron Watchdog Zeitstrahl" : "Cron watchdog timeline"}>
          <rect x="8" y="8" width="804" height="174" rx="12" fill="#111111" stroke="#262629" />
          <line x1="48" y1="98" x2="772" y2="98" stroke="#3a3a40" strokeWidth="2" />
          {[
            { x: 96, t: "03:00 Day 1", s: "OK (42s)", col: "#6ee7a8" },
            { x: 296, t: "03:00 Day 2", s: "OK (45s)", col: "#6ee7a8" },
            { x: 496, t: "03:00 Day 3", s: de ? "FEHLT (kein Start)" : "MISSED (no start)", col: "#ff6b6b" },
            { x: 696, t: "03:15 Day 3", s: de ? "Alert ausgelöst" : "Alert fired", col: "#f0c14b" },
          ].map((pt) => (
            <g key={pt.t}>
              <circle cx={pt.x} cy="98" r="8" fill={pt.col} className={pt.col !== "#6ee7a8" ? "agm-pulse" : undefined} />
              <text x={pt.x} y="68" textAnchor="middle" fill="#f0f0f0" fontSize="12" fontFamily="var(--mono)">{pt.t}</text>
              <text x={pt.x} y="132" textAnchor="middle" fill={pt.col} fontSize="11.5" fontFamily="var(--mono)" fontWeight="600">{pt.s}</text>
            </g>
          ))}
        </svg>
        <figcaption>{de ? "Dead-Man's-Switch mit --every 24h: Bleibt ein geplanter Lauf aus oder hängt er fest, meldet der Server automatisch." : "Dead-man's-switch with --every 24h: if a scheduled run never starts or hangs silently, the server raises an alert automatically."}</figcaption>
      </figure>
    );
  }

  return (
    <figure className="gdiag">
      <svg viewBox="0 0 820 200" role="img" aria-label={de ? "Monitoring-Schichten im Vergleich" : "Agent monitoring layers"}>
        <rect x="8" y="8" width="804" height="184" rx="12" fill="#111111" stroke="#262629" />
        {[
          { y: 30, label: "Layer 1 · Local Guardrails", desc: de ? "PreToolUse-Bremse gegen Loops & destruktive Befehle (<2 ms)" : "PreToolUse fuse against loops & destructive commands (<2 ms)", col: "#3fd8ca" },
          { y: 80, label: "Layer 2 · Lifecycle & Heartbeats", desc: de ? "Stuck, Waiting, Missed Cron, Exit-Code über alle Harnesses" : "Stuck, waiting, missed cron & exit codes across every harness", col: "#8b3fca" },
          { y: 130, label: "Layer 3 · Config & MCP Drift + OTLP", desc: de ? "Zero-Prompt-Fingerprints, neue Tools, Team-Alerts & MCP-Abfrage" : "Zero-prompt fingerprints, first-time tools, team alerts & MCP query", col: "#6ee7a8" },
        ].map((l) => (
          <g key={l.label}>
            <rect x="28" y={l.y} width="764" height="40" rx="8" fill="#18181b" stroke={l.col} strokeWidth="1.2" />
            <text x="44" y={l.y + 24} fill={l.col} fontSize="12.5" fontFamily="var(--mono)" fontWeight="600">{l.label}</text>
            <text x="315" y={l.y + 24} fill="#e4e4e7" fontSize="12.5" fontFamily="var(--body)">{l.desc}</text>
          </g>
        ))}
      </svg>
      <figcaption>{de ? "Die drei Ebenen produktiver Agent-Kontrolle ohne Prompt-Exfiltration." : "The three layers of production coding-agent control without exfiltrating prompts."}</figcaption>
    </figure>
  );
}
