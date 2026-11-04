import Link from "next/link";
import LangSwitch from "@/components/LangSwitch";
import { guideTranslations } from "@/lib/guide-links";
import Image from "next/image";
import Wordmark from "@/components/Wordmark";
import { href, t, type Locale } from "@/lib/i18n";
import { BUILDER, CHECK_ORIGIN, GITHUB_URL, LEGAL, SITE_HOST } from "@/lib/site";

/**
 * Header and footer for one locale, rendered on the server. The mobile menu
 * is a <details> disclosure, not a JS drawer, with plain anchors so that
 * navigating closes it.
 */
export default function SiteChrome({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const d = t(locale);
  const translations = guideTranslations();
  const login = locale === "de" ? "/login?lang=de" : "/login";
  const L = (p: string) => href(p, locale);

  const NAV = [
    { href: `${L("/")}#plans`, label: d.nav.pricing },
    { href: L("/docs"), label: d.nav.docs },
    { href: L("/changelog"), label: d.nav.changelog },
    { href: L("/websites"), label: d.nav.websites },
    { href: L("/guides"), label: d.nav.guides },
  ];

  return (
    <>
      <header className="site-head">
        <div className="row">
          <Link href={L("/")} className="brand" aria-label="agent-tracking, home">
            <Wordmark id="head" size={23} />
          </Link>

          <nav className="site-nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
            <a href={GITHUB_URL} rel="noopener">
              GitHub
            </a>
            <LangSwitch label={d.langLabel} translations={translations} />
            <Link href={login} className="btn" style={{ padding: "9px 18px", fontSize: 14 }}>
              {d.nav.login}
            </Link>
          </nav>

          <div className="head-actions">
            <Link href={login} className="head-cta">
              {d.nav.login}
            </Link>
            <details className="navtoggle">
              <summary aria-label={d.menu} role="button">
                <i />
                <i />
                <i />
              </summary>
              <div className="navpanel">
                {NAV.map((n) => (
                  <a key={n.href} href={n.href}>
                    {n.label}
                  </a>
                ))}
                <a href={GITHUB_URL} rel="noopener">
                  GitHub
                </a>
                <a href={login} className="btn">
                  {d.nav.login}
                </a>
                <LangSwitch label={d.langLabel} translations={translations} />
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-foot">
        <div className="shell">
          <div className="foot-top">
            <div className="foot-about">
              <Link href={L("/")} className="foot-brand" aria-label="agent-tracking, home">
                <Wordmark id="foot" size={26} />
              </Link>
              <p className="foot-tagline">{d.foot.tagline}</p>
              <a className="foot-by" href={BUILDER.url} target="_blank" rel="noopener">
                <Image src={BUILDER.avatar} alt="" width={28} height={28} unoptimized />
                <span>{d.foot.builtBy} <strong>{BUILDER.name}</strong> · @{BUILDER.handle} {locale === "de" ? "auf X" : "on X"}</span>
              </a>
            </div>
            <nav className="foot-grid" aria-label="Footer">
              <div>
                <p className="foot-title">{d.foot.product}</p>
                <ul>
                  <li><Link href={L("/")}>{d.foot.monitoring}</Link></li>
                  <li><Link href={`${L("/")}#plans`}>{d.nav.pricing}</Link></li>
                  <li><Link href={L("/changelog")}>{d.foot.changelog}</Link></li>
                  <li><Link href={L("/docs")}>{d.foot.docs}</Link></li>
                  <li><Link href={login}>{d.foot.login}</Link></li>
                </ul>
              </div>
              <div>
                <p className="foot-title">{d.foot.sitesTitle}</p>
                <ul>
                  <li><Link href={L("/websites")}>{d.foot.websites}</Link></li>
                  <li><Link href={L("/guides")}>{d.foot.guides}</Link></li>
                  <li><Link href="/demo">{d.foot.demo}</Link></li>
                  <li><Link href={`${L("/docs")}#api`}>{d.foot.api}</Link></li>
                  <li><Link href={`/stats/${SITE_HOST}`}>{d.foot.live}</Link></li>
                </ul>
              </div>
              <div>
                <p className="foot-title">Open source</p>
                <ul>
                  <li><a href={GITHUB_URL} rel="noopener">{d.foot.source}</a></li>
                  <li><a href={`${GITHUB_URL}#self-hosting`} rel="noopener">{d.foot.selfHost}</a></li>
                  <li><a href={`${GITHUB_URL}/blob/main/LICENSE`} rel="noopener">AGPL-3.0</a></li>
                  {CHECK_ORIGIN ? <li><a href={CHECK_ORIGIN} rel="noopener">{d.foot.check}</a></li> : null}
                </ul>
              </div>
              <div>
                <p className="foot-title">{d.foot.legal}</p>
                <ul>
                  <li><Link href={L("/imprint")}>{d.foot.imprint}</Link></li>
                  <li><Link href={L("/privacy")}>{d.foot.privacy}</Link></li>
                  <li><Link href={L("/terms")}>{d.foot.terms}</Link></li>
                  <li><Link href={L("/dpa")}>{d.foot.dpa}</Link></li>
                </ul>
              </div>
            </nav>
          </div>

          <div className="foot-note">
            <p>© {new Date().getFullYear()} {LEGAL.name} · {d.foot.operated} · AGPL-3.0</p>
            <p><a href="/llms.txt">llms.txt</a></p>
          </div>
        </div>
      </footer>
    </>
  );
}
