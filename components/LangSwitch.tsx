"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { canonicalPath, DEFAULT_LOCALE, hasLocale, href, LOCALES, LOCALE_LABEL, LOCALE_SHORT, type Locale } from "@/lib/i18n";

/**
 * Compact language switcher rendered as a native <details> dropdown so adding
 * locales never crowds the navigation bar. On pages without a translation in
 * the target locale, the link points at that locale's home page rather than 404.
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

export default function LangSwitch({ label, translations = {} }: { label: string; translations?: Record<string, string> }) {
  const pathname = usePathname() || "/";
  const current = localeOf(pathname);
  const base = canonicalPath(basePath(pathname), current);
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) ref.current.open = false;
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details className="langmenu" ref={ref}>
      <summary className="langmenu-btn" aria-label={`${label}: ${LOCALE_LABEL[current]}`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M2.8 12h18.4" />
          <path d="M12 2.5a14.5 14.5 0 0 1 0 19 14.5 14.5 0 0 1 0-19Z" />
        </svg>
        <span>{LOCALE_SHORT[current]}</span>
        <span className="langmenu-caret" aria-hidden="true">▾</span>
      </summary>
      <div className="langmenu-list" role="menu" aria-label={label}>
        {LOCALES.map((l) => {
          const isCurrent = l === current;
          const mapped = translations[pathname];
          const mappedMatches = mapped && localeOf(mapped) === l;
          const target = isCurrent ? pathname : mappedMatches ? mapped : hasLocale(base, l) ? href(base, l) : href("/", l);
          return (
            <Link
              key={l}
              href={target}
              hrefLang={l}
              lang={l}
              role="menuitem"
              aria-current={isCurrent ? "page" : undefined}
              className={isCurrent ? "on" : undefined}
              onClick={() => {
                if (ref.current) ref.current.open = false;
              }}
            >
              <span className="langmenu-code">{LOCALE_SHORT[l]}</span>
              <span>{LOCALE_LABEL[l]}</span>
            </Link>
          );
        })}
      </div>
    </details>
  );
}
