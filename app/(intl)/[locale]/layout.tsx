import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RootShell from "@/components/RootShell";
import { EXTRA_LOCALES, isExtraLocale, OG_LOCALE } from "@/lib/i18n";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return EXTRA_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isExtraLocale(locale)) return {};
  return {
    metadataBase: new URL(SITE_ORIGIN),
    openGraph: { type: "website", siteName: SITE_NAME, locale: OG_LOCALE[locale] },
  };
}

/** Root layout for ES, PT, FR, PL and JA landing pages so <html lang> is exact. */
export default async function IntlRootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isExtraLocale(locale)) notFound();
  return <RootShell locale={locale}>{children}</RootShell>;
}
