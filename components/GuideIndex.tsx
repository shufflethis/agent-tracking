import Link from "next/link";
import { guides } from "@/lib/guides";
import type { DashLang } from "@/lib/tracking/copy";

export default function GuideIndex({ lang }: { lang: DashLang }) {
  const de = lang === "de";
  const base = de ? "/de/guides" : "/guides";
  const all = guides(lang);
  const agentGuides = all.filter((g) => g.category === "agents");
  const websiteGuides = all.filter((g) => g.category !== "agents");

  return (
    <section className="shell section" style={{ paddingTop: 56 }}>
      <div className="pagehead" style={{ marginBottom: 30 }}>
        <p className="eyebrow">{de ? "Engineering Guides" : "Engineering guides"}</p>
        <h1 style={{ fontSize: "clamp(27px,4.4vw,44px)", marginBottom: 16 }}>
          {de ? "Guardrails, MCP-Sicherheit & Agent-Monitoring" : "Guardrails, MCP security & coding-agent monitoring"}
        </h1>
        <p className="dek" style={{ maxWidth: "62ch", margin: 0 }}>
          {de
            ? "Praxis-Anleitungen mit fertigen Hook-Configs, Kosten-Tabellen, Sicherheits-Checklisten und Open-Source-CLI-Befehlen für Claude Code, Cursor, Codex, Gemini, Antigravity und Cron-Jobs."
            : "Hands-on playbooks with deterministic hook configs, cost-cap math, MCP security checklists, and open-source CLI recipes for Claude Code, Cursor, Codex, Gemini, Antigravity, and cron jobs."}
        </p>
      </div>

      <div className="grid2" style={{ gap: 18, marginBottom: 36 }}>
        {agentGuides.map((g) => (
          <Link key={g.slug} href={`${base}/${g.slug}`} className="card hguide-link" style={{ padding: 24 }}>
            <p className="eyebrow" style={{ marginTop: 0 }}>{de ? "Flagship-Guide · 2026" : "Flagship playbook · 2026"}</p>
            <h2 style={{ fontSize: 22, marginBottom: 10 }}>{g.question}</h2>
            <p style={{ margin: 0, fontSize: 14.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{g.summary}</p>
          </Link>
        ))}
      </div>

      <div className="callout mid" style={{ marginBottom: 36 }}>
        <span className="tag">{de ? "Erst klicken, dann installieren" : "Click before you install"}</span>
        <p style={{ margin: 0 }}>
          {de ? "Sieh dir blockierte Loops, MCP-Drift und Zero-Prompt-Timelines direkt im Browser an: " : "Inspect blocked loops, MCP drift, and zero-prompt timelines directly in your browser: "}
          <Link href={de ? "/de/demo/fleet" : "/demo/fleet"} style={{ fontWeight: 600 }}>
            {de ? "Interaktive Live-Demo öffnen (kein Login) →" : "Open interactive live demo (no login) →"}
          </Link>
        </p>
      </div>

      <details className="guide-legacy">
        <summary>
          {de
            ? `Archiv: Kostenloses Website-AI-Analytics-Tool (${websiteGuides.length} Guides)`
            : `Archive: Free Website AI Analytics tool (${websiteGuides.length} guides)`}
        </summary>
        <div className="grid2" style={{ gap: 16 }}>
          {websiteGuides.map((g) => (
            <Link key={g.slug} href={`${base}/${g.slug}`} className="card" style={{ padding: 20, display: "block" }}>
              <h2 style={{ fontSize: 18, marginBottom: 6 }}>{g.question}</h2>
              <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2)", lineHeight: 1.55 }}>
                {g.summary.length > 180 ? g.summary.slice(0, 177).replace(/\s+\S*$/, "") + "…" : g.summary}
              </p>
            </Link>
          ))}
        </div>
      </details>
    </section>
  );
}
