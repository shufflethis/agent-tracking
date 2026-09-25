import { counterpart, guides } from "./guides";
import type { DashLang } from "./tracking/copy";

/** Only route pairs cross the client boundary, never the full article content. */
export function guideTranslations(): Record<string, string> {
  return Object.fromEntries((["en", "de"] as const).flatMap(lang => guides(lang).flatMap(g => {
    const other = counterpart(lang, g.slug);
    return other ? [[`${lang === "de" ? "/de" : ""}/guides/${g.slug}`, `${lang === "de" ? "" : "/de"}/guides/${other.slug}`]] : [];
  })));
}
export function workflowLinks(lang: DashLang) {
  return lang === "de" ? [
    { href: "/de/guides/geo-aeo-messung-playbook", label: "GEO-/AEO-Playbook: messen, entscheiden, nachtesten" },
    { href: "/de/guides/ki-anfrageablauf-testen-und-korrekturen-belegen", label: "Anfrageabläufe testen und Korrekturen belegen" },
    { href: "/de/docs#server-outcomes", label: "Serverbestätigungen einrichten" },
  ] : [
    { href: "/guides/geo-aeo-measurement-playbook", label: "GEO/AEO playbook: measure, decide, retest" },
    { href: "/guides/test-ai-inquiry-flows-and-verify-fixes", label: "Test inquiry flows and verify fixes" },
    { href: "/docs#server-outcomes", label: "Set up server confirmations" },
  ];
}
