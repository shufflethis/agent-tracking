import Link from "next/link";
import { LangSwitch, SignOut } from "@/components/SiteActions";
import { dashCopy, dashLang, numberLocale, type DashLang } from "@/lib/tracking/copy";
import type { Account, Site } from "@/lib/tracking/db";
import { planFor } from "@/lib/tracking/plans";
import { usageThisMonth } from "@/lib/tracking/db";

/**
 * The frame around every dashboard page: which site, which view, which plan.
 * Four views and settings, no more, as the plan says. Language comes from
 * the account (lib/tracking/copy.ts), not from the URL.
 */
export default function DashboardShell({ account, site, view, children }: { account: Account; site?: Site; view?: string; children: React.ReactNode }) {
  const lang = dashLang(account.lang);
  const c = dashCopy(lang);
  const plan = planFor(account.plan);
  const used = usageThisMonth(account.email);
  const base = site ? `/app/${encodeURIComponent(site.domain)}` : "/app";
  const views = [
    { slug: "", label: c.shell.views.overview },
    { slug: "agents", label: c.shell.views.agents },
    { slug: "tools", label: c.shell.views.tools },
    { slug: "pages", label: c.shell.views.pages },
    { slug: "settings", label: c.shell.views.settings },
  ];
  return (
    <>
      <section className="shell" style={{ paddingTop: 40, paddingBottom: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              <Link href="/app" style={{ color: "inherit" }}>
                {c.shell.brand}
              </Link>
              {site ? <span style={{ color: "var(--muted)" }}> / </span> : null}
            </p>
            <h1 style={{ fontSize: "clamp(24px,3.6vw,36px)", margin: 0, wordBreak: "break-word" }}>{site ? site.domain : c.shell.yourSites}</h1>
            {site && !site.verified_at ? (
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--warn)" }}>
                {c.shell.notVerified} <Link href={`${base}/settings`}>{c.shell.installAndCheck}</Link>.
              </p>
            ) : null}
          </div>
          <div style={{ textAlign: "right", fontSize: 13, color: "var(--muted)" }}>
            <p style={{ margin: "0 0 8px" }}>
              {account.email} · {c.shell.planLine(plan.name, used.toLocaleString(numberLocale(lang)), plan.eventsPerMonth.toLocaleString(numberLocale(lang)))}
            </p>
            <p style={{ margin: 0, display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
              <LangSwitch lang={lang} labelEn={c.actions.langEn} labelDe={c.actions.langDe} />
              <SignOut label={c.actions.signOut} />
            </p>
          </div>
        </div>
        {site ? (
          <nav aria-label="Dashboard views" style={{ display: "flex", gap: 4, marginTop: 24, borderBottom: "1px solid var(--rule)", overflowX: "auto" }}>
            {views.map((v) => {
              const active = (view ?? "") === v.slug;
              return (
                <Link
                  key={v.slug}
                  href={v.slug ? `${base}/${v.slug}` : base}
                  style={{
                    padding: "10px 14px",
                    fontSize: 14,
                    fontWeight: 600,
                    color: active ? "var(--ink)" : "var(--muted)",
                    borderBottom: active ? "2px solid var(--cyan)" : "2px solid transparent",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {v.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </section>
      {children}
    </>
  );
}

export function Stat({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: string }) {
  return (
    <div>
      <p className="smallcaps" style={{ margin: "0 0 6px" }}>{label}</p>
      <p style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 30, margin: 0, color: tone ?? "var(--ink)" }}>{value}</p>
      {note ? <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>{note}</p> : null}
    </div>
  );
}

export function trendNote(current: number, previous: number, lang: DashLang = "en"): string {
  const c = dashCopy(lang).trend;
  if (previous === 0) return current > 0 ? c.newInPeriod : c.noneYet;
  const pct = Math.round(((current - previous) / previous) * 100);
  return c.vsBefore(`${pct >= 0 ? "+" : ""}${pct}%`);
}
