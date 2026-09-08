import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GuideView from "@/components/GuideView";
import { counterpart, guideBySlug } from "@/lib/guides";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const g = guideBySlug("de", slug);
  if (!g) return {};
  const en = counterpart("de", slug);
  return {
    title: g.question,
    description: g.summary.length > 158 ? g.summary.slice(0, 155).replace(/\s+\S*$/, "") + "…" : g.summary,
    alternates: { canonical: `/de/guides/${g.slug}`, languages: { de: `/de/guides/${g.slug}`, ...(en ? { en: `/guides/${en.slug}` } : {}), "x-default": en ? `/guides/${en.slug}` : `/de/guides/${g.slug}` } },
    openGraph: { title: g.question, description: g.summary, type: "article" },
  };
}

export default async function Page({ params }: Params) {
  const { slug } = await params;
  const g = guideBySlug("de", slug);
  if (!g) notFound();
  return <GuideView lang="de" guide={g} />;
}
