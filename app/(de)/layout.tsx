import type { Metadata } from "next";
import RootShell from "@/components/RootShell";
import { SITE_NAME, SITE_ORIGIN } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_ORIGIN),
  title: {
    default: `${SITE_NAME}: Agenten auf Ihrer Website messen`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Eine Zeile Script zeigt, welche KI-Assistenten Besucher schicken, welche Agenten Ihre Seiten abrufen, welche WebMCP-Tools sie aufrufen und ob sie ans Ziel kommen. Keine Cookies, keine personenbezogenen Daten. Open Source, gehostet in Deutschland.",
  openGraph: { type: "website", siteName: SITE_NAME, locale: "de_DE" },
};

/** German tree, its own root layout so <html lang> is actually "de". */
export default function DeRootLayout({ children }: { children: React.ReactNode }) {
  return <RootShell locale="de">{children}</RootShell>;
}
