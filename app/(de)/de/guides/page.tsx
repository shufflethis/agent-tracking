import type { Metadata } from "next";
import GuideIndex from "@/components/GuideIndex";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Guides: KI-Agenten auf der Website messen",
  description: "Wie man das Verhalten von KI-Agenten misst, sieht, ob Agenten auf der Site kaufen, weiß, welche Assistenten Besucher schicken, KI-Crawler verifiziert, MCP- und WebMCP-Tool-Aufrufe erfasst, und das ohne Cookie-Banner.",
  alternates: { canonical: "/de/guides", languages: { en: "/guides", de: "/de/guides", "x-default": "/guides" } },
};

export default function Page() {
  return <GuideIndex lang="de" />;
}
