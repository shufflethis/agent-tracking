import Link from "next/link";
import LangSwitch from "@/components/LangSwitch";
import Wordmark from "@/components/Wordmark";
import { href, t, type Locale } from "@/lib/i18n";
import { CHECK_ORIGIN, GITHUB_URL } from "@/lib/site";

/**
 * Header and footer for one locale, rendered on the server. The mobile menu
 * is a <details> disclosure, not a JS drawer, with plain anchors so that
 * navigating closes it.
 */
export default function SiteChrome({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const d = t(locale);
  const L = (p: string) => href(p, locale);

  const NAV = [
    { href: L("/docs"), label: d.nav.docs },
    { href: "/demo", label: d.nav.demo },
    { href: `${L("/")}#plans`, label: d.nav.pricing },
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
            <LangSwitch label={d.langLabel} />
            <Link href="/login" className="btn" style={{ padding: "9px 18px", fontSize: 14 }}>
              {d.nav.login}
            </Link>
          </nav>

          <div className="head-actions">
            <Link href="/login" className="head-cta">
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
                <a href="/login" className="btn">
                  {d.nav.login}
                </a>
                <LangSwitch label={d.langLabel} />
              </div>
            </details>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="site-foot">
        <div className="shell">
          <div className="foot-grid">
            <div>
              <h4>{d.foot.product}</h4>
              <ul>
                <li>
                  <Link href={L("/docs")}>{d.foot.docs}</Link>
                </li>
                <li>
                  <Link href="/demo">{d.foot.demo}</Link>
                </li>
                <li>
                  <Link href={`${L("/")}#plans`}>{d.foot.pricing}</Link>
                </li>
                <li>
                  <Link href={`${L("/docs")}#api`}>{d.foot.api}</Link>
                </li>
                <li>
                  <Link href="/login">{d.foot.login}</Link>
                </li>
              </ul>
            </div>
            <div>
              <h4>Open source</h4>
              <ul>
                <li>
                  <a href={GITHUB_URL} rel="noopener">
                    {d.foot.source}
                  </a>
                </li>
                <li>
                  <a href={`${GITHUB_URL}#self-hosting`} rel="noopener">
                    {d.foot.selfHost}
                  </a>
                </li>
                <li>
                  <a href={`${GITHUB_URL}/blob/main/LICENSE`} rel="noopener">
                    AGPL-3.0
                  </a>
                </li>
                {CHECK_ORIGIN ? (
                  <li>
                    <a href={CHECK_ORIGIN} rel="noopener">
                      {d.foot.check}
                    </a>
                  </li>
                ) : null}
              </ul>
            </div>
            <div>
              <h4>{d.foot.legal}</h4>
              <ul>
                <li>
                  <Link href={L("/imprint")}>{d.foot.imprint}</Link>
                </li>
                <li>
                  <Link href={L("/privacy")}>{d.foot.privacy}</Link>
                </li>
                <li>
                  <Link href={L("/terms")}>{d.foot.terms}</Link>
                </li>
                <li>
                  <Link href={L("/dpa")}>{d.foot.dpa}</Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="foot-note">
            <Link href={L("/")} className="foot-brand" aria-label="agent-tracking, home">
              <Wordmark id="foot" size={26} />
            </Link>
            <p>
              <span>{d.foot.note}</span>
              <Link href={L("/imprint")}>{d.foot.imprint}</Link>
              <Link href={L("/privacy")}>{d.foot.privacy}</Link>
              <Link href={L("/terms")}>{d.foot.terms}</Link>
              <a href="/llms.txt">llms.txt</a>
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
