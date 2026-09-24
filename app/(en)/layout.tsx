import type { Metadata } from "next";
import RootShell from "@/components/RootShell";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: `${SITE_NAME}: measure agents on your site`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Recognized assistant referrals and supported browser WebMCP observations, with optional crawler logs and server-confirmed outcome receipts. Evidence limits stay visible. Open source.",
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GB" },
};

/** English tree. The route group keeps these pages at the root URLs. */
export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
