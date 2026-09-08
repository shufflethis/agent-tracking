import type { MetadataRoute } from "next";
import { guides } from "@/lib/guides";
import { href, LOCALES, pathsIn } from "@/lib/i18n";
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
      out.push({ url: `${SITE_ORIGIN}${href(path, locale)}`, lastModified: revised });
    }
  }
  for (const g of guides("en")) out.push({ url: `${SITE_ORIGIN}/guides/${g.slug}`, lastModified: new Date(g.updated) });
  for (const g of guides("de")) out.push({ url: `${SITE_ORIGIN}/de/guides/${g.slug}`, lastModified: new Date(g.updated) });
  // This installation's own public stats page, the live demo. Other sites' stats pages are private unless their owner publishes them, and are not listed.
  out.push({ url: `${SITE_ORIGIN}/stats/${SITE_HOST}`, lastModified: new Date() });
  return out;
}
