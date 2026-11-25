import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MonitoringHome from "@/components/MonitoringHome";
import { getMonitoringHomeCopy } from "@/lib/home-i18n";
import { alternatesForLocale, EXTRA_LOCALES, HTML_LANG, isExtraLocale, OG_LOCALE } from "@/lib/i18n";
import { AUTHOR, BUILDER, SITE_ORIGIN } from "@/lib/site";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return EXTRA_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isExtraLocale(locale)) return {};
  const { meta } = getMonitoringHomeCopy(locale);
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: alternatesForLocale("/", locale),
    robots: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    openGraph: {
      title: meta.ogTitle,
      description: meta.description,
      url: `/${locale}`,
      type: "website",
      locale: OG_LOCALE[locale],
      images: [{ url: "/img/agents/guard-architecture.jpg", width: 1200, height: 675, alt: meta.ogAlt }],
    },
    twitter: {
      card: "summary_large_image",
      ...(AUTHOR.name && BUILDER.handle ? { creator: `@${BUILDER.handle}` } : {}),
      images: ["/img/agents/guard-architecture.jpg"],
    },
  };
}

export default async function IntlHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isExtraLocale(locale)) notFound();
  const { meta } = getMonitoringHomeCopy(locale);

  const pageLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SITE_ORIGIN}/${locale}#webpage`,
      url: `${SITE_ORIGIN}/${locale}`,
      name: meta.title,
      description: meta.description,
      inLanguage: HTML_LANG[locale],
      dateModified: "2026-11-25",
      isPartOf: { "@id": `${SITE_ORIGIN}/#site` },
      about: { "@id": `${SITE_ORIGIN}/#app` },
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "@id": `${SITE_ORIGIN}/${locale}#software`,
      name: "Agent Tracking",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "macOS, Linux",
      url: `${SITE_ORIGIN}/${locale}`,
      inLanguage: HTML_LANG[locale],
      description: meta.description,
      license: "https://www.gnu.org/licenses/agpl-3.0.en.html",
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Pro", price: "9", priceCurrency: "USD" },
        { "@type": "Offer", name: "Team & Governance", price: "99", priceCurrency: "USD" },
      ],
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageLd) }} />
      <MonitoringHome lang={locale} />
    </>
  );
}
