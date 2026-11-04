import type { Metadata } from "next";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import AgentConnectionScope from "@/components/AgentConnectionScope";
import { agentCopy } from "@/lib/agents/copy";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";

export const metadata: Metadata = { title: "Connect a machine", robots: { index: false, follow: false } };
export const runtime = "nodejs";

/**
 * Device login in one step: the person types the code from their terminal and
 * the form posts it straight to the approval. Nothing on this page is taken
 * from the URL, so a link someone sends you cannot connect their machine to
 * your account (old CLI links with ?code= land on the empty form).
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ result?: string; host?: string }> }) {
  const { result, host } = await searchParams;
  const account = await requireAccount("/app/connect");
  const lang = dashLang(account.lang);
  const c = agentCopy(lang).connect;
  const outcome = result === "approved" || result === "expired" || result === "unknown" ? c[result] : null;

  return (
    <DashboardShell account={account} area="fleet" title={c.title}>
      <section className="shell section" style={{ paddingTop: 32, maxWidth: 640 }}>
        {outcome && result === "approved" ? (
          <>
            <p>{host ? c.approvedHost(host.slice(0, 80)) : outcome}</p>
            <p><Link className="btn" href="/app/fleet">{c.toFleet}</Link></p>
          </>
        ) : (
          <form method="post" action="/api/agents/device/approve">
            {outcome ? <p role="alert">{outcome}</p> : null}
            <p>{c.enter}</p>
            <label htmlFor="code" style={{ display: "block", fontSize: 14, marginBottom: 6 }}>{c.codeLabel}</label>
            <input className="field" id="code" name="code" autoComplete="off" autoCapitalize="characters" spellCheck={false} required placeholder="ABCD-EFGH"
              style={{ fontFamily: "var(--mono, monospace)", fontSize: 22, letterSpacing: 2, width: "100%", maxWidth: 280, marginBottom: 14 }} />
            <p style={{ color: "var(--muted)", fontSize: 14 }}>{c.sends}</p>
            <p style={{ color: "var(--ink-2)", fontSize: 14 }}>{c.notYours}</p>
            <div><button className="btn" type="submit">{c.confirm}</button></div>
          </form>
        )}
        <AgentConnectionScope lang={lang} />
      </section>
    </DashboardShell>
  );
}
