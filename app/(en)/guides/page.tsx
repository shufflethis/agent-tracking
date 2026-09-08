import type { Metadata } from "next";
import GuideIndex from "@/components/GuideIndex";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Guides: how to measure AI agents on your website",
  description: "How to measure AI agent behaviour, see whether agents buy on your site, know which assistants send visitors, verify AI crawlers, track MCP and WebMCP tool calls, and do it without a cookie banner.",
  alternates: { canonical: "/guides", languages: { en: "/guides", de: "/de/guides", "x-default": "/guides" } },
};

export default function Page() {
  return <GuideIndex lang="en" />;
}
