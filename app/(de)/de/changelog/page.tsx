import type { Metadata } from "next";
import Changelog from "@/components/Changelog";
import { alternatesForLocale } from "@/lib/i18n";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Changelog",
  description: "Was neu ist bei Agent Tracking, mit einem Befehl oder Claude-Code-Prompt zum Kopieren für jede Änderung. Als Nächstes: Codex, Hermes und OpenClaw.",
  alternates: alternatesForLocale("/changelog", "de"),
  openGraph: { title: "Agent Tracking Changelog", description: "Was neu ist, und wie du es nutzt.", url: "/de/changelog", type: "website" },
};

export default function Page() {
  return <Changelog lang="de" />;
}
