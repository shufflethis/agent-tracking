import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/DashboardShell";
import { agentCopy } from "@/lib/agents/copy";
import { duration, every, STATUS_CHIP, when } from "@/lib/agents/format";
import { agentById, agentRuns } from "@/lib/agents/store";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";

export const metadata: Metadata = { title: "Agent", robots: { index: false, follow: false } };
export const runtime = "nodejs";

const PROBLEM = new Set(["failed", "hung", "missed"]);

export default async function Page({ params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;
  const account = await requireAccount(`/app/fleet/${encodeURIComponent(agentId)}`);
  const agent = agentById(account.email, agentId);
  const runs = agent ? agentRuns(account.email, agentId) : null;
  if (!agent || !runs) redirect("/app/fleet");
  const lang = dashLang(account.lang);
  const c = agentCopy(lang).fleet;

  return (
    <DashboardShell account={account} area="fleet" title={agent.name}>
      <section className="shell section" style={{ paddingTop: 32 }}>
        <p style={{ marginTop: 0 }}>
          <Link href="/app/fleet">← {c.back}</Link>
          <span style={{ color: "var(--muted)", marginLeft: 12 }}>
            {c.kinds[agent.kind]} · {agent.host}{agent.expectEveryMs ? ` · ${c.expected(every(agent.expectEveryMs))}` : ""}
          </span>
        </p>
        <h2 style={{ fontSize: 22 }}>{c.runs}</h2>
        <div className="tablewrap">
          <table>
            <thead><tr><th>{c.runCols.started}</th><th>{c.runCols.duration}</th><th>{c.runCols.status}</th><th>{c.runCols.detail}</th></tr></thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{when(r.startedAt, lang)}</td>
                  <td>{duration(r.durationMs ?? (r.endedAt ? r.endedAt - r.startedAt : null))}</td>
                  <td><span className={STATUS_CHIP[r.status]}>{c.status[r.status]}</span></td>
                  <td>
                    {agent.kind === "claude" ? c.detail(r.turns, r.toolCalls, r.toolErrors) : c.exit(r.exitCode)}
                    {r.tail && PROBLEM.has(r.status) ? <pre className="code" style={{ marginTop: 8, whiteSpace: "pre-wrap", fontSize: 12 }}>{r.tail}</pre> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </DashboardShell>
  );
}
