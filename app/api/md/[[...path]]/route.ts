import { guideBySlug, guides } from "@/lib/guides";
import { homeContent } from "@/lib/home-content";
import { GITHUB_URL, SITE_HOST, SITE_ORIGIN } from "@/lib/site";
import type { DashLang } from "@/lib/tracking/copy";
import { snippetFor } from "@/lib/tracking/snippet";

export const revalidate = 3600;

const HEADERS = { "content-type": "text/markdown; charset=utf-8", vary: "Accept", "cache-control": "public, max-age=3600" };

const rows = (r: { k: string; t: string; d: string }[]) => r.map((x) => `- **${x.k}: ${x.t}.** ${x.d}`).join("\n");

function home(lang: DashLang): string {
  const c = homeContent(lang);
  const base = lang === "de" ? "/de" : "";
  return [
    `# ${lang === "de" ? "Agent Tracking: KI-Agenten-Analytics für Websites" : "Agent Tracking: AI agent analytics for websites"}`,
    "",
    `> ${c.definition}`,
    "",
    c.definitionMore,
    "",
    `Source: ${SITE_ORIGIN}${base || "/"} · ${lang === "de" ? "Doku" : "Docs"}: ${SITE_ORIGIN}${base}/docs · Guides: ${SITE_ORIGIN}${base}/guides · Code: ${GITHUB_URL}`,
    "",
    `## ${c.notTitle}`, "", c.notDek, "", rows(c.not), "",
    `## ${c.seesTitle}`, "", rows(c.sees), "", c.seesScore, "",
    `## ${c.fightTitle}`, "", c.fightDek, "", rows(c.fight), "",
    `## ${c.whoTitle}`, "", rows(c.who), "",
    `## ${c.useTitle}`, "", c.useDek, "", rows(c.use), "",
    `## ${c.whyTitle}`, "", c.whyDek, "",
    `| | ${c.compareHead.us} | ${c.compareHead.analytics} | ${c.compareHead.cdn} | ${c.compareHead.logs} | ${c.compareHead.saas} |`,
    "| --- | --- | --- | --- | --- | --- |",
    ...c.compare.map((r) => `| ${r.label} | ${r.us} | ${r.analytics} | ${r.cdn} | ${r.logs} | ${r.saas} |`),
    "",
    `## ${c.euTitle}`, "", rows(c.eu), "",
    `## ${c.valueTitle}`, "", rows(c.value), "",
    `## ${lang === "de" ? "Installation" : "Install"}`, "", "```html", snippetFor("example.com"), "```", "",
    `## ${c.faqTitle}`, "", ...c.faq.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
  ].join("\n");
}

function guide(lang: DashLang, slug: string): string | null {
  const g = guideBySlug(lang, slug);
  if (!g) return null;
  const base = lang === "de" ? "/de/guides" : "/guides";
  return [
    `# ${g.question}`, "", `> ${g.summary}`, "", `Source: ${SITE_ORIGIN}${base}/${g.slug} · ${lang === "de" ? "Stand" : "Updated"} ${g.updated}`, "",
    ...g.sections.flatMap((s) => [`## ${s.h}`, "", ...s.p.flatMap((p) => [p, ""]), ...(s.code ? ["```" + (s.codeLang ?? ""), s.code, "```", ""] : [])]),
    `## ${lang === "de" ? "Kurz gefragt" : "In short"}`, "", ...g.faq.flatMap((f) => [`### ${f.q}`, "", f.a, ""]),
  ].join("\n");
}

function guideIndex(lang: DashLang): string {
  const base = lang === "de" ? "/de/guides" : "/guides";
  return [`# ${lang === "de" ? "Guides: KI-Agenten auf der Website messen" : "Guides: how to measure AI agents on your website"}`, "", ...guides(lang).map((g) => `- [${g.question}](${SITE_ORIGIN}${base}/${g.slug}): ${g.summary}`)].join("\n");
}

function docs(lang: DashLang): string {
  const c = homeContent(lang);
  return [
    `# ${lang === "de" ? "Agent Tracking Dokumentation" : "Agent Tracking documentation"}`, "",
    `> ${c.definition}`, "",
    `Full text: ${SITE_ORIGIN}${lang === "de" ? "/de/docs" : "/docs"} · Everything on one page: ${SITE_ORIGIN}/llms-full.txt`, "",
    `## ${lang === "de" ? "Installation" : "Install"}`, "", "```html", snippetFor("example.com"), "```", "",
    lang === "de"
      ? "Site im Dashboard anlegen, das Snippet auf jede Seite, Prüfen drücken. Über navigator.modelContext registrierte Tools werden automatisch erfasst; deklarative Tools sind Formulare mit toolname; data-agent-goal markiert eine Conversion. Server-Logs für Crawler ohne JavaScript per Upload oder POST /api/logs/{domain} mit dem API-Token."
      : "Add the site in the dashboard, put the snippet on every page, press verify. Tools registered through navigator.modelContext are recorded automatically; declarative tools are forms with a toolname; data-agent-goal marks a conversion. Server logs for crawlers that do not run JavaScript: upload, or POST /api/logs/{domain} with the API token.",
    "",
    "## Stats API and MCP", "",
    `- GET ${SITE_ORIGIN}/api/stats/{domain}?days=30 with Authorization: Bearer <token>`,
    `- GET ${SITE_ORIGIN}/api/stats lists the token's sites; GET ${SITE_ORIGIN}/api/export/{domain} is CSV`,
    `- MCP: POST ${SITE_ORIGIN}/api/mcp, tool get_agent_stats · card ${SITE_ORIGIN}/.well-known/mcp.json · OpenAPI ${SITE_ORIGIN}/openapi.json`,
    "",
    `## ${c.seesTitle}`, "", rows(c.sees),
  ].join("\n");
}

export async function GET(_request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path: segments } = await params;
  const path = "/" + (segments ?? []).join("/");
  let body: string | null = null;
  if (path === "/home") body = home("en");
  else if (path === "/de") body = home("de");
  else if (path === "/docs") body = docs("en");
  else if (path === "/de/docs") body = docs("de");
  else if (path === "/guides") body = guideIndex("en");
  else if (path === "/de/guides") body = guideIndex("de");
  else if (path.startsWith("/guides/")) body = guide("en", path.slice("/guides/".length));
  else if (path.startsWith("/de/guides/")) body = guide("de", path.slice("/de/guides/".length));
  if (!body) return new Response(`# ${SITE_HOST}\n\nNo Markdown representation for ${path}. Start at ${SITE_ORIGIN}/llms.txt.`, { status: 404, headers: HEADERS });
  return new Response(body, { headers: HEADERS });
}
