/**
 * Two locales. English lives at the root and is the binding language of the
 * legal pages; German sits under /de as a translation.
 *
 * No automatic redirect by Accept-Language: crawlers come from US addresses,
 * and a redirect would leave the German tree unindexed. A visible switcher and
 * a hreflang set instead.
 */

export const LOCALES = ["en", "de"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export function prefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? "" : `/${locale}`;
}

/** Slugs that differ per locale. Legal terms of art keep their German word. */
const PATH_ALIAS: Record<Locale, Record<string, string>> = {
  en: {},
  de: {
    "/imprint": "/impressum",
    "/privacy": "/datenschutz",
    "/terms": "/agb",
    "/dpa": "/avv",
  },
};

const PATH_CANONICAL: Record<Locale, Record<string, string>> = Object.fromEntries(
  LOCALES.map((l) => [l, Object.fromEntries(Object.entries(PATH_ALIAS[l]).map(([k, v]) => [v, k]))]),
) as Record<Locale, Record<string, string>>;

export function canonicalPath(path: string, locale: Locale): string {
  return PATH_CANONICAL[locale]?.[path] ?? path;
}

export function href(path: string, locale: Locale): string {
  if (path.startsWith("#") || /^[a-z]+:/.test(path)) return path;
  const localised = PATH_ALIAS[locale]?.[path] ?? path;
  const clean = localised === "/" ? "" : localised;
  return `${prefix(locale)}${clean}` || "/";
}

export const LOCALE_LABEL: Record<Locale, string> = { en: "English", de: "Deutsch" };
export const LOCALE_SHORT: Record<Locale, string> = { en: "EN", de: "DE" };
export const HTML_LANG: Record<Locale, string> = { en: "en", de: "de" };

/** Which pages exist in which locale. hreflang only points at pages that exist. */
export const PATH_LOCALES: Record<string, readonly Locale[]> = {
  "/": ["en", "de"],
  "/docs": ["en", "de"],
  "/guides": ["en", "de"],
  "/imprint": ["en", "de"],
  "/privacy": ["en", "de"],
  "/terms": ["en", "de"],
  "/dpa": ["en", "de"],
  // The dashboard, the demo and the public stats page are English routes;
  // the dashboard translates itself from the account's language setting.
  "/demo": ["en"],
  "/login": ["en"],
};

export function localesFor(path: string): readonly Locale[] {
  return PATH_LOCALES[path] ?? [];
}

export function hasLocale(path: string, locale: Locale): boolean {
  return localesFor(path).includes(locale);
}

export function pathsIn(locale: Locale): string[] {
  return Object.entries(PATH_LOCALES)
    .filter(([, ls]) => ls.includes(locale))
    .map(([p]) => p);
}

export function alternatesFor(path: string) {
  const locales = localesFor(path);
  if (locales.length < 2) return { canonical: path };
  const languages: Record<string, string> = Object.fromEntries(locales.map((l) => [HTML_LANG[l], href(path, l)]));
  languages["x-default"] = path;
  return { canonical: path, languages };
}

export function alternatesForLocale(path: string, locale: Locale) {
  return { ...alternatesFor(path), canonical: href(path, locale) };
}

type Dict = {
  nav: { docs: string; guides: string; demo: string; live: string; pricing: string; login: string; dashboard: string };
  menu: string;
  langLabel: string;
  foot: {
    product: string;
    docs: string;
    demo: string;
    pricing: string;
    login: string;
    api: string;
    guides: string;
    live: string;
    selfHost: string;
    source: string;
    legal: string;
    imprint: string;
    privacy: string;
    terms: string;
    dpa: string;
    note: string;
    check: string;
  };
};

export const DICT: Record<Locale, Dict> = {
  en: {
    nav: { docs: "Docs", guides: "Guides", demo: "Demo", live: "Live stats", pricing: "Pricing", login: "Sign in", dashboard: "Dashboard" },
    menu: "Menu",
    langLabel: "Language",
    foot: {
      product: "Product",
      docs: "Documentation",
      demo: "Demo page",
      pricing: "Plans",
      login: "Sign in",
      api: "Stats API and MCP",
      guides: "Guides",
      live: "Live stats of this site",
      selfHost: "Self-hosting",
      source: "Source on GitHub",
      legal: "Legal",
      imprint: "Imprint",
      privacy: "Privacy",
      terms: "Terms",
      dpa: "Data processing agreement",
      note: "Open source under AGPL-3.0. Hosted in Germany.",
      check: "Agent readiness check by webmcp-tool.com",
    },
  },
  de: {
    nav: { docs: "Doku", guides: "Guides", demo: "Demo", live: "Live-Stats", pricing: "Preise", login: "Anmelden", dashboard: "Dashboard" },
    menu: "Menü",
    langLabel: "Sprache",
    foot: {
      product: "Produkt",
      docs: "Dokumentation",
      demo: "Demo-Seite",
      pricing: "Pläne",
      login: "Anmelden",
      api: "Stats-API und MCP",
      guides: "Guides",
      live: "Live-Statistik dieser Site",
      selfHost: "Selbst hosten",
      source: "Quellcode auf GitHub",
      legal: "Rechtliches",
      imprint: "Impressum",
      privacy: "Datenschutz",
      terms: "AGB",
      dpa: "Auftragsverarbeitungsvertrag",
      note: "Open Source unter AGPL-3.0. Gehostet in Deutschland.",
      check: "Agent Readiness Check von webmcp-tool.com",
    },
  },
};

export function t(locale: Locale): Dict {
  return DICT[locale];
}
