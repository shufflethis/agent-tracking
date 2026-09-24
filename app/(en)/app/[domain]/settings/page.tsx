import type { Metadata } from "next";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";
import DashboardShell from "@/components/DashboardShell";
import { CheckoutButton, DigestToggle, LogUpload, RemoveButton, ShareToggle, TokenPanel, VerifyButton } from "@/components/SiteActions";
import { billingConfigured } from "@/lib/billing";
import { requireSite } from "@/lib/tracking/auth";
import { actionStrings, dashCopy, dashLang, numberLocale } from "@/lib/tracking/copy";
import { PLANS, planFor, priceIdFor } from "@/lib/tracking/plans";
import { snippetFor } from "@/lib/tracking/snippet";
import { SITE_ORIGIN } from "@/lib/site";
import { hasFreshLogSource, lastSiteCheck, logSourceStates } from "@/lib/tracking/db";

// Rendered per request, not at build: the host, the entity on the legal pages and the
// snippet line come from the environment, and a self-hosted copy must print its own.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
export const runtime = "nodejs";

const logCurl = (domain: string, comment: string) =>
  `${comment}\ncurl -sS -X POST ${SITE_ORIGIN}/api/logs/${domain} \\\n  -H "Authorization: Bearer wmt_your_token" \\\n  -H "Content-Type: text/plain" --data-binary @/var/log/nginx/access.log`;

export default async function Page({ params, searchParams }: { params: Promise<{ domain: string }>; searchParams: Promise<{ billing?: string }> }) {
  const { domain } = await params;
  const { billing } = await searchParams;
  const { account, site } = await requireSite(decodeURIComponent(domain));
  const lang = dashLang(account.lang);
  const c = dashCopy(lang).settings;
  const listCopy = dashCopy(lang).list;
  const a = actionStrings(lang);
  const nl = numberLocale(lang);
  const plan = planFor(account.plan);
  const snippet = snippetFor(site.domain);
  const docsHref = lang === "de" ? "/de/docs" : "/docs";
  const logSources = logSourceStates(site.domain);
  const logFresh = hasFreshLogSource(site.domain);
  const snippetCheck = lastSiteCheck(site.domain, "snippet");
  const extras = `${plan.manifestAlerts ? `, ${c.manifestAlerts}` : ""}${plan.whiteLabelBadge ? `, ${c.whiteLabel}` : ""}`;

  return (
    <DashboardShell account={account} site={site} view="settings">
      <section className="shell section" style={{ paddingTop: 32, display: "grid", gap: 18 }}>
        {billing === "done" ? (
          <div className="callout" style={{ marginBottom: 0 }}>
            <span className="tag">{c.paymentReceived}</span>
            <p style={{ marginBottom: 0 }}>{c.paymentNote}</p>
          </div>
        ) : null}

        <div className="card" id="install" style={{ padding: 28, scrollMarginTop: 20 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            {c.installTitle}
            <span className={`chip ${site.verified_at ? "pass" : "partial"}`} style={{ fontSize: 13, fontWeight: 500 }}>
              {site.verified_at ? listCopy.verified : listCopy.notVerified}
            </span>
          </h2>
          <p style={{ color: "var(--ink-2)", maxWidth: "62ch", marginBottom: 14 }}>
            {c.installText} <Link href={docsHref}>{c.docsLink}</Link>.
          </p>
          <pre className="code" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: 10 }}>{snippet}</pre>
          <CopyButton text={snippet} label={c.copySnippet} copiedLabel={c.copied} />
          <h3 style={{ fontSize: 18, margin: "24px 0 6px" }}>{c.verifyTitle}</h3>
          <p style={{ color: "var(--ink-2)", maxWidth: "62ch", marginBottom: 14 }}>{site.verified_at ? c.verifiedOn(new Date(site.verified_at).toISOString().slice(0, 10)) : c.verifyText}</p>
          <VerifyButton domain={site.domain} verified={Boolean(site.verified_at)} c={a} />
        </div>

        <div className="card" id="measurement" style={{ padding: 28, scrollMarginTop: 20 }}>
          <h2 style={{ fontSize: 22, marginBottom: 12 }}>{c.setupStatusTitle}</h2>
          <ul style={{ margin: 0, paddingLeft: 20, display: "grid", gap: 8, color: "var(--ink-2)" }}>
            <li>{site.verified_at ? c.verifiedOn(new Date(site.verified_at).toISOString().slice(0, 10)) : c.verifyText}</li>
            <li>{snippetCheck ? c.lastSnippetCheck(new Date(snippetCheck.attemptedAt).toISOString(), snippetCheck.success ? c.checkPassed : `${c.checkFailed}: ${snippetCheck.detailCode}`, snippetCheck.testId) : c.noSnippetCheck}</li>
            <li>{site.first_beacon_at ? c.firstBeacon(new Date(site.first_beacon_at).toISOString()) : c.noBeacon}</li>
            {site.last_beacon_at && <li>{c.lastBeacon(new Date(site.last_beacon_at).toISOString())}</li>}
            <li>{logFresh ? c.logFresh : c.logStale}</li>
            <li>{site.last_tool_call_at ? c.toolCapture(new Date(site.last_tool_call_at).toISOString()) : c.noToolCapture}</li>
            <li>{c.noOutcomeSource}</li>
          </ul>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>{c.shareTitle}</h2>
          <p style={{ color: "var(--ink-2)", maxWidth: "62ch", marginBottom: 14 }}>
            {c.shareText(site.domain)}
            {site.public_share ? (
              <>
                {" "}
                {c.shareOn} <Link href={`/stats/${encodeURIComponent(site.domain)}`}>{c.openIt}</Link>.
              </>
            ) : null}
          </p>
          <ShareToggle domain={site.domain} on={Boolean(site.public_share)} c={a} />
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>{c.planTitle}</h2>
          <p style={{ color: "var(--ink-2)", maxWidth: "62ch", marginBottom: 14 }}>
            {c.planLine(plan.name, c.sites(plan.domains === Infinity ? "unlimited" : plan.domains), plan.eventsPerMonth.toLocaleString(nl), plan.windowDays, extras)}
          </p>
          <div className="tablewrap" style={{ marginBottom: 16 }}>
            <table>
              <thead>
                <tr>
                  <th>{c.planCols.plan}</th>
                  <th>{c.planCols.sites}</th>
                  <th>{c.planCols.events}</th>
                  <th>{c.planCols.history}</th>
                  <th>{c.planCols.extras}</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(PLANS).map((p) => (
                  <tr key={p.id} style={p.id === plan.id ? { color: "var(--ink)", fontWeight: 600 } : undefined}>
                    <td>{p.name}</td>
                    <td>{p.domains === Infinity ? c.unlimited : p.domains}</td>
                    <td>{p.eventsPerMonth.toLocaleString(nl)}</td>
                    <td>{c.days(p.windowDays)}</td>
                    <td>{[p.manifestAlerts ? c.manifestAlerts : null, p.whiteLabelBadge ? c.whiteLabel : null].filter(Boolean).join(", ") || c.noExtras}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {billingConfigured() ? (
            <p style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: 0 }}>
              {plan.id === "free" && priceIdFor("pro") ? <CheckoutButton plan="pro" label={c.upgradePro} /> : null}
              {plan.id !== "agency" && priceIdFor("agency") ? <CheckoutButton plan="agency" label={c.upgradeAgency} /> : null}
            </p>
          ) : (
            <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{c.pilotNote}</p>
          )}
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>{c.apiTitle}</h2>
          <p style={{ color: "var(--ink-2)", maxWidth: "62ch", marginBottom: 14 }}>
            {c.apiText(site.domain)} <Link href={`${docsHref}#api`}>{c.docsLink}</Link>.
          </p>
          <TokenPanel
            hasToken={Boolean(account.api_token_hash)}
            existsLabel={dashCopy(lang).actions.tokenExists(account.api_token_created_at ? new Date(account.api_token_created_at).toISOString().slice(0, 10) : "")}
            c={a}
          />
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>{c.logTitle}</h2>
          <p style={{ color: "var(--ink-2)", maxWidth: "62ch", marginBottom: 14 }}>
            {c.logText}
            {site.log_since ? (
              <>
                {" "}
                {c.logFedSince(new Date(site.log_since).toISOString().slice(0, 10))}
                {site.log_last_t ? c.newestLine(new Date(site.log_last_t).toISOString().replace("T", " ").slice(0, 16)) : ""}.
              </>
            ) : null}
          </p>
          <LogUpload domain={site.domain} c={a} lang={lang} />
          {(site.log_since || logSources.length > 0) && <p role="status" style={{ fontSize: 13, color: logFresh ? "var(--muted)" : "var(--warn)" }}>{logFresh ? c.logFresh : c.logStale}</p>}
          {logSources.length > 0 && <ul style={{ fontSize: 12, color: "var(--muted)" }}>{logSources.slice(0, 8).map((s) => <li key={`${s.sourceId}:${s.generation}`}>{c.logSourceRow(s.sourceId, s.generation, s.records, s.lastImportAt ? new Date(s.lastImportAt).toISOString() : "-")}</li>)}</ul>}
          <pre className="code" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", marginTop: 14, marginBottom: 10 }}>{logCurl(site.domain, c.logCurlComment)}</pre>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>{c.logProxyNote}</p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>{c.digestTitle}</h2>
          <p style={{ color: "var(--ink-2)", maxWidth: "62ch", marginBottom: 14 }}>
            {c.digestText(Boolean(account.digest))} <a href={`/api/export/${encodeURIComponent(site.domain)}`}>{c.downloadCsv}</a>
            {c.csvNote}
          </p>
          <DigestToggle on={Boolean(account.digest)} c={a} />
        </div>

        <div className="card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>{c.removeTitle}</h2>
          <p style={{ color: "var(--ink-2)", maxWidth: "62ch", marginBottom: 14 }}>{c.removeText}</p>
          <RemoveButton domain={site.domain} c={a} confirmLabel={dashCopy(lang).actions.confirmDelete(site.domain)} />
        </div>
      </section>
    </DashboardShell>
  );
}
