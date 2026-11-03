import type { Metadata } from "next";
import Changelog from "@/components/Changelog";
import { alternatesFor } from "@/lib/i18n";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new in Agent Tracking, with a copy-paste command or Claude Code prompt for every change. Next up: Codex, Hermes and OpenClaw.",
  alternates: alternatesFor("/changelog"),
  openGraph: { title: "Agent Tracking changelog", description: "What's new, and how to use it.", url: "/changelog", type: "website" },
};

export default function Page() {
  return <Changelog lang="en" />;
}
