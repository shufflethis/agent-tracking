import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideView from "@/components/GuideView";
import { counterpart, guideBySlug, guides } from "@/lib/guides";

export const revalidate = 3600;

type Params = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return guides("en").map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug("en", slug);
  if (!g) return {};
  const de = counterpart("en", slug);
  return {
    title: g.question,
    description: g.summary.length > 158 ? g.summary.slice(0, 155).replace(/\s+\S*$/, "") + "…" : g.summary,
    alternates: { canonical: `/guides/${g.slug}`, languages: { en: `/guides/${g.slug}`, ...(de ? { de: `/de/guides/${de.slug}` } : {}), "x-default": `/guides/${g.slug}` } },
    openGraph: { title: g.question, description: g.summary, type: "article" },
  };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const g = guideBySlug("en", slug);
  if (!g) notFound();
  return <GuideView lang="en" guide={g} />;
}
