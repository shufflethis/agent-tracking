import type { Locale } from "@/lib/i18n";
import { COPY_DE, COPY_EN } from "./en-de";
import { COPY_ES, COPY_PT } from "./es-pt";
import { COPY_FR, COPY_PL } from "./fr-pl";
import { COPY_JA } from "./ja";
import type { MonitoringHomeCopy } from "./types";

const HOME_COPY: Record<Locale, MonitoringHomeCopy> = {
  en: COPY_EN,
  de: COPY_DE,
  es: COPY_ES,
  pt: COPY_PT,
  fr: COPY_FR,
  pl: COPY_PL,
  ja: COPY_JA,
};

export function getMonitoringHomeCopy(lang: Locale): MonitoringHomeCopy {
  return HOME_COPY[lang] ?? COPY_EN;
}

export function monitoringFaqSchema(lang: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: getMonitoringHomeCopy(lang).faq.map((f) => ({
      "@type": "Question",
      name: f.q.replace(/`/g, ""),
      acceptedAnswer: { "@type": "Answer", text: f.a.replace(/`/g, "") },
    })),
  };
}

export type { MonitoringHomeCopy } from "./types";
