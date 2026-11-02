import type { Metadata } from "next";
import Link from "next/link";
import DashboardShell from "@/components/DashboardShell";
import { agentCopy } from "@/lib/agents/copy";
import { deviceLoginInfo } from "@/lib/agents/tokens";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";

export const metadata: Metadata = { title: "Connect a machine", robots: { index: false, follow: false } };
export const runtime = "nodejs";

export default async function Page({ searchParams }: { searchParams: Promise<{ code?: string; result?: string }> }) {
  const { code = "", result } = await searchParams;
  const account = await requireAccount(`/app/connect?code=${encodeURIComponent(code)}`);
  const c = agentCopy(dashLang(account.lang)).connect;
  const info = code ? deviceLoginInfo(code) : null;
  const outcome = result === "approved" || result === "expired" || result === "unknown" ? c[result] : null;

  return (
    <DashboardShell account={account} title={c.title}>
      <section className="shell section" style={{ paddingTop: 32, maxWidth: 640 }}>
        {outcome ? (
          <>
            <p>{outcome}</p>
            <p><Link className="btn" href="/app/fleet">{c.toFleet}</Link></p>
          </>
        ) : info ? (
          <form method="post" action="/api/agents/device/approve">
            <p>{c.intro(info.hostLabel)}</p>
            <p style={{ fontFamily: "var(--mono, monospace)", fontSize: 28, letterSpacing: 2, margin: "20px 0" }}>{info.userCode}</p>
            <p style={{ color: "var(--muted)", fontSize: 14 }}>{c.sends}</p>
            <input type="hidden" name="code" value={info.userCode} />
            <button className="btn" type="submit">{c.confirm}</button>
          </form>
        ) : (
          <p>{c.missing}</p>
        )}
      </section>
    </DashboardShell>
  );
}
