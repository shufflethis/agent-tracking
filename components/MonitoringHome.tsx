import Link from "next/link";
import Image from "next/image";
import AgentGuardMotion from "@/components/AgentGuardMotion";
import { FeatureIcon, HarnessStrip } from "@/components/BrandIcons";
import CopyBlock from "@/components/CopyBlock";
import HeroQuickstart from "@/components/HeroQuickstart";
import { AUDIT_COMMAND, AUDIT_ONE_LINER, FIX_COMMAND } from "@/lib/agents/setup";
import { getMonitoringHomeCopy, monitoringFaqSchema } from "@/lib/home-i18n";
import type { HomeCard } from "@/lib/home-i18n/types";
import { href, type Locale } from "@/lib/i18n";
import { BUILDER, CONTACT_EMAIL, GITHUB_URL } from "@/lib/site";

export { monitoringFaqSchema };

function inlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    const m = /^`([^`]+)`$/.exec(part);
    return m ? <code key={i}>{m[1]}</code> : part;
  });
}

function Cards({ rows, cols }: { rows: HomeCard[]; cols: 2 | 3 | 4 }) {
  return (
    <div className={`grid${cols} hcards`}>
      {rows.map((r) => (
        <article className="card hcard" key={r.t}>
          <div className="hcard-top">
            {r.icon ? (
              <span className="hcard-ico">
                <FeatureIcon kind={r.icon} />
              </span>
            ) : null}
            <p className="smallcaps">{r.k}</p>
          </div>
          <h3>{r.t}</h3>
          <p>{inlineCode(r.d)}</p>
        </article>
      ))}
    </div>
  );
}

function Head({ kick, title, dek }: { kick: string; title: string; dek?: string }) {
  return (
    <header className="hhead">
      <p className="hkick">{kick}</p>
      <h2>{title}</h2>
      {dek ? <p className="hdek">{inlineCode(dek)}</p> : null}
    </header>
  );
}

export default function MonitoringHome({ lang }: { lang: Locale }) {
  const c = getMonitoringHomeCopy(lang);
  const L = (p: string) => href(p, lang);
  const demoHref = L("/demo/fleet");
  const login = lang === "de" ? "/login?lang=de&next=/app/fleet" : "/login?next=/app/fleet";
  const loginPro = lang === "de" ? "/login?lang=de&next=/app/fleet/settings" : "/login?next=/app/fleet/settings";
  const teamMail = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Agent Tracking Team & Governance Pilot")}`;
  const tierHref = (id: string) => (id === "team" ? teamMail : id === "pro" ? loginPro : login);

  return (
    <div className="home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(monitoringFaqSchema(lang)) }} />

      <div className="hhero-stage">
        <section className="shell hhero">
          <p className="hhero-pill">
            <span className="hhero-dot" aria-hidden="true" />
            <span>{c.eyebrow}</span>
          </p>
          <h1>
            {c.h1Lead} <span className="hhero-accent">{c.h1Accent}</span>
          </h1>
          <p className="hhero-sub">{c.sub}</p>
          <div className="hctas">
            <Link className="btn" href={demoHref}>{c.demoCta}</Link>
            <Link className="btn ghost" href={login}>{c.dashboard}</Link>
          </div>

          <div className="hhero-metrics" aria-label={c.metricsAria}>
            {c.metrics.map((m) =>
              m.href ? (
                <a className="hhero-metric is-link" href={m.href} key={m.l}>
                  <strong>{m.v}</strong>
                  <span>{m.l}</span>
                </a>
              ) : (
                <div className="hhero-metric" key={m.l}>
                  <strong>{m.v}</strong>
                  <span>{m.l}</span>
                </div>
              ),
            )}
          </div>

          <div className="hhero-quick" id="connect">
            <HeroQuickstart tabs={c.quickTabs} lang={lang} />
          </div>

          <ul className="htrust">
            {c.trust.map((item) => <li key={item}>{item}</li>)}
            <li className="htrust-by">
              <a href={BUILDER.url} target="_blank" rel="noopener">
                <Image src={BUILDER.avatar} alt="" width={22} height={22} unoptimized />
                {c.builtBy} @{BUILDER.handle}
              </a>
            </li>
          </ul>
        </section>
      </div>

      <HarnessStrip lang={lang} />

      <section className="shell hsec" id="icp">
        <Head kick={c.icp.kick} title={c.icp.title} dek={c.icp.dek} />
        <Cards rows={c.icp.cards} cols={3} />
        <div className="callout mid hicp-not">
          <span className="tag">{c.icp.notTag}</span>
          <p style={{ margin: 0 }}>{c.icp.notText}</p>
        </div>
      </section>

      <div className="hband">
        <section className="shell hsec" id="autofix">
          <Head kick={c.autofix.kick} title={c.autofix.title} dek={c.autofix.dek} />
          <div className="hreal-grid">
            <figure className="card hreal-card">
              <div className="hreal-head">
                <span className="chip fail">{c.autofix.card1Badge}</span>
                <span>{c.autofix.card1Caption}</span>
              </div>
              <Image src="/img/agents/real-audit-40.webp" alt={c.autofix.card1Alt} width={1400} height={1160} unoptimized />
            </figure>
            <figure className="card hreal-card">
              <div className="hreal-head">
                <span className="chip warn">{c.autofix.card2Badge}</span>
                <span>{inlineCode(c.autofix.card2Caption)}</span>
              </div>
              <Image src="/img/agents/real-audit-80.webp" alt={c.autofix.card2Alt} width={1400} height={1120} unoptimized />
            </figure>
          </div>
          <figure className="card hreal-win">
            <div className="hreal-head">
              <span className="chip pass">{c.autofix.card3Badge}</span>
              <span>{c.autofix.card3Caption}</span>
            </div>
            <Image src="/img/agents/real-fix-100.webp" alt={c.autofix.card3Alt} width={1320} height={212} unoptimized />
          </figure>
          <div className="hba-cmd">
            <CopyBlock
              kind="terminal"
              label={c.autofix.cmdLabel}
              text={`brew install shufflethis/tap/agenttracking\n${AUDIT_COMMAND} --share\n${FIX_COMMAND}`}
              lang={lang}
            />
          </div>
        </section>
      </div>

      <section className="shell hsec" id="architecture">
        <Head kick={c.kick.motion} title={c.motionTitle} dek={c.motionDek} />
        <AgentGuardMotion lang={lang} />
      </section>

      <div className="hband">
        <section className="shell hsec" id="pillars">
          <Head kick={c.kick.pillars} title={c.pillarsTitle} dek={c.pillarsDek} />
          <div className="grid3 hvisuals">
            {c.pillars.map((p) => (
              <article className="card hvisual-card" key={p.t}>
                <div className="hvisual-media">
                  <Image src={p.img} alt={p.alt} width={960} height={540} unoptimized />
                </div>
                <div className="hvisual-body">
                  <p className="smallcaps">{p.k}</p>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                  <p className="hvisual-stat">{p.stat}</p>
                  <Link href={p.href} className="hvisual-link">{p.cta}</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="shell hsec" id="catches">
        <Head kick={c.kick.catch} title={c.catchTitle} />
        <Cards rows={c.catches} cols={3} />
        <p className="hafter">{c.alerts}</p>
      </section>

      <div className="hband">
        <section className="shell hsec" id="compare">
          <Head kick={c.kick.compare} title={c.compareTitle} dek={c.compareDek} />
          <div className="tablewrap hcomp">
            <table>
              <thead>
                <tr>
                  {c.compareHeaders.map((h, i) => (
                    <th key={h} className={i === 1 ? "is-hl" : undefined}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.compareRows.map((row) => (
                  <tr key={row.feature}>
                    <td><strong>{row.feature}</strong></td>
                    <td className="is-hl">{inlineCode(row.at)}</td>
                    <td>{row.diy}</td>
                    <td>{row.cron}</td>
                    <td>{row.llm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="shell hsec" id="teams">
        <Head kick={c.kick.b2b} title={c.b2bTitle} dek={c.b2bDek} />
        <Cards rows={c.b2bCards} cols={2} />
        <div className="hctas" style={{ marginTop: 26 }}>
          <a className="btn" href={teamMail}>{c.b2bCta}</a>
          <Link className="btn ghost" href={demoHref}>{c.b2bDemo}</Link>
        </div>
      </section>

      <div className="hband">
        <section className="shell hsec" id="screens">
          <Head kick={c.kick.shots} title={c.shotsTitle} dek={c.shotsDek} />
          <div className="grid2 hshots">
            {[["/img/agents/fleet.webp", c.shot1Alt, c.shot1, 820], ["/img/agents/timeline.webp", c.shot2Alt, c.shot2, 980]].map(([src, alt, cap, h]) => (
              <figure key={src as string}>
                <Image src={src as string} alt={alt as string} width={1160} height={h as number} unoptimized />
                <figcaption>{cap}</figcaption>
              </figure>
            ))}
          </div>
          <div className="hctas" style={{ marginTop: 24 }}>
            <Link className="btn" href={demoHref}>{c.demoCta}</Link>
          </div>
        </section>
      </div>

      <section className="shell hsec" id="steps">
        <Head kick={c.kick.steps} title={c.stepsTitle} />
        <ol className="hsteps">
          {c.steps.map((s, i) => (
            <li key={s.t}>
              <span className="hstep-n" aria-hidden="true">{i + 1}</span>
              <div className="hstep-body">
                <h3>{s.t.replace(/^\d+\.\s*/, "")}</h3>
                <p>{inlineCode(s.d)}</p>
                <CopyBlock kind="terminal" label="Terminal" text={s.cmd} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
        <p className="hafter"><Link href={`${L("/docs")}#agent-monitoring`}>{c.stepsMore} →</Link></p>
      </section>

      <div className="hband">
        <section className="shell hsec" id="integrations">
          <Head kick={c.kick.today} title={c.todayTitle} />
          <Cards rows={c.today} cols={4} />
          <p className="hafter"><Link href={L("/changelog")}>{c.changelog} →</Link></p>
        </section>
      </div>

      <section className="shell hsec" id="guides">
        <Head kick={c.kick.guides} title={c.guidesTitle} dek={c.guidesDek} />
        <div className="grid2 hcards">
          {c.guidesList.map((g) => (
            <Link key={g.slug} href={g.slug} className="card hcard hguide-link">
              <p className="smallcaps">{g.tag}</p>
              <h3>{g.title}</h3>
              <p>{g.desc}</p>
            </Link>
          ))}
        </div>
        <p className="hafter"><Link href={L("/guides")}>{c.allGuides} →</Link></p>
      </section>

      <section className="shell hsec" id="privacy">
        <div className="callout mid hprivacy">
          <span className="tag">{c.sentTitle}</span>
          <p>{c.sent}</p>
          <p>{c.never} <Link href={`${L("/docs")}#agent-monitoring`}>{c.sentMore}</Link>.</p>
        </div>
      </section>

      <div className="hband">
        <section className="shell hsec" id="plans">
          <Head kick={c.kick.plans} title={c.plansTitle} />
          <div className="htiers">
            {c.tiers.map((tier) => (
              <article key={tier.id} className={`htier${tier.id === "pro" || tier.id === "team" ? " is-pro" : ""}`}>
                {tier.id === "pro" ? <span className="htier-flag">{c.tierPick}</span> : null}
                {tier.id === "team" ? <span className="htier-flag is-team">{c.tierTeamFlag}</span> : null}
                <h3>{tier.name}</h3>
                <p className="htier-price"><strong>{tier.price}</strong> <span>{tier.per}</span></p>
                <p className="htier-note">{tier.note}</p>
                <ul>{tier.features.map((f) => <li key={f}>{inlineCode(f)}</li>)}</ul>
                {tier.id === "team"
                  ? <a className="btn" href={tierHref(tier.id)}>{tier.cta}</a>
                  : <Link className={tier.id === "pro" ? "btn" : "btn ghost"} href={tierHref(tier.id)}>{tier.cta}</Link>}
              </article>
            ))}
          </div>
          <aside className="hteam">
            <div>
              <h3>{c.selfHostBox.title} <span>AGPL-3.0 · $0</span></h3>
              <p>{c.selfHostBox.text}</p>
            </div>
            <a className="btn ghost" href={GITHUB_URL} target="_blank" rel="noopener">{c.selfHostBox.cta}</a>
          </aside>
          <p className="hfine">{c.tierFine} {c.more}</p>
        </section>
      </div>

      <section className="shell hsec" id="why">
        <Head kick={c.kick.why} title={c.whyTitle} dek={c.why} />
        <div className="hwhy">
          <figure className="hwhy-tweet">
            <a href="https://x.com/boardyai/status/2116435532163195363" target="_blank" rel="noopener noreferrer">
              <Image src="/images/boardy-own-agents.png" width={1100} height={498} alt={c.whyAlt} unoptimized />
              <span>{c.whyLink}</span>
            </a>
          </figure>
          <aside className="card hbuilder">
            <Image src={BUILDER.avatar} alt={BUILDER.name} width={64} height={64} unoptimized className="hbuilder-img" />
            <div>
              <p className="smallcaps">{c.builtBy}</p>
              <p className="hbuilder-name">{BUILDER.name} <span>@{BUILDER.handle}</span></p>
              <p className="hbuilder-text">{c.builtText}</p>
              <a className="btn ghost" href={BUILDER.url} target="_blank" rel="noopener">{c.builtCta}</a>
              <p className="hbuilder-op">{c.operated}</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="shell hsec" id="faq">
        <Head kick={c.kick.faq} title={c.faqTitle} />
        <div className="faq hfaq">
          {c.faq.map((f) => (
            <details key={f.q}>
              <summary><h3>{inlineCode(f.q)}</h3></summary>
              <p>{inlineCode(f.a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="hfinal" id="start">
        <div className="shell">
          <Head kick={c.kick.start} title={c.finalTitle} dek={c.finalDek} />
          <div className="hfinal-box">
            <CopyBlock kind="terminal" label={c.finalAuditLabel} text={AUDIT_ONE_LINER} lang={lang} />
          </div>
          <div className="hctas">
            <Link className="btn" href={demoHref}>{c.demoCta}</Link>
            <Link className="btn ghost" href={login}>{c.dashboard}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
