"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { canonicalPath, DEFAULT_LOCALE, hasLocale, href, LOCALES, LOCALE_LABEL, LOCALE_SHORT, type Locale } from "@/lib/i18n";

/**
 * The one client component in the chrome, because it has to know which page
 * it is on. On a page without a translation the other locale points at that
 * locale's home rather than at a URL that would 404.
 */

function basePath(pathname: string): string {
  for (const l of LOCALES) {
    if (l === DEFAULT_LOCALE) continue;
    if (pathname === `/${l}`) return "/";
    if (pathname.startsWith(`/${l}/`)) return pathname.slice(l.length + 1);
  }
  return pathname || "/";
}

function localeOf(pathname: string): Locale {
  for (const l of LOCALES) {
    if (l === DEFAULT_LOCALE) continue;
    if (pathname === `/${l}` || pathname.startsWith(`/${l}/`)) return l;
  }
  return DEFAULT_LOCALE;
}

export default function LangSwitch({ label }: { label: string }) {
  const pathname = usePathname() || "/";
  const current = localeOf(pathname);
  const base = canonicalPath(basePath(pathname), current);

  return (
    <div className="langswitch" role="group" aria-label={label}>
      {LOCALES.map((l) => {
        const isCurrent = l === current;
        const hasPage = hasLocale(base, l);
        const target = isCurrent ? pathname : hasPage ? href(base, l) : href("/", l);
        return (
          <Link key={l} href={target} hrefLang={l} lang={l} aria-current={isCurrent ? "page" : undefined} className={isCurrent ? "on" : undefined} title={LOCALE_LABEL[l]}>
            {LOCALE_SHORT[l]}
          </Link>
        );
      })}
    </div>
  );
}
