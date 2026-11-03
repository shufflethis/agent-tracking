import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import DashboardShell from "@/components/DashboardShell";
import { agentCopy } from "@/lib/agents/copy";
import { CONNECT_CLAUDE, HEALTH_CHIP, WRAP_EXAMPLE, when } from "@/lib/agents/format";
import { runLabel } from "@/lib/agents/run-display";
import { listAgents } from "@/lib/agents/store";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";

export const metadata: Metadata = { title: "Your agents", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page() {
  const account = await requireAccount("/app/fleet");
  const lang = dashLang(account.lang);
  const c = agentCopy(lang).fleet;
  const agents = listAgents(account.email);

  return (
    <DashboardShell account={account} area="fleet" title={c.title}>
      <section className="shell section" style={{ paddingTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "baseline", marginBottom: 20 }}>
          <p className="dek" style={{ margin: 0, maxWidth: 640 }}>{c.intro}</p>
          <div style={{ display: "flex", gap: 20 }}><Link href="/app/fleet/telemetry">OpenTelemetry</Link><Link href="/app/fleet/settings">{c.settings}</Link></div>
        </div>
        {agents.length ? (
          <div className="tablewrap" style={{ marginBottom: 28 }}>
            <table>
              <thead>
                <tr><th>{c.cols.agent}</th><th>{c.cols.host}</th><th>{c.cols.kind}</th><th>{c.cols.status}</th><th>{c.cols.last}</th></tr>
              </thead>
              <tbody>
                {agents.map((a) => (
                  <tr key={a.id}>
                    <td><Link href={`/app/fleet/${a.id}`}>{a.name}</Link></td>
                    <td>{a.host}</td>
                    <td>{c.kinds[a.kind]}</td>
                    <td>
                      <span className={HEALTH_CHIP[a.health]}>{a.lastRun && a.health === "running" ? runLabel(a.lastRun, lang) : c.health[a.health]}</span>
                      {a.lastRun && a.health === "problem" ? <span style={{ marginLeft: 8, fontSize: 13, color: "var(--muted)" }}>{runLabel(a.lastRun, lang)}</span> : null}
                    </td>
                    <td>{a.lastRun ? when(a.lastRun.startedAt, lang) : c.never}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>{agents.length ? c.connectMore : c.emptyTitle}</h2>
          <p style={{ color: "var(--ink-2)" }}>{c.emptyIntro}</p>
          {[[c.claudeStep, CONNECT_CLAUDE], [c.cronStep, WRAP_EXAMPLE]].map(([label, command]) => (
            <div key={command} style={{ marginTop: 16 }}>
              <p style={{ margin: "0 0 6px", fontSize: 14 }}>{label}</p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <code className="mono" style={{ overflowX: "auto", maxWidth: "100%" }}>{command}</code>
                <CopyButton text={command} label={c.copy} copiedLabel={c.copied} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
