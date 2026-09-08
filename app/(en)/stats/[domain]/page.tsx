import { SITE_HOST, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BarChart from "@/components/BarChart";
import ShareBar from "@/components/ShareBar";
import { normalizeDomain } from "@/lib/tracking/classify";
import { interactions, loadDashboard } from "@/lib/tracking/dashboard";
import { getSite } from "@/lib/tracking/db";
import { snippetFor } from "@/lib/tracking/snippet";

// Rendered per request, not at build: the host, the entity on the legal pages and the
// snippet line come from the environment, and a self-hosted copy must print its own.
export const dynamic = "force-dynamic";

export const runtime = "nodejs";
export const revalidate = 600;

type Params = { params: Promise<{ domain: string }> };

/**
 * The opt-in public stats page: one number, one chart, a share image.
 *
 * Exists only for a site whose owner switched it on; every other domain is a
 * 404, not a "this site has not published its stats" page, because the second
 * would still be a page about a stranger's domain that they never asked for.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { domain } = await params;
  const host = normalizeDomain(decodeURIComponent(domain));
  const site = host ? getSite(host) : null;
  if (!site || !site.public_share) return { title: "Stats", robots: { index: false } };
  const n = interactions(loadDashboard(site.domain, 30).overview);
  const title = `${site.domain}: ${n.toLocaleString("en-GB")} AI agent interactions in 30 days`;
  const description = `AI referrals, AI fetches, WebMCP tool calls and agent conversions on ${site.domain}, measured by ${SITE_HOST}. Cookieless, no personal data.`;
  return {
    title,
    description,
    alternates: { canonical: `/stats/${encodeURIComponent(site.domain)}` },
    openGraph: { title, description, url: `${SITE_ORIGIN}/stats/${encodeURIComponent(site.domain)}`, type: "website", siteName: SITE_NAME },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Page({ params }: Params) {
  const { domain } = await params;
  const host = normalizeDomain(decodeURIComponent(domain));
  const site = host ? getSite(host) : null;
  if (!site || !site.public_share) notFound();
  const dash = loadDashboard(site.domain, 30);
  const o = dash.overview;
  const n = interactions(o);
  const url = `${SITE_ORIGIN}/stats/${encodeURIComponent(site.domain)}`;

  return (
    <>
      <section className="shell" style={{ paddingTop: 56, paddingBottom: 8 }}>
        <div className="pagehead" style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Agent Tracking</p>
          <h1 style={{ fontSize: "clamp(26px,4vw,40px)", marginBottom: 8, wordBreak: "break-word" }}>{site.domain}</h1>
          <p className="dek" style={{ margin: 0, maxWidth: "56ch" }}>
            <b style={{ color: "var(--ink)" }}>{n.toLocaleString("en-GB")}</b> AI agent interactions in the last 30 days: visitors sent by assistants, pages fetched by assistants,
            WebMCP tools called, goals reached.
          </p>
        </div>
        <div className="card" style={{ padding: 28, display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          {[
            ["AI referrals", o.totals.referrals],
            ["AI fetches", o.totals.fetches],
            ["Tool calls", o.totals.calls],
            ["Conversions", o.totals.conversions],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="smallcaps" style={{ margin: "0 0 6px" }}>{label}</p>
              <p style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 30, margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="shell section" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 28 }}>
          <BarChart
            days={o.days.map((d) => d.day)}
            series={[
              { key: "referrals", label: "AI referrals", color: "var(--cyan)", values: o.days.map((d) => d.referrals) },
              { key: "fetches", label: "AI fetches", color: "var(--soft-violet)", values: o.days.map((d) => d.fetches) },
              { key: "calls", label: "Tool calls", color: "var(--good)", values: o.days.map((d) => d.calls) },
              { key: "conversions", label: "Conversions", color: "var(--warn)", values: o.days.map((d) => d.conversions) },
            ]}
          />
        </div>
      </section>
      <section className="shell section" style={{ paddingTop: 0 }}>
        <div className="grid2" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 28 }}>
            <p className="smallcaps" style={{ marginBottom: 12 }}>Agents, 30 days</p>
            {dash.agents.length === 0 ? (
              <p style={{ color: "var(--muted)", margin: 0 }}>No agent seen yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                {dash.agents.slice(0, 8).map((a) => (
                  <li key={a.id + a.kind} style={{ position: "relative", display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 10px", fontSize: 14, borderRadius: 6, overflow: "hidden" }}>
                    <span aria-hidden="true" style={{ position: "absolute", inset: 0, width: `${Math.max(2, Math.round(a.share * 100))}%`, background: "var(--cyan-12)", borderRadius: 6 }} />
                    <span style={{ position: "relative" }}>
                      {a.label} <span style={{ color: "var(--muted)", fontSize: 12 }}>{a.kind === "fetch" ? "fetch" : "referral"}</span>
                    </span>
                    <span style={{ position: "relative", fontFamily: "var(--mono)", color: "var(--ink-2)" }}>{a.count.toLocaleString("en-GB")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card" style={{ padding: 28 }}>
            <p className="smallcaps" style={{ marginBottom: 12 }}>Pages agents took, 30 days</p>
            {dash.pages.length === 0 ? (
              <p style={{ color: "var(--muted)", margin: 0 }}>No page fetched by an agent yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                {dash.pages.slice(0, 8).map((p) => (
                  <li key={p.path} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "7px 10px", fontSize: 14 }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.path}</span>
                    <span style={{ fontFamily: "var(--mono)", color: "var(--ink-2)" }}>{(p.fetches + p.calls).toLocaleString("en-GB")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
      <section className="shell section" style={{ paddingTop: 0 }}>
        <div className="card" style={{ padding: 28, maxWidth: 840 }}>
          <h2 style={{ fontSize: 22, marginBottom: 14 }}>Share</h2>
          <ShareBar
            url={url}
            text={`${site.domain} had ${n.toLocaleString("en-GB")} AI agent interactions in 30 days, measured with ${SITE_HOST}:`}
            labels={{ x: "Share on X", linkedin: "Share on LinkedIn", copy: "Copy link", copied: "Link copied" }}
          />
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "18px 0 0" }}>
            Measured with one line of script, no cookies and no personal data. <Link href="/docs">How it works</Link>, or add it to your own site:
          </p>
          <pre className="code" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", marginTop: 10 }}>{snippetFor("your-site.com")}</pre>
        </div>
      </section>
    </>
  );
}
