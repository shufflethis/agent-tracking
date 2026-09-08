import type { MetadataRoute } from "next";
import { href, LOCALES, pathsIn } from "@/lib/i18n";
import { SITE_ORIGIN } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const out: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) {
    for (const path of pathsIn(locale)) {
      if (path === "/login") continue;
      out.push({ url: `${SITE_ORIGIN}${href(path, locale)}`, changeFrequency: path === "/" ? "weekly" : "monthly", priority: path === "/" ? 1 : 0.6 });
    }
  }
  return out;
}
