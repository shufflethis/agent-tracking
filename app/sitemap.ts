import type { MetadataRoute } from "next";
import { href, LOCALES, pathsIn } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/site";
import { guides } from "@/lib/guides";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) {
    for (const path of pathsIn(locale)) {
      if (path === "/login") continue;
      out.push({ url: `${SITE_ORIGIN}${href(path, locale)}`, changeFrequency: path === "/" ? "weekly" : "monthly", priority: path === "/" ? 1 : 0.6 });
    }
  }
  out.push({ url: `${SITE_ORIGIN}/guides`, changeFrequency: "weekly", priority: 0.8 }, { url: `${SITE_ORIGIN}/de/guides`, changeFrequency: "weekly", priority: 0.7 });
  for (const g of guides("en")) out.push({ url: `${SITE_ORIGIN}/guides/${g.slug}`, changeFrequency: "monthly", priority: 0.7 });
  for (const g of guides("de")) out.push({ url: `${SITE_ORIGIN}/de/guides/${g.slug}`, changeFrequency: "monthly", priority: 0.6 });
  return out;
}
