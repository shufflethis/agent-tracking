import type { MetadataRoute } from "next";
import { counterpart, guides } from "@/lib/guides";
import { href, LOCALES, pathsIn, alternatesFor } from "@/lib/i18n";
import { LEGAL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";

export const revalidate = 3600;

/** Pages that exist but must not be offered to crawlers: the dashboard entry and the noindex demo. */
const NOT_LISTED = new Set(["/login", "/demo"]);

export default function sitemap(): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  const revised = new Date(LEGAL.revised);
  for (const locale of LOCALES) {
    for (const path of pathsIn(locale)) {
      if (NOT_LISTED.has(path)) continue;
      out.push({ url: `${SITE_ORIGIN}${href(path, locale)}`, lastModified: ["/", "/docs", "/guides"].includes(path) ? new Date("2026-09-25") : revised, alternates: { languages: Object.fromEntries(Object.entries(alternatesFor(path).languages ?? {}).map(([lang, url]) => [lang, `${SITE_ORIGIN}${url}`])) } });
    }
  }
  for (const lang of LOCALES) for (const g of guides(lang)) {
    const other = counterpart(lang, g.slug);
    const url = `${SITE_ORIGIN}${lang === "de" ? "/de" : ""}/guides/${g.slug}`;
    const otherUrl = other ? `${SITE_ORIGIN}${lang === "de" ? "" : "/de"}/guides/${other.slug}` : null;
    out.push({ url, lastModified: new Date(g.updated), alternates: { languages: { [lang]: url, ...(otherUrl ? { [lang === "de" ? "en" : "de"]: otherUrl } : {}), "x-default": lang === "en" ? url : otherUrl ?? url } } });
  }
  // This installation's own public stats page, the live demo. Other sites' stats pages are private unless their owner publishes them, and are not listed.
  out.push({ url: `${SITE_ORIGIN}/stats/${SITE_HOST}` });
  return out;
}
