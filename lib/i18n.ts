/**
 * Multi-locale routing. English lives at the root and is the binding language
 * of the legal pages; German lives under /de with full page coverage; Spanish,
 * Portuguese, French, Polish and Japanese live under /es, /pt, /fr, /pl and
 * /ja for the main landing page.
 *
 * No automatic redirect by Accept-Language: crawlers come from US addresses,
 * and a redirect would leave localized trees unindexed. A visible switcher and
 * a strict hreflang set (only pointing at pages that exist) are used instead.
 */

export const LOCALES = ["en", "de", "es", "pt", "fr", "pl", "ja"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Locales rendered via the dynamic app/(intl)/[locale] landing route. */
export const EXTRA_LOCALES = ["es", "pt", "fr", "pl", "ja"] as const;
export type ExtraLocale = (typeof EXTRA_LOCALES)[number];

/** Locales that have full long-form guide translations. */
export const GUIDE_LOCALES = ["en", "de"] as const;
export type GuideLocale = (typeof GUIDE_LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function isExtraLocale(value: string): value is ExtraLocale {
  return (EXTRA_LOCALES as readonly string[]).includes(value);
}

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
  es: {},
  pt: {},
  fr: {},
  pl: {},
  ja: {},
};

const PATH_CANONICAL: Record<Locale, Record<string, string>> = Object.fromEntries(
  LOCALES.map((l) => [l, Object.fromEntries(Object.entries(PATH_ALIAS[l]).map(([k, v]) => [v, k]))]),
) as Record<Locale, Record<string, string>>;

export function canonicalPath(path: string, locale: Locale): string {
  return PATH_CANONICAL[locale]?.[path] ?? path;
}

/** Which pages exist in which locale. hreflang only points at pages that exist. */
export const PATH_LOCALES: Record<string, readonly Locale[]> = {
  "/": ["en", "de", "es", "pt", "fr", "pl", "ja"],
  "/docs": ["en", "de"],
  "/websites": ["en", "de"],
  "/changelog": ["en", "de"],
  "/guides": ["en", "de"],
  "/imprint": ["en", "de"],
  "/privacy": ["en", "de"],
  "/terms": ["en", "de"],
  "/dpa": ["en", "de"],
  // The dashboard, the demo and the public stats page are English routes;
  // the dashboard translates itself from the account's language setting.
  "/demo": ["en"],
  "/demo/fleet": ["en", "de"],
  "/login": ["en"],
};

export function localesFor(path: string): readonly Locale[] {
  return PATH_LOCALES[path] ?? [];
}

export function hasLocale(path: string, locale: Locale): boolean {
  return localesFor(path).includes(locale);
}

export function href(path: string, locale: Locale): string {
  if (path.startsWith("#") || /^[a-z]+:/.test(path)) return path;
  const [base, suffix = ""] = path.split(/(?=[?#])/);
  const canon = canonicalPath(base, locale);
  const effectiveLocale = canon in PATH_LOCALES && !hasLocale(canon, locale) ? DEFAULT_LOCALE : locale;
  const localised = PATH_ALIAS[effectiveLocale]?.[canon] ?? canon;
  const clean = localised === "/" ? "" : localised;
  return `${`${prefix(effectiveLocale)}${clean}` || "/"}${suffix}`;
}

export const LOCALE_LABEL: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  fr: "Français",
  pl: "Polski",
  ja: "日本語",
};

export const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  de: "DE",
  es: "ES",
  pt: "PT",
  fr: "FR",
  pl: "PL",
  ja: "JA",
};

export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  de: "de",
  es: "es",
  pt: "pt",
  fr: "fr",
  pl: "pl",
  ja: "ja",
};

export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  de: "de_DE",
  es: "es_ES",
  pt: "pt_BR",
  fr: "fr_FR",
  pl: "pl_PL",
  ja: "ja_JP",
};

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
  nav: { docs: string; guides: string; demo: string; live: string; pricing: string; login: string; dashboard: string; websites: string; changelog: string };
  menu: string;
  langLabel: string;
  copy: string;
  copied: string;
  foot: {
    product: string;
    websites: string;
    changelog: string;
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
    tagline: string;
    monitoring: string;
    sitesTitle: string;
    builtBy: string;
    onX: string;
    operated: string;
  };
};

export const DICT: Record<Locale, Dict> = {
  en: {
    nav: { docs: "Docs", guides: "Guides", demo: "Demo", live: "Live stats", pricing: "Pricing", login: "Sign in", dashboard: "Dashboard", websites: "Websites", changelog: "Changelog" },
    menu: "Menu",
    langLabel: "Language",
    copy: "Copy",
    copied: "Copied ✓",
    foot: {
      product: "Product",
      websites: "AI agents on your website",
      changelog: "Changelog",
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
      tagline: "Know which of your agents needs you: Claude Code sessions, cron jobs and your own agents on one list.",
      monitoring: "Agent monitoring",
      sitesTitle: "Free website tool",
      builtBy: "Built by",
      onX: "on X",
      operated: "Servers in Germany (EU)",
    },
  },
  de: {
    nav: { docs: "Doku", guides: "Guides", demo: "Demo", live: "Live-Stats", pricing: "Preise", login: "Anmelden", dashboard: "Dashboard", websites: "Websites", changelog: "Changelog" },
    menu: "Menü",
    langLabel: "Sprache",
    copy: "Kopieren",
    copied: "Kopiert ✓",
    foot: {
      product: "Produkt",
      websites: "KI-Agenten auf deiner Website",
      changelog: "Changelog",
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
      tagline: "Wisse, welcher deiner Agents dich braucht: Claude-Code-Sessions, Cron-Jobs und eigene Agents in einer Liste.",
      monitoring: "Agent-Monitoring",
      sitesTitle: "Kostenloses Website-Tool",
      builtBy: "Gebaut von",
      onX: "auf X",
      operated: "Server in Deutschland (EU)",
    },
  },
  es: {
    nav: { docs: "Docs", guides: "Guías", demo: "Demo", live: "Estadísticas", pricing: "Precios", login: "Entrar", dashboard: "Panel", websites: "Sitios web", changelog: "Novedades" },
    menu: "Menú",
    langLabel: "Idioma",
    copy: "Copiar",
    copied: "Copiado ✓",
    foot: {
      product: "Producto",
      websites: "Agentes de IA en tu web",
      changelog: "Novedades",
      docs: "Documentación",
      demo: "Demo interactiva",
      pricing: "Planes",
      login: "Entrar",
      api: "API de estadísticas y MCP",
      guides: "Guías",
      live: "Estadísticas en vivo",
      selfHost: "Autoalojamiento",
      source: "Código en GitHub",
      legal: "Legal",
      imprint: "Aviso legal",
      privacy: "Privacidad",
      terms: "Términos",
      dpa: "Acuerdo DPA",
      note: "Código abierto AGPL-3.0. Alojado en Alemania.",
      check: "Verificador de agentes en webmcp-tool.com",
      tagline: "Freno local, auditoría MCP y monitoreo zero-prompt para Claude Code, Cursor, Codex, Gemini, Antigravity y tareas cron.",
      monitoring: "Monitoreo de agentes",
      sitesTitle: "Herramienta web gratis",
      builtBy: "Creado por",
      onX: "en X",
      operated: "Servidores en Alemania (UE)",
    },
  },
  pt: {
    nav: { docs: "Docs", guides: "Guias", demo: "Demo", live: "Estatísticas", pricing: "Preços", login: "Entrar", dashboard: "Painel", websites: "Websites", changelog: "Changelog" },
    menu: "Menu",
    langLabel: "Idioma",
    copy: "Copiar",
    copied: "Copiado ✓",
    foot: {
      product: "Produto",
      websites: "Agentes de IA no seu site",
      changelog: "Changelog",
      docs: "Documentação",
      demo: "Página demo",
      pricing: "Planos",
      login: "Entrar",
      api: "API de estatísticas e MCP",
      guides: "Guias",
      live: "Estatísticas ao vivo",
      selfHost: "Auto-hospedagem",
      source: "Código no GitHub",
      legal: "Legal",
      imprint: "Aviso legal",
      privacy: "Privacidade",
      terms: "Termos",
      dpa: "Acordo DPA",
      note: "Código aberto AGPL-3.0. Hospedado na Alemanha.",
      check: "Verificador de agentes em webmcp-tool.com",
      tagline: "Disjuntor local, auditoria MCP e monitoramento zero-prompt para Claude Code, Cursor, Codex, Gemini, Antigravity e cron jobs.",
      monitoring: "Monitoramento de agentes",
      sitesTitle: "Ferramenta web grátis",
      builtBy: "Criado por",
      onX: "no X",
      operated: "Servidores na Alemanha (UE)",
    },
  },
  fr: {
    nav: { docs: "Docs", guides: "Guides", demo: "Démo", live: "Stats en direct", pricing: "Tarifs", login: "Connexion", dashboard: "Tableau de bord", websites: "Sites web", changelog: "Nouveautés" },
    menu: "Menu",
    langLabel: "Langue",
    copy: "Copier",
    copied: "Copié ✓",
    foot: {
      product: "Produit",
      websites: "Agents IA sur votre site",
      changelog: "Nouveautés",
      docs: "Documentation",
      demo: "Page démo",
      pricing: "Tarifs",
      login: "Connexion",
      api: "API de stats et MCP",
      guides: "Guides",
      live: "Statistiques en direct",
      selfHost: "Auto-hébergement",
      source: "Code source GitHub",
      legal: "Mentions légales",
      imprint: "Mentions",
      privacy: "Confidentialité",
      terms: "CGU",
      dpa: "Accord DPA (RGPD)",
      note: "Open source AGPL-3.0. Hébergé en Allemagne.",
      check: "Test de compatibilité webmcp-tool.com",
      tagline: "Coupe-circuit local, audit MCP et supervision zéro-prompt pour Claude Code, Cursor, Codex, Gemini, Antigravity et tâches cron.",
      monitoring: "Supervision d’agents",
      sitesTitle: "Outil web gratuit",
      builtBy: "Créé par",
      onX: "sur X",
      operated: "Serveurs en Allemagne (UE)",
    },
  },
  pl: {
    nav: { docs: "Dokumentacja", guides: "Poradniki", demo: "Demo", live: "Statystyki", pricing: "Cennik", login: "Zaloguj się", dashboard: "Panel", websites: "Strony WWW", changelog: "Zmiany" },
    menu: "Menu",
    langLabel: "Język",
    copy: "Kopiuj",
    copied: "Skopiowano ✓",
    foot: {
      product: "Produkt",
      websites: "Agenci AI na Twojej stronie",
      changelog: "Lista zmian",
      docs: "Dokumentacja",
      demo: "Strona demo",
      pricing: "Plany",
      login: "Zaloguj się",
      api: "API statystyk i MCP",
      guides: "Poradniki",
      live: "Statystyki na żywo",
      selfHost: "Self-hosting",
      source: "Kod na GitHubie",
      legal: "Informacje prawne",
      imprint: "Nota prawna",
      privacy: "Prywatność",
      terms: "Regulamin",
      dpa: "Umowa DPA (RODO)",
      note: "Open source AGPL-3.0. Hosting w Niemczech.",
      check: "Test gotowości agentów webmcp-tool.com",
      tagline: "Lokalny wyłącznik bezpieczeństwa, audyt MCP i monitoring zero-prompt dla Claude Code, Cursor, Codex, Gemini, Antigravity i crona.",
      monitoring: "Monitoring agentów",
      sitesTitle: "Darmowe narzędzie WWW",
      builtBy: "Stworzył",
      onX: "na X",
      operated: "Serwery w Niemczech (UE)",
    },
  },
  ja: {
    nav: { docs: "ドキュメント", guides: "ガイド", demo: "デモ", live: "ライブ統計", pricing: "料金", login: "ログイン", dashboard: "ダッシュボード", websites: "Webサイト", changelog: "更新履歴" },
    menu: "メニュー",
    langLabel: "言語",
    copy: "コピー",
    copied: "コピー済 ✓",
    foot: {
      product: "プロダクト",
      websites: "Webサイト向けAI分析",
      changelog: "更新履歴",
      docs: "ドキュメント",
      demo: "デモページ",
      pricing: "料金プラン",
      login: "ログイン",
      api: "統計APIとMCP",
      guides: "ガイド",
      live: "このサイトの統計",
      selfHost: "セルフホスト",
      source: "GitHubソースコード",
      legal: "法的情報",
      imprint: "運営者情報",
      privacy: "プライバシー",
      terms: "利用規約",
      dpa: "データ処理契約(DPA)",
      note: "AGPL-3.0 オープンソース。ドイツ(EU)サーバー運用。",
      check: "webmcp-tool.com エージェント診断",
      tagline: "Claude Code・Cursor・Codex・Gemini・Antigravity・Cronのためのローカル保護ブレーカー、MCPセキュリティ監査、ゼロプロンプト監視。",
      monitoring: "エージェント監視",
      sitesTitle: "無料Webサイト分析",
      builtBy: "開発者",
      onX: "(X)",
      operated: "ドイツ(EU)サーバー運用",
    },
  },
};

export function t(locale: Locale): Dict {
  return DICT[locale];
}
