import assert from "node:assert/strict";
import { test } from "node:test";
import { counterpart, guides } from "./guides";
import { guideTranslations, workflowLinks } from "./guide-links";
import { href, LOCALES, pathsIn } from "./i18n";
import { homeContent, faqSchema } from "./home-content";

test("all guide translations are reciprocal and all related links resolve", () => {
  const translations = guideTranslations();
  for (const lang of LOCALES) for (const guide of guides(lang)) {
    const other = counterpart(lang, guide.slug);
    assert.ok(other, guide.slug);
    assert.equal(counterpart(lang === "de" ? "en" : "de", other.slug)?.slug, guide.slug);
    for (const slug of guide.related) assert.ok(guides(lang).some(g => g.slug === slug), `${guide.slug} -> ${slug}`);
    const path = `${lang === "de" ? "/de" : ""}/guides/${guide.slug}`;
    assert.equal(translations[translations[path]], path);
  }
});
test("editorial internal links target existing public pages and stay in the guide language", () => {
  const valid = new Set(LOCALES.flatMap(lang => [...pathsIn(lang).map(p => href(p, lang)), ...guides(lang).map(g => `${lang === "de" ? "/de" : ""}/guides/${g.slug}`)]));
  for (const lang of LOCALES) {
    const links = [...workflowLinks(lang).map(l => l.href)];
    for (const guide of guides(lang)) for (const section of guide.sections) for (const p of section.p) {
      for (const match of p.matchAll(/\[[^\]]+\]\((\/[^)]+)\)/g)) links.push(match[1]);
    }
    for (const link of links) {
      const path = link.split(/[?#]/)[0]; assert.ok(valid.has(path), link);
      if (path.includes('/guides/')) assert.equal(path.startsWith('/de/'), lang === "de", link);
    }
    assert.equal(faqSchema(homeContent(lang)).mainEntity.length, homeContent(lang).faq.length);
  }
});
