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
    "One line of script shows which AI assistants send visitors, which agents fetch your pages, which WebMCP tools they call and whether they finish. No cookies, no personal data. Open source, hosted in Germany.",
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_GB" },
};

/** English tree. The route group keeps these pages at the root URLs. */
export default function EnRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="en">{children}</RootShell>;
}
