import { GITHUB_URL, SITE_HOST, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BarChart from "@/components/BarChart";
import ShareBar from "@/components/ShareBar";
import { normalizeDomain } from "@/lib/tracking/classify";
import { activitySignals, loadDashboard } from "@/lib/tracking/dashboard";
import { getSite, hasFreshLogSource, ingestHealth } from "@/lib/tracking/db";
import { dataState } from "@/lib/tracking/data-state";
import { snippetFor } from "@/lib/tracking/snippet";

// Rendered per request, not at build: the host, the entity on the legal pages and the
// snippet line come from the environment, and a self-hosted copy must print its own.
export const dynamic = "force-dynamic";

export const runtime = "nodejs";
export const revalidate = 600;

type Params = { params: Promise<{ domain: string }> };
const stateText = { active: "active", not_configured: "not configured", no_data_yet: "no data yet", source_stale: "source stale", quota_reached: "event quota reached" };

function measurementState(site: NonNullable<ReturnType<typeof getSite>>) {
  const health = ingestHealth(site.domain, 30);
  return dataState(site, { acceptedBeacons: health.find((r) => r.outcome === "accepted_batch")?.count ?? 0, quotaGaps: health.find((r) => r.outcome === "quota_reached")?.count ?? 0, logFresh: hasFreshLogSource(site.domain), windowDays: 30, now: Date.now() });
}

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
  const n = activitySignals(loadDashboard(site.domain, 30).overview);
  const state = measurementState(site);
  const title = state !== "active" && n === 0 ? `${site.domain}: ${stateText[state]}` : `${site.domain}: ${n.toLocaleString("en-GB")} activity signals in 30 days`;
  const description = `AI referral, fetch and observed tool-call signals on ${site.domain}, measured by ${SITE_HOST}. Historical browser goal signals are unverified.`;
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
  const n = activitySignals(o);
  const state = measurementState(site);
  const unavailable = state !== "active" && n === 0;
  const url = `${SITE_ORIGIN}/stats/${encodeURIComponent(site.domain)}`;

  return (
    <>
      <section className="shell" style={{ paddingTop: 56, paddingBottom: 8 }}>
        <div className="pagehead" style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ marginBottom: 10 }}>Agent Tracking</p>
          <h1 style={{ fontSize: "clamp(26px,4vw,40px)", marginBottom: 8, wordBreak: "break-word" }}>{site.domain}</h1>
          <p className="dek" style={{ margin: 0, maxWidth: "56ch" }}>
            {unavailable ? `Measurement status: ${stateText[state]}. No observed zero can be stated for this period.` : <><b style={{ color: "var(--ink)" }}>{n.toLocaleString("en-GB")}</b> activity signals in the last 30 days: visitors referred by assistants, historical fetch claims, IP-confirmed crawler requests, WebMCP tools called, and unverified browser goal signals.</>}
          </p>
        </div>
        <div className="card" style={{ padding: 28, display: "grid", gap: 28, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))" }}>
          {[
            ["AI referrals", o.totals.referrals],
            ["IP-confirmed fetches", o.totals.verifiedFetches],
            ["Legacy fetch claims", o.totals.fetches],
            ["Tool calls", o.totals.calls],
            ["Unverified goal signals", o.totals.conversions],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <p className="smallcaps" style={{ margin: "0 0 6px" }}>{label}</p>
              <p style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 30, margin: 0 }}>{unavailable && value === 0 ? "–" : value}</p>
            </div>
          ))}
        </div>
      </section>
      {!unavailable && <section className="shell section" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 28 }}>
          <BarChart
            days={o.days.map((d) => d.day)}
            series={[
              { key: "referrals", label: "AI referrals", color: "var(--cyan)", values: o.days.map((d) => d.referrals) },
              { key: "fetches", label: "Legacy fetch claims", color: "var(--soft-violet)", values: o.days.map((d) => d.fetches) },
              { key: "verifiedFetches", label: "IP-confirmed fetches", color: "var(--cyan)", values: o.days.map((d) => d.verifiedFetches) },
              { key: "calls", label: "Tool calls", color: "var(--good)", values: o.days.map((d) => d.calls) },
              { key: "conversions", label: "Unverified goal signals", color: "var(--warn)", values: o.days.map((d) => d.conversions) },
            ]}
          />
        </div>
      </section>}
      <section className="shell section" style={{ paddingTop: 0 }}>
        <div className="grid2" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 26 }}>
            <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>About these public numbers</h2>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              The site owner published selected 30-day aggregates: identifiable referrals, crawler claims and verified fetches, observed browser tool calls and unverified goal signals. They describe different events and must not be added as unique agents or completed tasks.
            </p>
            {o.totals.fetches > 0 && o.totals.verifiedFetches === 0 && (
              <p style={{ color: "var(--warn)", margin: "12px 0 0" }}>
                The {o.totals.fetches.toLocaleString("en-GB")} legacy fetch claims have no per-request IP proof. The verified fetch count needs recent origin logs and supported, fresh vendor ranges.
              </p>
            )}
          </div>
          <div className="card" style={{ padding: 26 }}>
            <h2 style={{ fontSize: 20, margin: "0 0 10px" }}>The private workspace</h2>
            <p style={{ color: "var(--ink-2)", margin: 0 }}>
              Site owners and invited readers can inspect source coverage, tool errors, server-confirmed outcomes, deterministic task tests, documented fixes and protected reports. This public link grants access to none of those internal records.
            </p>
            <p style={{ display: "flex", gap: 16, flexWrap: "wrap", margin: "14px 0 0" }}>
              <Link href={`/app/${encodeURIComponent(site.domain)}`}>Open your dashboard</Link>
              <Link href="/docs#private-workflow">How the workflow works</Link>
              <a href={GITHUB_URL} rel="noopener">Open-source code</a>
            </p>
          </div>
        </div>
      </section>
      <section className="shell section" style={{ paddingTop: 0 }}>
        <div className="grid2" style={{ gap: 18 }}>
          <div className="card" style={{ padding: 28 }}>
            <p className="smallcaps" style={{ marginBottom: 12 }}>Agents, 30 days</p>
            {dash.agents.filter((a) => a.count > 0).length === 0 ? (
              <p style={{ color: "var(--muted)", margin: 0 }}>No agent seen yet.</p>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
                {dash.agents.filter((a) => a.count > 0).slice(0, 8).map((a) => (
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
        <div className="card mid" style={{ padding: 28, maxWidth: 840 }}>
          <h2 style={{ fontSize: 22, marginBottom: 14 }}>Share</h2>
          <ShareBar
            url={url}
            text={unavailable ? `${site.domain}: measurement ${stateText[state]} on ${SITE_HOST}:` : `${site.domain} had ${n.toLocaleString("en-GB")} activity signals in 30 days, measured with ${SITE_HOST}:`}
            labels={{ x: "Share on X", linkedin: "Share on LinkedIn", copy: "Copy link", copied: "Link copied" }}
          />
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "18px 0 0" }}>
            Browser signals use a script; verified fetches require an access log. No cookies are set, and privacy still needs a site-specific assessment. <Link href="/docs">How it works</Link>, or add it to your own site:
          </p>
          <pre className="code" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", marginTop: 10 }}>{snippetFor("your-site.com")}</pre>
        </div>
      </section>
    </>
  );
}
