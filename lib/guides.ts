import type { DashLang } from "@/lib/tracking/copy";
import { WORKFLOW_GUIDES_DE, WORKFLOW_GUIDES_EN } from "./workflow-guides";
import { SEO_GUIDES_DE, SEO_GUIDES_EN } from "@/lib/seo-guides";

/**
 * Question-shaped guides: each answers one thing a person types into a search
 * box or asks an assistant, in the words they use. One structure in both
 * languages, rendered by app/(en)/guides and app/(de)/de/guides, listed in
 * llms.txt, with Article and FAQ schema on each page.
 */

export type GuideSection = { h: string; p: string[]; code?: string; codeLang?: string };
export type Guide = {
  slug: string;
  question: string;
  title: string;
  summary: string;
  sections: GuideSection[];
  faq: { q: string; a: string }[];
  related: string[];
  /** Original publication date when the article has since been revised. */
  published?: string;
  /** ISO date of the last substantive change, for lastmod and dateModified. */
  updated: string;
};

const SNIPPET = `<script defer data-domain="example.com" src="https://agenttracking.co/agent.js"></script>`;
const GOAL = `<button type="submit" data-agent-goal="order_placed">Place order</button>`;
const TOOL = `await navigator.modelContext.registerTool({
  name: "add_to_cart",
  description: "Add a product to the cart by SKU.",
  inputSchema: { type: "object", properties: { sku: { type: "string" }, qty: { type: "integer" } }, required: ["sku"] },
  execute: async ({ sku, qty }) => { /* your code */ },
});`;
const LOG = `curl -sS -X POST https://agenttracking.co/api/logs/example.com \\
  -H "Authorization: Bearer wmt_your_token" \\
  -H "Content-Type: text/plain" --data-binary @/var/log/nginx/access.log`;
const MCP = `{ "mcpServers": { "agent-tracking": { "url": "https://agenttracking.co/api/mcp",
  "headers": { "Authorization": "Bearer wmt_your_token" } } } }`;

const EN: Guide[] = [
  {
    slug: "measure-ai-agent-behaviour-on-your-website",
    question: "How do I measure what AI agents do on my website?",
    title: "How to measure AI agent behaviour on your website",
    summary:
      "Recognized referrals, crawler requests and browser-visible tool calls are separate evidence sources. Logs and optional site-server receipts add context that a browser snippet cannot provide alone.",
    sections: [
      { h: "What counts as observed activity", p: ["Crawler requests, identifiable assistant referrals and instrumented tool calls have different meanings. Nearby requests form a burst, but do not reveal a question; a browser tool call does not prove who initiated it.", "Keep the event source, page or tool and evidence level alongside each count."] },
      { h: "Step 1: browser snippet", p: ["Add your site and install the snippet. It records recognized assistant referrals, supported browser WebMCP activity and goal attempts. It sets no cookies and does not store raw network addresses. Remote MCP calls and confirmed outcomes require separate server integrations."], code: SNIPPET, codeLang: "html" },
      { h: "Step 2: your server log for crawlers", p: ["Most crawler requests do not run JavaScript. Upload an origin access log or send it through the authenticated log endpoint. Supported bot claims are checked against current published ranges; absent or failed verification is shown separately and is not proof of malicious intent."], code: LOG, codeLang: "sh" },
      { h: "Step 3: read the evidence", p: ["Overview separates referrals, fetch claims, verified HTML requests, observed tool calls, browser attempts and server receipts. Agents shows source and verification status; Tools shows technical outcomes; Pages shows requested paths.", "A burst needs distinct relevant paths close together in one import batch. It does not reveal a question or intent."] },
      { h: "Step 4: use protected exports", p: ["Authorized readers can query site metrics as JSON or through the MCP read endpoint. Ask for verified fetches and observed tool failures, keeping unknown bot identity explicit."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Can I measure agents without a script on the page?", a: "Partly. The server log gives you crawler fetches and bursts. Referrals and tool calls happen in the browser and need the snippet." },
      { q: "Does it slow the site down?", a: "The snippet loads with defer and sends small batches with sendBeacon. Its current minified size is reported by the build; measure performance on your own pages." },
    ],
    related: ["ai-agent-traffic-website-measurement-guide", "which-ai-assistants-send-visitors", "which-ai-crawlers-read-my-pages"],
    published: "2026-09-08",
    updated: "2026-09-25",
  },
  {
    slug: "see-whether-ai-agents-buy-on-your-site",
    question: "How do I see whether AI agents buy on my site?",
    title: "How to see whether AI agents buy, book or sign up on your site",
    summary:
      "Mark a browser goal attempt with data-agent-goal. To confirm a successful inquiry or booking, send an authenticated receipt from your backend after the business operation succeeds. Agent identity remains a separate evidence question.",
    sections: [
      { h: "Why a tool call is not a sale", p: ["A tool can complete technically while the business operation still fails. Browser goal markers are attempts, and only a matching site-server receipt can confirm a created inquiry or booking. The counts have different denominators."] },
      { h: "Step 1: mark the attempt", p: ["Put data-agent-goal on the relevant action. A click or submit records an observed attempt with its goal name. It is not a completed sale or proof of an agent actor."], code: GOAL, codeLang: "html" },
      { h: "Step 2: observe supported tools", p: ["If the browser exposes supported WebMCP APIs while the snippet is active, calls yield technical outcomes and duration. Argument values and arbitrary key names are not stored. Remote MCP calls need a server adapter."], code: TOOL, codeLang: "js" },
      { h: "Step 3: compare separate states", p: ["The overview shows tool technical outcomes, browser goal attempts and server-confirmed receipts separately. Their difference is not a conversion rate without individually linked attempts and outcomes."] },
      { h: "What you will not see", p: ["The standard receipt excludes customer, order and payment contents. A browser marker cannot establish revenue or an agent actor. Do not attribute revenue by matching timestamps alone."] },
    ],
    faq: [
      { q: "Does this work without WebMCP tools?", a: "Yes. data-agent-goal works on any button or form. Tool calls are the extra layer for sites that publish tools." },
      { q: "Can a person trigger a goal marker?", a: "Yes. Browser goal attempts can be triggered by people. Referral source is not agent identity; a site-server receipt confirms the business result separately." },
    ],
    related: ["track-mcp-and-webmcp-tool-calls", "measure-ai-agent-behaviour-on-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "which-ai-assistants-send-visitors",
    question: "Which AI assistants send visitors to my site?",
    title: "How to know which AI assistants send visitors to your site",
    summary:
      "ChatGPT, Perplexity, Claude, Copilot and Gemini send people to websites with a referrer or a utm_source most analytics tools do not classify. Agent Tracking matches both against a published, versioned list and shows the assistant, the landing page and the trend.",
    sections: [
      { h: "Where the signal is", p: ["A click in ChatGPT arrives with the referrer chatgpt.com; Perplexity with perplexity.ai; some assistants add utm_source=chatgpt.com. Google Analytics files most of these under Referral or Direct, and you have to know the host names to build a segment. The list here is maintained in one file, versioned, and covers a dozen assistants."] },
      { h: "What the Agents view shows", p: ["Each assistant as a row of kind referral: how many visitors in the window, the share of all agent traffic, the trend against the previous period. The Pages view shows where they land, which is usually not the homepage."] },
      { h: "What a referral shows", p: ["A recognized assistant referrer shows a landing from that source. It does not prove a specific citation, answer or recommendation; those need separate sampled checks."] },
      { h: "Reading it from your own tools", p: ["The same rows come back from the stats API and the MCP tool, so a weekly report or a Claude question can read them without opening the dashboard."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Do all assistants send a referrer?", a: "No. Some open links in ways that strip it. Those visits are counted as ordinary views, not as agents. The number you see is a floor, not an estimate." },
      { q: "Is the assistant's user identified?", a: "No name is recorded. The snippet sets no cookie and retains no raw visitor address, but a daily-salted session hash can still be pseudonymous personal data." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website", "which-ai-crawlers-read-my-pages"],
    updated: "2026-09-08",
  },
  {
    slug: "which-ai-crawlers-read-my-pages",
    question: "Which AI crawlers read my pages, and are they real?",
    title: "How to see which AI crawlers read your pages, and verify they are real",
    summary:
      "Some crawler user agents can be checked against fresh published IP ranges in origin logs. Google-Extended is a robots policy token, not a crawler identity. Missing or unsupported verification remains explicit.",
    sections: [
      { h: "Why the snippet is not enough", p: ["Many crawlers fetch HTML without executing browser scripts. An origin access log can record their requests with the claimed user agent and address when that information is available."] },
      { h: "Step 1: send the log", p: ["Upload an append-only log snapshot in Settings or use the collector with stable source, generation and record positions. nginx and Apache combined format are supported, plain or gzipped. Repeated positions are skipped; rotated or reordered logs need source metadata."], code: LOG, codeLang: "sh" },
      { h: "Step 2: verification against published ranges", p: ["For supported operators and crawler identities, the importer compares origin addresses with current published ranges. Some identities cannot be verified this way; they remain unknown instead of becoming verified by user-agent text alone.", "Unverified does not necessarily mean malicious. Check log provenance, list freshness and the operator's documentation before drawing a conclusion."] },
      { h: "Step 3: bursts", p: ["A burst is at least three distinct relevant paths with short gaps inside one imported batch. It is a request pattern, not evidence of a user question or assistant intent."] },
    ],
    faq: [
      { q: "Which crawlers are on the list?", a: "The list is public in the repository and versioned; the docs page prints the current version. Missing one? Open a pull request with the vendor's documentation." },
      { q: "Is the address stored?", a: "No. It is used while the upload is processed, to group one agent's fetches and to check the range, and discarded when the request ends. The log file is not kept." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website", "which-ai-assistants-send-visitors"],
    published: "2026-09-08",
    updated: "2026-09-25",
  },
  {
    slug: "track-mcp-and-webmcp-tool-calls",
    question: "How do I track MCP and WebMCP tool calls on my site?",
    title: "How to track MCP and WebMCP tool calls on your site",
    summary:
      "The snippet observes supported browser WebMCP registrations and calls while active, and declarative form submit attempts. It stores tool name, duration, technical outcome and safe error class. Remote MCP calls need their own server adapter.",
    sections: [
      { h: "Nothing to change in your code", p: ["The snippet wraps registerTool and provideContext before your code runs. Register tools as the specification says and they appear in the Tools view. Declarative tools, forms carrying a toolname attribute, are caught on submit."], code: TOOL, codeLang: "js" },
      { h: "What the Tools view answers", p: ["Per tool: calls, success rate, average duration, the top three error messages, whether it is declarative, when it was last seen, and whether it has ever been called. The last one matters most: a tool nobody calls has a description agents do not understand or a schema they cannot fill."] },
      { h: "Argument privacy", p: ["Tool argument values and arbitrary key names are not stored in the event schema. Inspect schema versions and sanitized error classes for debugging instead."] },
      { h: "The manifest", p: ["If you publish /.well-known/webmcp, the snippet hashes it once per visit. The dashboard shows when it last changed; on Pro and Agency plans an email goes out when it does, which catches a deploy that silently dropped a tool."] },
    ],
    faq: [
      { q: "Does it see MCP servers that agents call outside the browser?", a: "The snippet does not. A separate, authenticated server telemetry adapter can report those calls; browser and server observations can overlap." },
      { q: "Can I test it without an agent?", a: "Yes. The demo page has two tools and a simulate button; simulated calls are marked and never counted as agents." },
    ],
    related: ["see-whether-ai-agents-buy-on-your-site", "measure-ai-agent-behaviour-on-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "ai-agent-analytics-without-cookie-banner",
    question: "Do I need a cookie banner for AI agent analytics?",
    title: "AI agent analytics without cookies: what to assess",
    summary:
      "The snippet sets no cookies or local-storage entries and does not retain raw visitor addresses. Daily salted session hashes and deployment context still require an individual privacy and consent assessment; this guide describes the implemented data flow, not a legal guarantee.",
    sections: [
      { h: "Review the deployment", p: ["Inspect this snippet, other scripts on your site, server logs, hosting and the intended purpose. The absence of a cookie alone does not decide every privacy or consent question. Consult the privacy notice and your own adviser where needed."] },
      { h: "What is recorded", p: ["Redacted page path without query string; recognized source host or token, not a full referrer URL; observed tool name, duration, technical outcome and safe error class; and a daily salted session estimate based on address and coarse browser class. Raw addresses and tool argument values are not stored."] },
      { h: "Where it lives, and under what contract", p: ["One server in Germany. Adding a site concludes the data processing agreement under Art. 28 GDPR, which names the sub-processors, includes the EU standard contractual clauses and describes the processing as the code does it. The source is public, so a data protection officer can check the description against the implementation."] },
      { h: "If even that is too much", p: ["Run it yourself. The software is AGPL-3.0 and installs with one compose file; the data then never leaves your own machine."] },
    ],
    faq: [
      { q: "Is the daily hash personal data?", a: "Treat the hash as potentially pseudonymous personal data in a privacy assessment. A changing salt limits cross-day linkage but is not a blanket anonymity guarantee." },
      { q: "Is this legal advice?", a: "No. It is a description of what the software does and the reasoning the design follows. Your own assessment, or your lawyer's, decides." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "how-to-track-ai-agents-visiting-your-website",
    question: "How do I track the AI agents that visit my website?",
    title: "How to track the AI agents that visit your website",
    summary:
      "AI-related activity appears as identifiable assistant referrals, automated fetches and instrumented tool calls. Each has a different source and limitation: a referral is a human visit, bot identity needs available origin-log evidence, and a browser tool event does not alone prove an autonomous actor or completed business outcome.",
    sections: [
      { h: "The three observable sources", p: ["A referral can arrive with an assistant host as referrer. A fetch appears in an available origin log with a claimed user agent and, where supported, an IP verification result. A WebMCP tool call can be observed in the browser when the snippet instruments its API.", "Existing analytics can measure identifiable referrals and custom events when configured. Compare the sources separately because they may overlap and have different coverage."] },
      { h: "Set up browser signals", p: ["Sign in, add the domain, install the script and verify the installation. The snippet sets no cookie and does not retain a raw visitor address. It can record identifiable referrals and supported browser tool activity; crawler verification and remote tools require separate integrations."], code: SNIPPET, codeLang: "html" },
      { h: "Add the server log for crawlers", p: ["Upload an origin access log or send it through the authenticated log endpoint. Supported crawler identities are checked against current published ranges when available; unsupported or missing verification remains explicit. Close requests may be grouped into a burst, which is a pattern, not a known user question."], code: LOG, codeLang: "sh" },
      { h: "What you can see afterwards", p: ["Recognizable assistant referrals, log-observed crawler requests with verification state, and instrumented tool calls. Browser goal markers are attempts; site-server receipts are separately reported confirmed outcomes. API and MCP views preserve those evidence limits."] },
    ],
    faq: [
      { q: "Do I need to change my analytics setup?", a: "No. Agent Tracking runs beside Google Analytics, Plausible or Matomo and counts a different thing. Nothing about your existing setup changes." },
      { q: "Will it need a consent banner?", a: "The snippet sets no cookies or local storage. Consent and privacy obligations depend on the site's full deployment and applicable law; assess them for your site." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website", "which-ai-crawlers-read-my-pages", "tool-to-track-agentic-use-of-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "tool-to-track-agentic-use-of-your-website",
    question: "Is there a tool that tracks only the agentic use of my website?",
    title: "A tool that tracks only the agentic use of your website",
    summary:
      "Agent Tracking groups identifiable assistant referrals, origin-log crawler requests and instrumented browser or server tool calls. These are separate types of evidence, not a count of unique autonomous agents. Browser goal markers are attempts; confirmed outcomes require a site-server receipt.",
    sections: [
      { h: "Why use additional data sources", p: ["Web analytics can segment identifiable assistant referrals and can receive custom tool events. Crawlers usually require server or edge logs. Agent Tracking brings these sources into one view while keeping their counts and evidence levels distinct."] },
      { h: "What the product records", p: ["Recognized assistant referrers, log requests claiming supported crawler identities with explicit verification status, and instrumented tool calls. Google-Extended and Applebot-Extended are robots policy tokens, not crawler identities. Goal markers are unverified attempts. Plain page views provide context."] },
      { h: "What it deliberately leaves out", p: ["No people analytics: no bounce rate, no funnels for humans, no heatmaps. No prompts, spans or token costs of agents you build yourself; that is LLM observability, a different product. No blocking: it measures and never interferes. The workspace combines measurement views, evidence-based insights, prepared browser tests and protected reports."] },
      { h: "Open source, or hosted", p: ["The software is AGPL-3.0 and runs on your own server with one compose file, or as a hosted service in Germany with a free pilot. Either way the data is one SQLite file and the code is public."] },
    ],
    faq: [
      { q: "Does it count human visitors at all?", a: "Only as a daily total beside the agent numbers, so you can see the proportion. Human visits are not classified, not segmented and not charged." },
      { q: "Can I get the numbers out?", a: "Yes: JSON through the stats API, CSV export, a weekly mail, and an MCP tool your own assistant can call." },
    ],
    related: ["how-to-track-ai-agents-visiting-your-website", "can-google-analytics-track-ai-agents", "measure-ai-agent-behaviour-on-your-website"],
    published: "2026-09-08",
    updated: "2026-09-25",
  },
  {
    slug: "see-chatgpt-referral-traffic",
    question: "How do I see ChatGPT referral traffic to my website?",
    title: "How to see ChatGPT referral traffic to your website",
    summary:
      "A click on a link inside ChatGPT arrives with the referrer chatgpt.com, sometimes with utm_source=chatgpt.com, and most analytics tools file it under Referral or Direct. Agent Tracking matches the referrer and the utm parameter against a maintained list and shows ChatGPT, Perplexity, Claude, Copilot and Gemini as their own rows, with landing pages and a week-over-week trend.",
    sections: [
      { h: "Where the signal is", p: ["ChatGPT sends chatgpt.com as the referrer for links a person clicks in an answer. Perplexity sends perplexity.ai, Claude sends claude.ai, Copilot copilot.microsoft.com, Gemini gemini.google.com. OpenAI additionally appends utm_source=chatgpt.com on many links. Referrer and campaign signals can be captured by suitable browser or server analytics. Availability depends on the client and its referral policy."] },
      { h: "Why Google Analytics undercounts it", p: ["GA4 groups these hosts under Referral without naming the assistant, and links opened in apps or in ways that strip the referrer land in Direct. You can build a segment by host name if you know the list, and you have to maintain it as assistants change domains. Agent Tracking keeps that list in one versioned file, applies it on the server, and shows the result per assistant."] },
      { h: "Set it up", p: ["Add the site, paste the snippet, verify. From the first visit onward the Agents view lists each assistant as a referral row with count, share of agent traffic and trend; the Pages view shows where those visitors land, which is usually not the homepage."], code: SNIPPET, codeLang: "html" },
      { h: "What to do with the number", p: ["Referral rows show where identifiable assistant traffic landed, not which pages were cited or ignored. Compare periods after a content change, then inspect actual answers separately if citation evidence matters. Authorized readers can use the stats API or MCP endpoint."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Does every ChatGPT click carry a referrer?", a: "No. Some clients strip it. Those visits are counted as ordinary views, so the number is a floor, never an estimate." },
      { q: "Is the person identified?", a: "No name is recorded. The snippet sets no cookie and retains no raw visitor address, but a daily-salted session hash can still be pseudonymous personal data." },
    ],
    related: ["ai-agent-traffic-website-measurement-guide", "which-ai-assistants-send-visitors", "how-to-track-ai-agents-visiting-your-website"],
    published: "2026-09-08",
    updated: "2026-09-25",
  },
  {
    slug: "can-google-analytics-track-ai-agents",
    question: "Can Google Analytics or Plausible track AI agents?",
    title: "Can Google Analytics or Plausible track AI agents?",
    summary:
      "Partly. GA4 and Plausible can show identifiable visits sent by assistants; Plausible already groups known sources in an AI Assistants channel. Crawler requests need server or edge logs, and browser tool calls need specific instrumentation. Agent Tracking brings these signals together, while ordinary web analytics remains useful for human visits and their conversions.",
    sections: [
      { h: "What web analytics sees", p: ["A person arriving from chatgpt.com or perplexity.ai is a normal visit with a referrer. GA4 can analyze that source; [Plausible now has an AI Assistants channel](https://plausible.io/docs/top-referrers) with individual sources, landing pages and conversions. A missing referrer still cannot be reliably reconstructed. Agent Tracking also attributes identifiable referrals but does not replace a full human analytics view."] },
      { h: "What requires extra instrumentation", p: ["GPTBot and similar crawlers usually fetch HTML without executing a browser analytics script; their requests require server or edge logs. A WebMCP call is a browser event that needs explicit tracking. Both GA4 and Plausible can record custom events when configured, but neither automatically identifies every on-page model-context call. Attribution of a completed goal depends on the available session and event signals; an AI-referred human purchase should remain distinct from an autonomous agent action."] },
      { h: "What Agent Tracking adds", p: ["Origin-log fetches with supported IP verification and burst grouping, instrumented tool calls with technical outcomes, browser goal attempts, separate server-confirmed outcomes, and identifiable assistant referrals. It does not record raw tool input values."] },
      { h: "Use the right source for each event", p: ["Use web analytics for visitors and conversions, server logs for crawlers, and specific event instrumentation for browser tools. The tools can overlap on identifiable AI referrals; keep definitions consistent instead of adding their totals together. See the [full AI traffic measurement guide](/guides/ai-agent-traffic-website-measurement-guide) for a repeatable setup."], code: SNIPPET, codeLang: "html" },
      { h: "Compare the questions each product answers", p: [
        "For human acquisition, GA4 and Plausible are mature choices. They can show where identifiable visitors came from, which pages they landed on and which configured goals they completed. Plausible explicitly groups known assistant sources under AI Assistants, and GA4 can be configured to report these sources through its traffic-source dimensions. Agent Tracking also shows assistant referrals, but its primary purpose is to put them beside requests from crawlers and actions by agents. It is not intended to replace the broad reporting of a general web analytics tool.",
        "For crawler activity, a browser tag is the wrong data source. Google says [GA4 automatically excludes known bots](https://support.google.com/analytics/answer/9888366?hl=en), and [Plausible filters known bots](https://plausible.io/docs/bot-traffic-filtering) too. That is sensible for human analytics; it means a crawler report needs server logs or an edge service. Agent Tracking imports origin logs. A CDN such as Cloudflare can see requests handled at the edge, including some that never reach the origin.",
        "For WebMCP actions, ask whether the tool call and its outcome are recorded automatically. A custom event in GA4 or Plausible can count a call when the site sends one, but somebody must write and maintain that instrumentation. Agent Tracking's snippet observes supported browser tool APIs and can pair calls with goal markers. Remote MCP servers require their own server-side logs; an on-page snippet cannot inspect them."
      ] },
      { h: "A concrete example with three numbers", p: [
        "Suppose a product page receives eight identifiable ChatGPT referrals this week. A configured analytics report can show those visits and goals. The server log also contains 120 requests claiming to be GPTBot, of which 95 match the operator's current published ranges. An availability tool was called six times with one validation error; two separate site-server receipts confirm reservations.",
        "The eight visits, 95 verified fetches and six tool calls are separate populations. Do not add them to report 109 AI visitors. The bot requests may never have led to a visible answer; the referrals may come from answers generated from other sources; and the tool calls may occur during visits classified in several ways. The useful conclusions are narrower: the page received identifiable assistant traffic, a verified bot fetched it, and one tool error needs attention.",
        "A user who clicks through from ChatGPT is an AI-referred human. A browser tool call is an observed tool interaction, not proof of the caller. The six calls and two server receipts have different denominators unless individually linked. [Instrument the final outcome](/guides/see-whether-ai-agents-buy-on-your-site) before claiming a conversion rate."
      ] },
      { h: "Where GA4 and Plausible are stronger", p: [
        "GA4 and Plausible cover the rest of the human visitor journey: campaigns, landing pages, engagement and configured outcomes. Plausible is especially straightforward when the question is simply which assistants send people and whether those people convert; it already maintains the AI channel. GA4 can be a better fit if the organization relies on its broader reporting and advertising integrations. Prices, privacy settings and limits change, so compare their current official documentation and contract terms rather than a copied feature table.",
        "If assistant referrals are the only question, start in the analytics product you already use. Introducing a second product for an eight-click sample may create more work than insight. Add log processing when crawler behavior matters, and browser tool instrumentation when agents can actually perform tasks on the site. This order makes the measurement proportional to the decisions you will make."
      ] },
      { h: "Where Agent Tracking adds a different view", p: [
        "Agent Tracking is designed for websites that need the three sources together: identifiable assistant referrals, verified crawler fetches from an uploaded log, and calls to on-page MCP or WebMCP tools. It displays verification status, fetch bursts, tool errors and goal events. The code is public under AGPL-3.0, can be self-hosted and has a hosted Free plan with limits. That makes its data flow inspectable, but self-hosting still requires a server and maintenance.",
        "The practical choice is often coexistence. Leave GA4 or Plausible in place for human analytics. Add Agent Tracking when the team has a real question about crawler requests or agent actions that the existing dashboard cannot answer from its current data source. Use consistent dates and page definitions when comparing their referral counts; privacy settings, ad blockers and classification lists can cause differences."
      ] },
    ],
    faq: [
      { q: "Does Agent Tracking replace my analytics?", a: "No. It counts a different population. Human traffic appears only as a daily total for context." },
      { q: "Can I build all of this in GA4 with enough work?", a: "Identifiable referrals and custom tool events can be configured in GA4. Verified crawler requests still require log or edge processing, and agent attribution needs carefully defined events." },
    ],
    related: ["ai-agent-traffic-website-measurement-guide", "see-chatgpt-referral-traffic", "what-is-the-difference-to-agentops-and-langsmith"],
    published: "2026-09-08",
    updated: "2026-09-24",
  },
  {
    slug: "what-is-the-difference-to-agentops-and-langsmith",
    question: "What is the difference between Agent Tracking and AgentOps or LangSmith?",
    title: "Agent Tracking versus AgentOps, LangSmith and LLM observability",
    summary:
      "AgentOps, LangSmith, Langfuse and similar tools trace the agents you build, from inside your own code: prompts, spans, token costs, evaluation runs. Agent Tracking measures agents other people run when they visit your website, from the outside, through a script tag and your server log. One is observability for your product; the other is analytics for your site. A team that builds agents and runs a website may need both.",
    sections: [
      { h: "Where each one sits", p: ["Observability lives in your application: an SDK wraps your LLM calls and tool executions and sends traces to a dashboard. It answers why your agent produced an output and what it cost. Agent Tracking lives on your web pages: a script watches referrals and tool calls, a log import watches crawlers. It answers which agents use your site and what they achieve."] },
      { h: "What the data sources reveal", p: ["Instrumentation inside your own agent can record its prompts, traces and token use. Site instrumentation can show identifiable referrals, crawler requests and tool events. The datasets can overlap when your own agent visits your site; neither source alone identifies every third-party actor."] },
      { h: "Why the name collides", p: ["Both fields use the word agent, and both count tool calls. The difference is whose tool: observability counts calls your agent makes to its tools; Agent Tracking counts calls other agents make to your site's WebMCP tools. The confusion is common enough that this site says on its home page what it is not."] },
      { h: "When you want both", p: ["If you publish WebMCP tools and also build agents, run an observability tool for the agents and Agent Tracking for the site. The stats API and the MCP tool make it easy to pull the site numbers into whatever dashboard your observability lives in."] },
    ],
    faq: [
      { q: "Can Agent Tracking trace my own agent?", a: "No. It has no SDK, sees no prompts and no spans. Use AgentOps, LangSmith, Langfuse or OpenTelemetry for that." },
      { q: "Can LangSmith see who visits my website?", a: "No. It has no presence on the page or in the server log; it only sees what your own code sends it." },
    ],
    related: ["can-google-analytics-track-ai-agents", "track-mcp-and-webmcp-tool-calls"],
    updated: "2026-09-08",
  },
  {
    slug: "cloudflare-ai-audit-or-agent-tracking",
    question: "How does Cloudflare AI Crawl Control compare with Agent Tracking?",
    title: "Cloudflare AI Crawl Control vs Agent Tracking",
    summary:
      "Cloudflare AI Crawl Control, formerly AI Audit, monitors crawler requests at the edge and can apply access rules. It also offers referral analytics on supported plans. Agent Tracking uses a page snippet and optional origin logs for assistant referrals, crawler fetches, browser tool calls and goals. The right choice depends on where your site runs and which events you need.",
    sections: [
      { h: "What edge analytics does well", p: ["[Cloudflare AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/) sees requests handled by Cloudflare, including cache hits that never reach an origin log. It provides crawler controls, request metrics and, on supported plans, referral analytics. Its free-plan crawler identification uses user-agent strings; advanced detection requires Bot Management. Check the current plan details before comparing specific features."] },
      { h: "What still needs browser or server events", p: ["Assistant referrals can appear in edge or browser analytics. A WebMCP call inside the browser needs on-page instrumentation; a confirmed booking needs a separate site-server receipt. Cloudflare's edge view requires its proxy; Agent Tracking can run with other hosting arrangements."] },
      { h: "What Agent Tracking covers", p: ["Identifiable assistant referrals, origin-log fetches with supported verification and burst grouping, instrumented tool technical outcomes, browser goal attempts and distinct site-server receipts. The browser script alone cannot observe remote tools or crawler requests."] },
      { h: "Compare the datasets", p: ["If both are installed, compare the same time window and HTML paths. Counts can differ because the edge sees cache hits and blocks, while an origin log sees only requests that reach the server. Use Agent Tracking for on-page tool and goal events if those matter. The [full measurement guide](/guides/ai-agent-traffic-website-measurement-guide) shows how to keep the signals separate."] },
    ],
    faq: [
      { q: "Can Agent Tracking block a crawler?", a: "No, by design. Blocking belongs in robots.txt or at the edge; this tool tells you what is happening so that decision is informed." },
      { q: "Does Agent Tracking need Cloudflare?", a: "No. It needs a script tag on the page and, for crawlers, an access log from any web server." },
    ],
    related: ["which-ai-crawlers-read-my-pages", "can-google-analytics-track-ai-agents"],
    published: "2026-09-08",
    updated: "2026-09-24",
  },
  {
    slug: "analytics-for-webmcp-tools",
    question: "How do I get analytics for WebMCP tools on my site?",
    title: "Analytics for WebMCP tools: calls, success rate, errors, unused tools",
    summary:
      "Supported WebMCP calls can be instrumented in the browser; remote MCP calls require server integration. The snippet observes supported model-context APIs and declarative forms, and records safe tool metadata and technical outcomes without raw argument values. Coverage depends on the browser API and installation order.",
    sections: [
      { h: "Why instrumentation matters", p: ["A browser-local WebMCP call may not create a separate server request. A site can send its own analytics event for it; Agent Tracking observes supported APIs when the snippet is installed in time. It does not capture raw argument values."] },
      { h: "Install before tool registration", p: ["Load the snippet before supported tool registration so it can observe registrations and calls. Declarative forms require supported markup and browser behavior. Check the Tools view after an actual call rather than assuming complete coverage."], code: TOOL, codeLang: "js" },
      { h: "The questions the Tools view answers", p: ["How many observed calls occurred per tool and day, their technical success or failure and duration. A registered tool with no observed calls may be unused, or its activity may be outside the instrumented context. Errors are safe classes rather than raw messages."] },
      { h: "From calls to outcomes", p: ["A data-agent-goal marker records a browser attempt. A site-server outcome endpoint records a confirmed business event. Read both separately unless your own workflow links the specific call and receipt."], code: GOAL, codeLang: "html" },
    ],
    faq: [
      { q: "Does this cover remote MCP servers too?", a: "Yes, through the separate authenticated server-tool endpoint. The browser snippet does not see remote calls; the MCP read endpoint exposes reported metrics, not hidden remote executions." },
      { q: "Are argument values recorded?", a: "No raw argument values are retained. The supported browser event records safe metadata such as tool name and technical outcome; check the event schema for exact fields." },
    ],
    related: ["track-mcp-and-webmcp-tool-calls", "see-whether-ai-agents-buy-on-your-site"],
    updated: "2026-09-08",
  },
  {
    slug: "how-much-ai-bot-traffic-does-a-website-get",
    question: "How much AI bot traffic does a typical website get?",
    title: "How much AI bot traffic a website gets, and how to measure yours",
    summary:
      "Nobody can tell you a reliable number for a typical site, because it depends on what the site is: a documentation site is fetched by crawlers every night, a shop sees live assistants answering product questions, a blog sees referrals after it is cited. What you can do is measure your own in a day: crawler fetches from the server log, verified against vendor address ranges, plus assistant referrals and tool calls from a script tag.",
    sections: [
      { h: "Why the published averages do not help", p: ["Industry reports count requests at the edge across millions of sites, which says something about the internet and nothing about you. A crawler that reads 400 pages of a documentation site every night is normal there and alarming on a five-page brochure site. The useful number is yours, split by agent and by page, with a trend."] },
      { h: "The three components", p: ["Origin-log fetches from named crawlers or user-triggered fetchers, with explicit verification status where supported. Identifiable assistant referrals are human landings and do not prove a citation. Instrumented tool calls form a third event source. Google-Extended is a robots policy token, not a crawler identity."] },
      { h: "Measure it in a day", p: ["Add the site, paste the snippet, upload yesterday's access log. The dashboard shows fetches per agent with verification, bursts, referrals and pages within minutes, and a trend after a week. One public example is this site's own live stats page, updated daily, and it is small because the domain is new."], code: LOG, codeLang: "sh" },
      { h: "Reading the result", p: ["Fetch volume alone does not reveal training, indexing or use in an answer. A burst groups nearby requests but does not reveal a prompt or citation. Referrals show identifiable human landings; server receipts show confirmed business outcomes. An unverified bot claim needs investigation and is not automatically an impostor."] },
    ],
    faq: [
      { q: "Can you share benchmarks from your customers?", a: "Not yet, and not without their consent. The pilot is days old. When there are enough sites and owners agree, aggregate ranges by site type will be published here." },
      { q: "Do page views by people count against my quota?", a: "No. Only agent events count. Plain page views appear as a total for context." },
    ],
    related: ["ai-traffic-outlook-2026-2027", "which-ai-crawlers-read-my-pages", "how-to-track-ai-agents-visiting-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "which-pages-do-ai-assistants-cite",
    question: "Which pages do AI assistants cite from my site?",
    title: "How to find out which pages AI assistants cite from your site",
    summary:
      "Referrals identify pages people reached from an assistant. Fetch logs identify pages a bot requested. Neither signal proves that a specific page appeared as a citation in an answer. Use them to find candidate pages, then check visible answers separately if citation evidence is required.",
    sections: [
      { h: "What the traces show", p: ["A referral shows an identifiable click from an assistant to a landing page. A burst shows several requests close together in an available server log. Either may happen without a visible citation, and citations may occur without a measurable click. Treat these as evidence of visits and requests, not a citation count."] },
      { h: "Where to look", p: ["The Pages view lists pages by agent fetches and tool calls. The Agents view lists recent bursts and referrals. Compare requested paths with landing pages to choose content to investigate. A page fetched without a referral may have been considered, ignored, served without a click, or used for another purpose; the available data cannot distinguish these outcomes."] },
      { h: "Set it up", p: ["Referrals need the snippet on every page. Bursts need the server log, uploaded once or sent daily. Both together take about ten minutes."], code: SNIPPET, codeLang: "html" },
      { h: "Turning it into a loop", p: ["Change a page assistants keep fetching but never send people to, and watch the referral row for two weeks. That is generative engine optimisation with a measurement in it. Ask the same question from Claude or ChatGPT through the MCP tool if you prefer words to tables."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Can I see the exact question the assistant answered?", a: "No. Neither the referrer nor the fetch carries the prompt, and the tool records no content. The pages in a burst are the closest signal." },
      { q: "Does this work for Google AI Overviews?", a: "Google-Extended is a robots policy token, not a distinct crawler user agent. Origin logs may show supported Google fetchers, but a fetch or ordinary Google referral cannot prove an AI Overview citation." },
    ],
    related: ["see-chatgpt-referral-traffic", "which-ai-assistants-send-visitors", "which-ai-crawlers-read-my-pages"],
    published: "2026-09-08",
    updated: "2026-09-24",
  },
  {
    slug: "is-this-request-really-gptbot",
    question: "How do I know whether a request claiming to be GPTBot is real?",
    title: "How to verify that a request claiming to be GPTBot really comes from OpenAI",
    summary:
      "A user-agent string can be spoofed. For supported crawler identities, Agent Tracking compares the origin-log address with a current published range and shows verified, unverified or unavailable status. An unverified request needs investigation; missing support or an address mismatch alone does not prove an impostor.",
    sections: [
      { h: "Why the string is not enough", p: ["Scrapers copy the GPTBot user agent because sites tend to allow it. A robots.txt rule or a rate limit keyed on the string therefore treats the copy the same as the original. The only reliable signal is the network address, which the vendors publish precisely so that sites can tell."] },
      { h: "Where the ranges come from", p: ["Supported operators publish crawler or fetcher address ranges. The importer uses refreshed lists for supported identities and preserves an unavailable status where matching evidence is missing. Check the operator's current documentation for each identity."] },
      { h: "Doing it by hand", p: ["Take the address from the log line, fetch the vendor's list, and test whether the address is inside any of the CIDR blocks. For one line that is a minute; for a night's log it is a script. The log import does it for every line and shows the result per agent as verified and unverified counts."], code: LOG, codeLang: "sh" },
      { h: "What to do with an unverified claim", p: ["The product does not block requests. Investigate log provenance and current operator ranges before making an edge rule; robots.txt is a crawler instruction, not an authentication control."] },
    ],
    faq: [
      { q: "Do all crawlers publish ranges?", a: "No. Where a vendor publishes none, the row is marked as not verifiable, and the fetches are counted from the string alone with that caveat." },
      { q: "Is reverse DNS an alternative?", a: "For Googlebot and Bingbot, yes. OpenAI and Perplexity rely on published ranges instead, which is why the check uses ranges throughout." },
    ],
    related: ["which-ai-crawlers-read-my-pages", "how-much-ai-bot-traffic-does-a-website-get"],
    updated: "2026-09-08",
  },
  {
    slug: "do-ai-agents-complete-purchases-on-websites",
    question: "Do AI agents complete purchases on websites yet?",
    title: "Do AI agents complete purchases on websites yet, and how would you know?",
    summary:
      "A browser goal marker shows an attempted action, not a completed purchase or proof that an autonomous agent acted. To measure actual purchases, send a site-server receipt after the order is confirmed and keep actor attribution at its observed evidence level.",
    sections: [
      { h: "What agents can do today", p: ["Assistants with browser control navigate pages, fill forms and click, the way a person would, and fail where a person would not: hidden required fields, CAPTCHAs, layouts that only make sense visually. Sites that register WebMCP tools give the assistant a documented function instead, which is faster and fails less. Payment without a human at the keyboard needs a rail such as the Agentic Commerce Protocol, the Universal Commerce Protocol or x402, and adoption is early."] },
      { h: "How to measure it on your site", p: ["Mark an action with data-agent-goal to see an unverified browser attempt. Send a server receipt after the shop confirms an order. A ChatGPT referral identifies a human landing source; neither it nor a browser tool call alone proves who completed the purchase."], code: GOAL, codeLang: "html" },
      { h: "Reading the gap", p: ["A technical tool failure identifies one possible obstacle. Calls, browser attempts and confirmed receipts are distinct populations unless a site explicitly links them. A purchase without an observed tool call does not prove a human actor."] },
      { h: "What this site will publish", p: ["Aggregate rates by site type, once enough shops run the pilot and their owners agree. Until then the number that matters is your own, and it takes one attribute to get."] },
    ],
    faq: [
      { q: "Can Agent Tracking see the order value?", a: "No. Receipts use an event name and safe evidence fields; revenue stays in the shop system. Time proximity alone is not a reliable join key." },
      { q: "Do I need WebMCP for this?", a: "No. data-agent-goal works on any button or form. WebMCP adds the tool layer, which shows where agents fail before the goal." },
    ],
    related: ["see-whether-ai-agents-buy-on-your-site", "analytics-for-webmcp-tools"],
    updated: "2026-09-08",
  },
  {
    slug: "add-a-webmcp-tool-in-ten-minutes",
    question: "How do I add a WebMCP tool to my site in ten minutes?",
    title: "How to add your first WebMCP tool to a site in ten minutes",
    summary:
      "Pick the one action an assistant would most want to take on your site, describe it in a sentence, give it a typed input schema, and register it with document.modelContext.registerTool. A polyfill makes it work in browsers that do not ship the API yet. Start read-only, then measure whether agents call it, and only then add a tool that changes state.",
    sections: [
      { h: "Pick the action", p: ["Search the catalogue, check availability, look up an order status, get a quote. One tool, the thing a person asks about most. A tool that reads is safe to expose without confirmation; a tool that books or buys needs a human step, and the specification's own threat model is the reason."] },
      { h: "Register it", p: ["Name it in the permitted character set, describe what it returns and when to prefer it, type every input property with a description, and mark it read-only. The execute function calls the endpoint your site already has."], code: TOOL, codeLang: "js" },
      { h: "Or annotate a form", p: ["If the action already exists as a form, the declarative route needs no JavaScript at all: a toolname and a description on the form, and the browser derives the schema from the fields you already ship. Attribute names are still settling in the specification; check the current text before rolling it out widely."], code: `<form toolname="request_quote" tooldescription="Request a quote for a product and quantity." action="/quote" method="post">
  <label for="sku">Product</label><input id="sku" name="sku" required>
  <label for="qty">Quantity</label><input id="qty" name="qty" type="number" min="1" required>
  <button type="submit">Request quote</button>
</form>`, codeLang: "html" },
      { h: "Ship, then measure", p: ["Add the polyfill so the API exists where the browser has not shipped it, deploy, and run the readiness check on webmcp-tool.com to see the tool recognised. With the Agent Tracking snippet on the page, the Tools view shows calls, duration, success rate and errors from the first agent onward, which is the only way to know whether the description works."], code: SNIPPET, codeLang: "html" },
    ],
    faq: [
      { q: "Which browsers support WebMCP?", a: "Chrome ships it behind an origin trial; the @mcp-b polyfill covers the rest. Register through document.modelContext and fall back to navigator.modelContext for older builds." },
      { q: "How many tools should a page have?", a: "Two or three good ones. Agents choose by reading descriptions, and fifty tools is a list nobody chooses well from." },
    ],
    related: ["analytics-for-webmcp-tools", "track-mcp-and-webmcp-tool-calls"],
    updated: "2026-09-08",
  },
  {
    slug: "what-counts-as-an-agentic-visitor",
    question: "Can I track agentic visitors on my website, and what counts as one?",
    title: "What counts as an agentic visitor, and how each kind is tracked",
    summary:
      "An identifiable assistant referral is a human visit, an origin-log fetch is an automated request, and an instrumented tool event records a technical interaction. Keep the three counts separate. None alone proves that an autonomous agent completed a business task; confirmed outcomes require a server receipt.",
    sections: [
      { h: "Level 1: referrals", p: ["A person clicks a link inside ChatGPT, Perplexity, Claude or Copilot. The visit may arrive with a referrer such as chatgpt.com or perplexity.ai, and some links add utm_source. GA4 can analyze the sources; Plausible now groups known ones in its AI Assistants channel. Agent Tracking also shows identifiable assistant referrals separately. A missing referrer cannot be inferred reliably."] },
      { h: "Level 2: fetches", p: ["Origin logs show requests claiming a crawler or user-triggered fetcher identity. Supported identities can be checked against current published address ranges; absent support remains unknown. Bursts group requests close in time but cannot reveal whether they answered a particular prompt."], code: LOG, codeLang: "sh" },
      { h: "Level 3: tool calls and in-browser execution", p: ["Supported browser tool APIs can be instrumented on the page; remote MCP tools require authenticated server reports. Technical call outcomes and browser goal attempts remain distinct from confirmed shop or booking receipts. Raw tool argument values are not retained."], code: SNIPPET, codeLang: "html" },
      { h: "Read the evidence together", p: ["Compare requested pages, technical tool failures and confirmed server receipts while retaining their separate denominators. Agent Tracking provides these views in an open-source, self-hostable product. Agent observability tools can also see visits if your own instrumented agent makes them."] },
    ],
    faq: [
      { q: "Which level do I have today without any tool?", a: "Level 1, partly, if you built the referrer segment. Level 2 sits unread in your access log. Level 3 does not exist anywhere until something on the page records it." },
      { q: "Is a person sent by ChatGPT an agent?", a: "The visit is counted as an AI referral: a person, sent by an agent. It is kept separate from fetches, where the agent itself reads the page." },
    ],
    related: ["how-to-track-ai-agents-visiting-your-website", "which-ai-crawlers-read-my-pages", "analytics-for-webmcp-tools"],
    updated: "2026-09-08",
  },
];

const DE: Guide[] = [
  {
    slug: "verhalten-von-ki-agenten-auf-der-website-messen",
    question: "Wie messe ich das Verhalten von KI-Agenten auf meiner Website?",
    title: "Verhalten von KI-Agenten auf der Website messen",
    summary:
      "Erkennbare Assistenten-Referrals, automatisierte Abrufe und instrumentierte Tool-Aufrufe sind drei getrennte Signale. Ein Referral ist ein menschlicher Besuch; Bot-Verifikation hängt vom verfügbaren Log ab, und ein Tool-Aufruf beweist weder den Akteur noch einen fachlichen Abschluss.",
    sections: [
      { h: "Was als beobachtete Aktivität zählt", p: ["Crawler-Anfragen, erkennbare Assistenten-Referrals und instrumentierte Tool-Aufrufe haben verschiedene Bedeutungen. Zeitnahe Anfragen bilden einen Burst, verraten aber keine Nutzerfrage; ein Browser-Tool-Aufruf beweist den Akteur nicht.", "Halte Ereignisquelle, Seite oder Tool und Belegstufe bei jeder Zahl fest."] },
      { h: "Schritt 1: Browser-Snippet", p: ["Site anlegen und Snippet installieren. Es erfasst erkannte Assistenten-Referrals, unterstützte Browser-WebMCP-Aktivität und Zielversuche. Es setzt keine Cookies und speichert keine rohe Netzwerkadresse. Remote-MCP-Aufrufe und bestätigte Abschlüsse brauchen getrennte Serverintegrationen."], code: SNIPPET, codeLang: "html" },
      { h: "Schritt 2: das Server-Log für Crawler", p: ["Die meisten Crawler führen kein JavaScript aus. Lade ein Origin-Access-Log hoch oder sende es über den authentifizierten Log-Endpunkt. Unterstützte Bot-Namen werden gegen aktuelle veröffentlichte Bereiche geprüft; fehlende oder gescheiterte Verifikation bleibt getrennt und beweist keine böse Absicht."], code: LOG, codeLang: "sh" },
      { h: "Schritt 3: Nachweise lesen", p: ["Überblick trennt Referrals, Abruf-Claims, verifizierte HTML-Abrufe, beobachtete Tool-Calls, Browser-Versuche und Serverbelege. Agenten zeigt Quelle und Prüfstatus; Tools zeigt technische Ausgänge; Seiten zeigt angefragte Pfade.", "Ein Burst braucht verschiedene relevante Pfade mit kurzen Abständen in einem Import-Batch. Er verrät weder Frage noch Absicht."] },
      { h: "Schritt 4: geschützte Exporte nutzen", p: ["Berechtigte Leser können Site-Kennzahlen als JSON oder über den MCP-Leseendpunkt abrufen. Frage nach verifizierten Abrufen und beobachteten Tool-Fehlern; unbekannte Bot-Identität bleibt ausdrücklich unbekannt."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Kann ich Agenten ohne Script auf der Seite messen?", a: "Teilweise. Das Server-Log liefert Crawler-Abrufe und Bursts. Referrals und Tool-Aufrufe passieren im Browser und brauchen das Snippet." },
      { q: "Bremst es die Site?", a: "Das Snippet lädt mit defer und schickt kleine Batches per sendBeacon. Der Build weist die aktuelle minimierte Größe aus; prüfe die Leistung auf deinen eigenen Seiten." },
    ],
    related: ["ki-agenten-traffic-website-messen-leitfaden", "welche-ki-assistenten-schicken-besucher", "welche-ki-crawler-lesen-meine-seiten"],
    published: "2026-09-08",
    updated: "2026-09-25",
  },
  {
    slug: "sehen-ob-ki-agenten-auf-der-site-kaufen",
    question: "Wie sehe ich, ob KI-Agenten bei mir auf der Seite einkaufen?",
    title: "Sehen, ob KI-Agenten auf deiner Site kaufen, buchen oder sich anmelden",
    summary:
      "Markiere einen Browser-Zielversuch mit data-agent-goal. Eine erfolgreich angelegte Anfrage oder Buchung bestätigst du erst mit einem authentifizierten Serverbeleg nach der fachlichen Operation. Die Agentenidentität bleibt eine eigene Nachweisfrage.",
    sections: [
      { h: "Warum ein Tool-Aufruf kein Verkauf ist", p: ["Ein Tool kann technisch erfolgreich sein, während die fachliche Operation scheitert. Browser-Zielmarker sind Versuche; nur ein passender Site-Serverbeleg bestätigt eine angelegte Anfrage oder Buchung. Die Zähler haben verschiedene Nenner."] },
      { h: "Schritt 1: Versuch markieren", p: ["Setze data-agent-goal auf die relevante Aktion. Klick oder Submit erfasst einen beobachteten Versuch mit Zielname, keinen abgeschlossenen Verkauf oder bestätigten Agenten."], code: GOAL, codeLang: "html" },
      { h: "Schritt 2: unterstützte Tools beobachten", p: ["Wenn der Browser unterstützte WebMCP-APIs anbietet, während das Snippet aktiv ist, liefern Calls technische Ausgänge und Dauer. Argumentwerte und beliebige Feldnamen werden nicht gespeichert. Remote-MCP-Calls brauchen einen Serveradapter."], code: TOOL, codeLang: "js" },
      { h: "Schritt 3: getrennte Zustände vergleichen", p: ["Der Überblick zeigt technische Tool-Ausgänge, Browser-Zielversuche und serverbestätigte Belege getrennt. Ihre Differenz ist ohne individuell verknüpfte Versuche und Ergebnisse keine Conversion-Rate."] },
      { h: "Was du nicht sehen wirst", p: ["Der Standardbeleg enthält keine Kunden-, Bestell- oder Zahlungsinhalte. Ein Browsermarker belegt weder Umsatz noch Agentenakteur. Ordne Umsatz nicht bloß über ähnliche Zeitpunkte zu."] },
    ],
    faq: [
      { q: "Geht das ohne WebMCP-Tools?", a: "Ja. data-agent-goal funktioniert auf jedem Knopf und Formular. Tool-Aufrufe sind die zusätzliche Schicht für Sites, die Tools veröffentlichen." },
      { q: "Kann ein Mensch einen Zielmarker auslösen?", a: "Ja. Auch Menschen können Browser-Zielversuche auslösen. Referral-Quelle ist keine Agentenidentität; der Site-Serverbeleg bestätigt den fachlichen Ausgang getrennt." },
    ],
    related: ["mcp-und-webmcp-tool-aufrufe-erfassen", "verhalten-von-ki-agenten-auf-der-website-messen"],
    updated: "2026-09-08",
  },
  {
    slug: "welche-ki-assistenten-schicken-besucher",
    question: "Welche KI-Assistenten schicken Besucher auf meine Site?",
    title: "Wissen, welche KI-Assistenten Besucher auf deine Site schicken",
    summary:
      "ChatGPT, Perplexity, Claude, Copilot und Gemini schicken Menschen mit einem Referrer oder einem utm_source, den die meisten Analytics-Werkzeuge nicht zuordnen. Agent Tracking gleicht beides mit einer veröffentlichten, versionierten Liste ab und zeigt Assistent, Landingpage und Trend.",
    sections: [
      { h: "Wo das Signal steckt", p: ["Ein Klick in ChatGPT kommt mit dem Referrer chatgpt.com, Perplexity mit perplexity.ai, manche Assistenten hängen utm_source=chatgpt.com an. Google Analytics legt das meiste unter Referral oder Direct ab, und man muss die Hostnamen kennen, um ein Segment zu bauen. Die Liste hier steht in einer Datei, versioniert, mit einem Dutzend Assistenten."] },
      { h: "Was die Agenten-Ansicht zeigt", p: ["Jeder Assistent als Zeile der Art Referral: wie viele Besucher im Zeitraum, Anteil am gesamten Agententraffic, Trend zur Vorperiode. Die Seiten-Ansicht zeigt, wo sie landen, und das ist meist nicht die Startseite."] },
      { h: "Was ein Referral zeigt", p: ["Ein erkannter Assistenten-Referrer zeigt eine Landung aus dieser Quelle. Eine bestimmte Antwort, Empfehlung oder Zitierung beweist das nicht; dafür braucht es getrennte Stichproben."] },
      { h: "Aus den eigenen Werkzeugen lesen", p: ["Dieselben Zeilen kommen aus der Stats-API und dem MCP-Tool, sodass ein Wochenbericht oder eine Frage an Claude sie lesen kann, ohne das Dashboard zu öffnen."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Schicken alle Assistenten einen Referrer?", a: "Nein. Manche öffnen Links so, dass er fehlt. Diese Besuche zählen als normale Aufrufe, nicht als Agenten. Die Zahl ist eine Untergrenze, keine Schätzung." },
      { q: "Wird der Nutzer des Assistenten identifiziert?", a: "Ein Klarname wird nicht erfasst. Das Snippet setzt keine Cookies und speichert keine rohe Besucheradresse; täglich gesalzene Sitzungskennungen können trotzdem pseudonyme personenbezogene Daten sein." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen", "welche-ki-crawler-lesen-meine-seiten"],
    updated: "2026-09-08",
  },
  {
    slug: "welche-ki-crawler-lesen-meine-seiten",
    question: "Welche KI-Crawler lesen meine Seiten, und sind sie echt?",
    title: "Sehen, welche KI-Crawler deine Seiten lesen, und prüfen, ob sie echt sind",
    summary:
      "Einige Crawler-User-Agents lassen sich im Origin-Log gegen frische veröffentlichte IP-Bereiche prüfen. Google-Extended ist ein robots-Richtlinientoken, keine Crawler-Identität. Fehlende oder nicht unterstützte Verifikation bleibt sichtbar.",
    sections: [
      { h: "Warum das Snippet nicht reicht", p: ["Viele Crawler holen HTML ohne Browser-Script. Ein Origin-Access-Log kann ihre Anfragen mit behauptetem User-Agent und Adresse enthalten, soweit diese Informationen vorliegen."] },
      { h: "Schritt 1: das Log schicken", p: ["Lade in den Einstellungen einen nur angehängten Log-Snapshot hoch oder nutze den Collector mit stabiler Quelle, Generation und Datensatzposition. nginx- und Apache-Format combined werden roh oder gezippt unterstützt. Wiederholte Positionen werden übersprungen; rotierte oder umsortierte Logs brauchen Quellenmetadaten."], code: LOG, codeLang: "sh" },
      { h: "Schritt 2: Verifikation gegen veröffentlichte Bereiche", p: ["Bei unterstützten Betreibern und Crawler-Identitäten vergleicht der Importer Origin-Adressen mit aktuellen veröffentlichten Bereichen. Manche Identitäten lassen sich so nicht prüfen und bleiben unbekannt.", "Unverifiziert heißt nicht zwingend bösartig. Prüfe Log-Herkunft, Aktualität der Liste und Anbieter-Dokumentation vor einer Schlussfolgerung."] },
      { h: "Schritt 3: Bursts", p: ["Ein Burst umfasst mindestens drei verschiedene relevante Pfade mit kurzen Abständen innerhalb eines Import-Batches. Das ist ein Anfragemuster, kein Beleg für eine Nutzerfrage oder Assistentenabsicht."] },
    ],
    faq: [
      { q: "Welche Crawler stehen auf der Liste?", a: "Die Liste ist öffentlich im Repository und versioniert; die Doku-Seite zeigt die aktuelle Version. Fehlt einer? Pull Request mit der Dokumentation des Anbieters." },
      { q: "Wird die Adresse gespeichert?", a: "Nein. Sie wird während der Verarbeitung genutzt, um Abrufe eines Agenten zu gruppieren und den Bereich zu prüfen, und mit dem Ende der Anfrage verworfen. Die Logdatei wird nicht behalten." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen", "welche-ki-assistenten-schicken-besucher"],
    published: "2026-09-08",
    updated: "2026-09-25",
  },
  {
    slug: "mcp-und-webmcp-tool-aufrufe-erfassen",
    question: "Wie erfasse ich MCP- und WebMCP-Tool-Aufrufe auf meiner Site?",
    title: "MCP- und WebMCP-Tool-Aufrufe auf deiner Site erfassen",
    summary:
      "Das Snippet beobachtet unterstützte Browser-WebMCP-Registrierungen und Calls, während es aktiv ist, sowie Submit-Versuche deklarativer Formulare. Es speichert Toolname, Dauer, technischen Ausgang und bereinigte Fehlerklasse. Remote-MCP-Calls brauchen einen eigenen Serveradapter.",
    sections: [
      { h: "Nichts an deinem Code ändern", p: ["Das Snippet umhüllt registerTool und provideContext, bevor dein Code läuft. Registriere Tools wie in der Spezifikation, und sie erscheinen in der Tools-Ansicht. Deklarative Tools, Formulare mit toolname-Attribut, werden beim Absenden erfasst."], code: TOOL, codeLang: "js" },
      { h: "Was die Tools-Ansicht beantwortet", p: ["Je Tool: Aufrufe, Erfolgsquote, mittlere Dauer, die drei häufigsten Fehlermeldungen, ob es deklarativ ist, wann es zuletzt gesehen wurde und ob es je aufgerufen wurde. Das Letzte zählt am meisten: Ein Tool, das niemand aufruft, hat eine Beschreibung, die Agenten nicht verstehen, oder ein Schema, das sie nicht füllen können."] },
      { h: "Argument-Datenschutz", p: ["Tool-Argumentwerte und beliebige Feldnamen werden im Ereignisschema nicht gespeichert. Nutze Schemaversionen und bereinigte Fehlerklassen zur Fehlersuche."] },
      { h: "Das Manifest", p: ["Wenn du /.well-known/webmcp veröffentlichst, hasht das Snippet es einmal pro Besuch. Das Dashboard zeigt die letzte Änderung; in Pro und Agency geht eine Mail raus, wenn es sich ändert, was ein Deployment entlarvt, das still ein Tool entfernt hat."] },
    ],
    faq: [
      { q: "Sieht es MCP-Server, die Agenten außerhalb des Browsers aufrufen?", a: "Das Snippet nicht. Ein getrennter authentifizierter Serveradapter kann diese Calls melden; Browser- und Serverbeobachtungen können sich überlappen." },
      { q: "Kann ich es ohne Agenten testen?", a: "Ja. Die Demo-Seite hat zwei Tools und einen Simulieren-Knopf; simulierte Aufrufe sind markiert und zählen nie als Agenten." },
    ],
    related: ["sehen-ob-ki-agenten-auf-der-site-kaufen", "verhalten-von-ki-agenten-auf-der-website-messen"],
    updated: "2026-09-08",
  },
  {
    slug: "ki-agenten-analytics-ohne-cookie-banner",
    question: "Brauche ich für KI-Agenten-Analytics ein Cookie-Banner?",
    title: "KI-Agenten-Analytics ohne Cookies: was zu prüfen ist",
    summary:
      "Das Snippet setzt keine Cookies oder Local-Storage-Einträge und behält rohe Besucheradressen nicht. Täglich gesalzene Session-Hashes und die konkrete Installation brauchen dennoch eine eigene Datenschutz- und Einwilligungsprüfung; dieser Leitfaden beschreibt den Datenfluss, keine rechtliche Garantie.",
    sections: [
      { h: "Installation prüfen", p: ["Prüfe dieses Snippet, weitere Skripte deiner Site, Server-Logs, Hosting und Zwecke. Das Fehlen von Cookies allein entscheidet nicht jede Datenschutz- oder Einwilligungsfrage. Ziehe Datenschutzhinweise und bei Bedarf fachliche Beratung hinzu."] },
      { h: "Was erfasst wird", p: ["Bereinigter Seitenpfad ohne Query-String; erkannter Quellen-Host oder Token statt vollständiger Referrer-URL; beobachteter Toolname, Dauer, technischer Ausgang und bereinigte Fehlerklasse; täglich gesalzene Session-Näherung aus Adresse und grober Browserklasse. Rohe Adressen und Tool-Argumentwerte werden nicht gespeichert."] },
      { h: "Wo es liegt, und unter welchem Vertrag", p: ["Ein Server in Deutschland. Das Hinzufügen einer Site schließt den Auftragsverarbeitungsvertrag nach Art. 28 DSGVO, der die Unterauftragsverarbeiter nennt, die EU-Standardvertragsklauseln enthält und die Verarbeitung so beschreibt, wie der Code sie macht. Der Quellcode ist öffentlich, ein Datenschutzbeauftragter kann Beschreibung und Umsetzung vergleichen."] },
      { h: "Wenn selbst das zu viel ist", p: ["Betreib es selbst. Die Software ist AGPL-3.0 und installiert sich mit einer Compose-Datei; die Daten verlassen dann nie deinen eigenen Rechner."] },
    ],
    faq: [
      { q: "Ist der Tages-Hash ein personenbezogenes Datum?", a: "Behandle ihn bei der Prüfung als möglicherweise pseudonymes personenbezogenes Datum. Der wechselnde Salt begrenzt die Verknüpfung über Tage, ist aber keine pauschale Anonymitätsgarantie." },
      { q: "Ist das Rechtsberatung?", a: "Nein. Es ist eine Beschreibung dessen, was die Software tut, und der Überlegung, der das Design folgt. Deine eigene Bewertung, oder die deines Anwalts, entscheidet." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen"],
    updated: "2026-09-08",
  },
  {
    slug: "ki-agenten-auf-der-website-tracken",
    question: "Wie tracke ich die KI-Agenten, die meine Website besuchen?",
    title: "KI-Agenten tracken, die deine Website besuchen",
    summary:
      "KI-bezogene Aktivität erscheint als erkennbare Assistenten-Referrals, automatische Abrufe und instrumentierte Tool-Aufrufe. Ihre Quellen und Grenzen unterscheiden sich: Referrals sind menschliche Besuche, Bot-Namen brauchen Origin-Log-Prüfung, und Browserereignisse belegen keinen abgeschlossenen Geschäftsvorgang.",
    sections: [
      { h: "Die drei beobachtbaren Quellen", p: ["Ein erkennbares Referral kann mit Assistenten-Referrer ankommen. Ein Abruf steht im Origin-Log mit behauptetem User-Agent und, soweit unterstützt, IP-Prüfergebnis. Ein Browser-WebMCP-Aufruf kann bei unterstützter API instrumentiert werden.", "Analytics können erkennbare Referrals und konfigurierte Custom Events messen. Vergleiche die Quellen getrennt, da sie sich überschneiden können und unterschiedliche Abdeckung haben."] },
      { h: "Browser-Signale einrichten", p: ["Melde dich an, füge die Domain hinzu, installiere das Script und prüfe die Installation. Das Snippet setzt keine Cookies und speichert keine rohe Besucheradresse. Crawler-Verifikation und Remote-Tools brauchen getrennte Integrationen."], code: SNIPPET, codeLang: "html" },
      { h: "Das Server-Log für Crawler dazunehmen", p: ["Lade ein Origin-Access-Log hoch oder sende es an den authentifizierten Log-Endpunkt. Unterstützte Crawler-Identitäten werden soweit möglich gegen aktuelle veröffentlichte Bereiche geprüft. Fehlende Verifikation bleibt sichtbar; ein Burst ist ein Anfragemuster, keine bekannte Nutzerfrage."], code: LOG, codeLang: "sh" },
      { h: "Was du danach siehst", p: ["Erkennbare Assistenten-Referrals, Log-Anfragen mit Verifikationsstatus und instrumentierte Tool-Aufrufe. Browser-Zielmarker sind Versuche; bestätigte Abschlüsse werden als getrennte Site-Server-Belege gemeldet. API und MCP erhalten diese Grenzen."] },
    ],
    faq: [
      { q: "Muss ich mein Analytics umbauen?", a: "Nein. Agent Tracking läuft neben Google Analytics, Plausible oder Matomo und zählt etwas anderes. An deinem bestehenden Setup ändert sich nichts." },
      { q: "Braucht es ein Consent-Banner?", a: "Das Snippet setzt keine Cookies und nutzt keinen Local Storage. Einwilligungs- und Datenschutzpflichten hängen von der konkreten Einbindung und Rechtslage ab; prüfe sie für deine Site." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen", "welche-ki-crawler-lesen-meine-seiten", "tool-fuer-agentische-nutzung-der-website"],
    updated: "2026-09-08",
  },
  {
    slug: "tool-fuer-agentische-nutzung-der-website",
    question: "Gibt es ein Tool, das nur die agentische Nutzung meiner Website misst?",
    title: "Ein Tool, das nur die agentische Nutzung deiner Website misst",
    summary:
      "Agent Tracking zeigt erkennbare Assistenten-Referrals, Crawler-Anfragen aus Origin-Logs und instrumentierte Browser- oder Server-Tool-Aufrufe. Das sind getrennte Belege, keine Zahl eindeutiger autonomer Agenten. Browser-Zielmarker sind Versuche; bestätigte Abschlüsse brauchen einen Site-Server-Beleg.",
    sections: [
      { h: "Warum zusätzliche Datenquellen", p: ["Webanalyse kann erkennbare Assistenten-Referrals und konfigurierte Custom Events erfassen. Crawler brauchen meist Server- oder Edge-Logs. Agent Tracking zeigt diese Quellen gemeinsam und hält Zählungen und Belegstufen getrennt."] },
      { h: "Was erfasst wird", p: ["Erkannte Assistenten-Referrer, Log-Anfragen mit behaupteter Crawler-Identität und sichtbarem Verifikationsstatus sowie instrumentierte Tool-Aufrufe. Google-Extended und Applebot-Extended sind robots-Richtlinientokens, keine Crawler-Identitäten. Zielmarker sind unbestätigte Versuche."] },
      { h: "Was es bewusst weglässt", p: ["Kein Menschen-Analytics: keine Absprungrate, keine Funnels für Menschen, keine Heatmaps. Keine Prompts, Spans oder Token-Kosten von Agenten, die du selbst baust; das ist LLM-Observability, ein anderes Produkt. Kein Blockieren: Es misst und greift nie ein. Das Ergebnis ist ein kleines Dashboard mit vier Ansichten, das Agentenfragen beantwortet und sonst nichts."] },
      { h: "Open Source oder gehostet", p: ["Die Software ist AGPL-3.0 und läuft mit einer Compose-Datei auf deinem eigenen Server, oder als gehosteter Dienst in Deutschland mit kostenloser Pilotphase. So oder so sind die Daten eine SQLite-Datei und der Code ist öffentlich."] },
    ],
    faq: [
      { q: "Zählt es menschliche Besucher überhaupt?", a: "Nur als Tagessumme neben den Agentenzahlen, damit du das Verhältnis siehst. Menschliche Besuche werden nicht klassifiziert, nicht segmentiert und nicht berechnet." },
      { q: "Bekomme ich die Zahlen raus?", a: "Ja: JSON über die Stats-API, CSV-Export, eine wöchentliche Mail und ein MCP-Tool, das dein eigener Assistent aufrufen kann." },
    ],
    related: ["ki-agenten-auf-der-website-tracken", "kann-google-analytics-ki-agenten-messen", "verhalten-von-ki-agenten-auf-der-website-messen"],
    updated: "2026-09-08",
  },
  {
    slug: "chatgpt-referral-traffic-sehen",
    question: "Wie sehe ich ChatGPT-Referral-Traffic auf meiner Website?",
    title: "ChatGPT-Referral-Traffic auf deiner Website sehen",
    summary:
      "Ein Klick auf einen Link in ChatGPT kommt mit dem Referrer chatgpt.com, manchmal mit utm_source=chatgpt.com, und die meisten Analytics-Werkzeuge legen ihn unter Referral oder Direct ab. Agent Tracking gleicht Referrer und utm-Parameter mit einer gepflegten Liste ab und zeigt ChatGPT, Perplexity, Claude, Copilot und Gemini als eigene Zeilen, mit Landingpages und Trend Woche für Woche.",
    sections: [
      { h: "Wo das Signal steckt", p: ["ChatGPT sendet chatgpt.com als Referrer für Links, die jemand in einer Antwort anklickt. Perplexity sendet perplexity.ai, Claude claude.ai, Copilot copilot.microsoft.com, Gemini gemini.google.com. OpenAI hängt an viele Links zusätzlich utm_source=chatgpt.com. Referrer und Kampagnensignale lassen sich durch geeignete Browser- oder Server-Analytics erfassen. Ihre Verfügbarkeit hängt vom Client und dessen Referrer-Regeln ab."] },
      { h: "Warum Google Analytics zu wenig zählt", p: ["GA4 fasst diese Hosts unter Referral zusammen, ohne den Assistenten zu nennen, und Links, die in Apps oder ohne Referrer geöffnet werden, landen unter Direct. Du kannst ein Segment nach Hostname bauen, wenn du die Liste kennst, und musst es pflegen, wenn Assistenten ihre Domains ändern. Agent Tracking hält diese Liste in einer versionierten Datei, wendet sie auf dem Server an und zeigt das Ergebnis je Assistent."] },
      { h: "Einrichten", p: ["Site hinzufügen, Snippet einbauen, prüfen. Ab dem ersten Besuch listet die Agenten-Ansicht jeden Assistenten als Referral-Zeile mit Anzahl, Anteil am Agententraffic und Trend; die Seiten-Ansicht zeigt, wo diese Besucher landen, und das ist meist nicht die Startseite."], code: SNIPPET, codeLang: "html" },
      { h: "Was du mit der Zahl machst", p: ["Referral-Zeilen zeigen, wo erkennbarer Assistenten-Traffic landet, nicht welche Seiten zitiert oder ignoriert wurden. Vergleiche Zeiträume nach einer Inhaltsänderung und prüfe sichtbare Antworten getrennt, falls du Zitatbelege brauchst. Berechtigte Leser können API und MCP nutzen."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Trägt jeder ChatGPT-Klick einen Referrer?", a: "Nein. Manche Clients entfernen ihn. Diese Besuche zählen als normale Aufrufe, die Zahl ist also eine Untergrenze, nie eine Schätzung." },
      { q: "Wird die Person identifiziert?", a: "Ein Klarname wird nicht erfasst. Das Snippet setzt keine Cookies und speichert keine rohe Besucheradresse; täglich gesalzene Sitzungskennungen können trotzdem pseudonyme personenbezogene Daten sein." },
    ],
    related: ["ki-agenten-traffic-website-messen-leitfaden", "welche-ki-assistenten-schicken-besucher", "ki-agenten-auf-der-website-tracken"],
    published: "2026-09-08",
    updated: "2026-09-25",
  },
  {
    slug: "kann-google-analytics-ki-agenten-messen",
    question: "Kann Google Analytics oder Plausible KI-Agenten messen?",
    title: "Kann Google Analytics oder Plausible KI-Agenten messen?",
    summary:
      "Teilweise. GA4 und Plausible zeigen erkennbare Besuche aus Assistenten; Plausible gruppiert bekannte Quellen bereits im Kanal AI Assistants. Crawler-Anfragen brauchen Server- oder Edge-Logs, Browser-Tools eine gezielte Instrumentierung. Agent Tracking führt diese Signale zusammen; gewöhnliche Webanalyse bleibt für menschliche Besucher und deren Conversions nützlich.",
    sections: [
      { h: "Was Web-Analytics sieht", p: ["Ein Mensch, der von chatgpt.com oder perplexity.ai kommt, ist ein gewöhnlicher Besuch mit Referrer. GA4 kann die Quelle auswerten; [Plausible hat inzwischen einen Kanal AI Assistants](https://plausible.io/docs/top-referrers) mit einzelnen Quellen, Einstiegsseiten und Conversions. Ein fehlender Referrer lässt sich weiterhin nicht sicher rekonstruieren. Agent Tracking ordnet erkennbare Referrals ebenfalls zu, ersetzt aber keine vollständige Analyse menschlicher Besucher."] },
      { h: "Was zusätzliche Instrumentierung braucht", p: ["GPTBot und ähnliche Crawler holen HTML meist ohne ein Webanalyse-Script auszuführen; ihre Anfragen benötigen Server- oder Edge-Logs. Ein WebMCP-Aufruf ist ein Browser-Ereignis, das gezielt erfasst werden muss. GA4 und Plausible können konfigurierte eigene Events zählen, erkennen aber nicht automatisch jeden Model-Context-Aufruf. Die Zuordnung eines Zielabschlusses hängt von Session- und Event-Signalen ab. Ein menschlicher Kauf nach einem KI-Referral bleibt etwas anderes als eine autonome Agentenaktion."] },
      { h: "Was Agent Tracking ergänzt", p: ["Origin-Log-Abrufe mit unterstützter IP-Prüfung und Burst-Gruppierung, instrumentierte Tool-Aufrufe mit technischen Ergebnissen, Browser-Zielversuche, getrennte serverbestätigte Abschlüsse und erkennbare Assistenten-Referrals. Rohe Tool-Eingaben werden nicht gespeichert."] },
      { h: "Für jedes Ereignis die passende Quelle", p: ["Nutze Webanalyse für Besucher und Conversions, Server-Logs für Crawler und gezielte Events für Browser-Tools. Bei erkennbaren KI-Referrals können sich die Werkzeuge überschneiden; addiere die Zählungen deshalb nicht. Der [ausführliche KI-Traffic-Leitfaden](/de/guides/ki-agenten-traffic-website-messen-leitfaden) beschreibt den Aufbau."], code: SNIPPET, codeLang: "html" },
      { h: "Welche Fragen jedes Produkt beantwortet", p: [
        "Für die Herkunft menschlicher Besucher sind GA4 und Plausible ausgereifte Werkzeuge. Sie zeigen erkennbare Quellen, Einstiegsseiten und konfigurierte Ziele. Plausible gruppiert bekannte Assistenten im Kanal AI Assistants; GA4 kann solche Quellen über seine Traffic-Dimensionen auswerten. Agent Tracking zeigt Referrals ebenfalls, stellt sie aber neben Crawler-Anfragen und Agentenaktionen. Es ist keine vollständige Webanalyse für den gesamten Besucherweg.",
        "Für Crawler ist ein Browser-Script die falsche Datenquelle. Laut Google [schließt GA4 bekannte Bots automatisch aus](https://support.google.com/analytics/answer/9888366?hl=en), und [Plausible filtert bekannte Bots](https://plausible.io/docs/bot-traffic-filtering). Für eine Crawler-Auswertung sind deshalb Server-Logs oder Edge-Daten nötig. Agent Tracking importiert Origin-Logs. Ein CDN wie Cloudflare sieht auch Anfragen, die wegen Cache oder Blockierung nie am Origin ankommen.",
        "Bei WebMCP-Aktionen lautet die Frage, ob Aufruf und Ergebnis automatisch erfasst werden. GA4 oder Plausible können eigene Events zählen, wenn die Website sie sendet. Die Instrumentierung muss jemand schreiben und pflegen. Das Snippet von Agent Tracking beobachtet unterstützte Browser-Tool-APIs und kann Aufrufe mit Zielmarkern verbinden. Ein entfernter MCP-Server braucht seine eigenen Logs; ein Script auf der Webseite kann ihn nicht von innen beobachten."
      ] },
      { h: "Ein Beispiel mit drei verschiedenen Zahlen", p: [
        "Angenommen, eine Produktseite erhält diese Woche acht erkennbare ChatGPT-Referrals. Konfigurierte Analytics können diese Besuche anzeigen. Im Server-Log stehen 120 Anfragen mit dem User-Agent GPTBot; 95 passen zu aktuellen veröffentlichten IP-Bereichen. Ein Verfügbarkeits-Tool wurde sechsmal mit einem Validierungsfehler aufgerufen; zwei getrennte Serverbelege bestätigen Reservierungen.",
        "Die acht Besuche, 95 verifizierten Abrufe und sechs Tool-Aufrufe sind verschiedene Populationen. Addiere sie nicht zu 109 KI-Besuchern. Die Bot-Anfragen müssen nie zu einer sichtbaren Antwort geführt haben; die Referrals können aus Antworten stammen, die andere Quellen nutzten. Der sinnvolle Befund ist enger: Die Seite bekam erkennbaren Traffic aus ChatGPT, ein verifizierter Bot lud sie, und ein Tool-Fehler braucht Aufmerksamkeit.",
        "Ein ChatGPT-Referral zeigt die Quelle eines menschlichen Besuchs. Ein Browser-Tool-Aufruf beweist den Akteur nicht. Die sechs Aufrufe und zwei Serverbelege haben ohne individuelle Verknüpfung unterschiedliche Nenner. [Instrumentiere den Abschluss](/de/guides/sehen-ob-ki-agenten-auf-der-site-kaufen), bevor du eine Conversion-Rate angibst."
      ] },
      { h: "Wo GA4 und Plausible mehr leisten", p: [
        "GA4 und Plausible decken den übrigen Weg menschlicher Besucher ab: Kampagnen, Einstiegsseiten, Engagement und konfigurierte Ergebnisse. Plausible ist für die Frage nach Assistenten-Referrals besonders direkt, weil es den KI-Kanal schon pflegt. GA4 passt gut, wenn eine Organisation dessen umfangreichere Berichte und Werbeintegrationen bereits nutzt. Preise, Datenschutzoptionen und Grenzen ändern sich; vergleiche dafür die aktuelle Dokumentation und die Vertragsbedingungen der Anbieter.",
        "Wenn du nur wissen willst, welche Assistenten Menschen schicken, beginne im bereits verwendeten Analytics-Produkt. Ein zweites Werkzeug für eine Stichprobe mit acht Klicks kann mehr Arbeit als Erkenntnis bringen. Ergänze Log-Verarbeitung, sobald Crawler-Verhalten eine Entscheidung beeinflusst. Instrumentiere Browser-Tools, sobald Agenten auf deiner Website tatsächlich Aufgaben ausführen können."
      ] },
      { h: "Was Agent Tracking zusätzlich verbindet", p: [
        "Agent Tracking kombiniert erkennbare Assistenten-Referrals, verifizierte Crawler-Abrufe aus hochgeladenen Logs und Aufrufe von Onpage-MCP- oder WebMCP-Tools. Es zeigt Verifikationsstatus, Abruf-Bursts, Tool-Fehler und Zielereignisse. Der Code ist unter AGPL-3.0 öffentlich, lässt sich selbst hosten und es gibt einen gehosteten Free-Plan mit Grenzen. Das macht den Datenfluss prüfbar; Selbsthosting benötigt aber weiterhin Server und Wartung.",
        "In vielen Fällen werden die Produkte nebeneinander genutzt. GA4 oder Plausible bleiben für menschliche Besuche. Agent Tracking kommt hinzu, wenn Fragen zu Crawler-Anfragen oder Agentenaktionen mit der bestehenden Datenquelle unbeantwortet bleiben. Vergleiche Referral-Zahlen nur bei gleichem Zeitraum und gleichen Seitendefinitionen; Datenschutzeinstellungen, Blocker und Klassifikationslisten können Unterschiede verursachen."
      ] },
      { h: "So prüfst du den Vergleich für deine Website", p: [
        "Beginne mit drei Fragen an dein bestehendes Analytics: Wie viele erkennbare Menschen kamen in den letzten vier Wochen aus Assistenten? Auf welchen Seiten landeten sie? Welche konfigurierten Ziele erreichten sie? Wenn diese Fragen beantwortet sind, prüfe das Server-Log auf Crawler-Anfragen und deren HTTP-Status. Vergleiche Stichproben mit den veröffentlichten IP-Bereichen der Betreiber. Erst danach lohnt sich die Frage nach WebMCP-Aufrufen: Bietet die Site überhaupt Tools an, und welche Entscheidung würde eine Fehlerrate verändern?",
        "Dokumentiere anschließend für jede Zahl Quelle, Zeitraum und Definition. So kannst du in drei Monaten denselben Bericht wiederholen. Ein Anbieterwechsel nur wegen eines neu benannten KI-Kanals ist selten nötig. Wichtiger ist, dass das Werkzeug die Ereignisse sieht, über die dein Team entscheiden muss, und dass niemand Bot-Anfragen als menschliche Sitzungen oder Referrals als bewiesene Zitate präsentiert."
      ] },
    ],
    faq: [
      { q: "Ersetzt Agent Tracking mein Analytics?", a: "Nein. Es zählt eine andere Population. Menschlicher Traffic erscheint nur als Tagessumme zur Einordnung." },
      { q: "Kann ich das alles mit genug Aufwand in GA4 bauen?", a: "Erkennbare Referrals und eigene Tool-Events lassen sich in GA4 konfigurieren. Verifizierte Crawler-Anfragen brauchen zusätzlich Logs oder Edge-Daten; Agenten-Zuordnung braucht sauber definierte Events." },
    ],
    related: ["ki-agenten-traffic-website-messen-leitfaden", "chatgpt-referral-traffic-sehen", "unterschied-zu-agentops-und-langsmith"],
    published: "2026-09-08",
    updated: "2026-09-24",
  },
  {
    slug: "unterschied-zu-agentops-und-langsmith",
    question: "Was ist der Unterschied zwischen Agent Tracking und AgentOps oder LangSmith?",
    title: "Agent Tracking gegenüber AgentOps, LangSmith und LLM-Observability",
    summary:
      "AgentOps, LangSmith, Langfuse und ähnliche Werkzeuge tracen die Agenten, die du baust, von innen aus deinem eigenen Code: Prompts, Spans, Token-Kosten, Evaluationsläufe. Agent Tracking misst Agenten, die andere betreiben, wenn sie deine Website besuchen, von außen, über ein Script-Tag und dein Server-Log. Das eine ist Observability für dein Produkt, das andere Analytics für deine Site. Ein Team, das Agenten baut und eine Website betreibt, braucht womöglich beides.",
    sections: [
      { h: "Wo beides sitzt", p: ["Observability lebt in deiner Anwendung: Ein SDK umhüllt deine LLM-Aufrufe und Tool-Ausführungen und schickt Traces in ein Dashboard. Es beantwortet, warum dein Agent eine Ausgabe erzeugt hat und was sie gekostet hat. Agent Tracking lebt auf deinen Webseiten: Ein Script beobachtet Referrals und Tool-Aufrufe, ein Log-Import beobachtet Crawler. Es beantwortet, welche Agenten deine Site nutzen und was sie erreichen."] },
      { h: "Was die Datenquellen zeigen", p: ["Instrumentierung des eigenen Agenten kann Prompts, Traces und Token-Nutzung erfassen. Site-Instrumentierung zeigt erkennbare Referrals, Crawler-Anfragen und Tool-Ereignisse. Die Daten können sich überschneiden, wenn dein eigener Agent die Site besucht; keine Quelle identifiziert alle fremden Akteure."] },
      { h: "Warum der Name kollidiert", p: ["Beide Felder benutzen das Wort Agent, und beide zählen Tool-Aufrufe. Der Unterschied ist, wessen Tool: Observability zählt Aufrufe, die dein Agent an seine Tools macht; Agent Tracking zählt Aufrufe, die fremde Agenten an die WebMCP-Tools deiner Site machen. Die Verwechslung ist häufig genug, dass diese Site auf der Startseite sagt, was sie nicht ist."] },
      { h: "Wenn du beides willst", p: ["Wenn du WebMCP-Tools veröffentlichst und auch Agenten baust, betreib ein Observability-Werkzeug für die Agenten und Agent Tracking für die Site. Stats-API und MCP-Tool machen es leicht, die Site-Zahlen in das Dashboard zu ziehen, in dem deine Observability lebt."] },
    ],
    faq: [
      { q: "Kann Agent Tracking meinen eigenen Agenten tracen?", a: "Nein. Es hat kein SDK, sieht keine Prompts und keine Spans. Nimm dafür AgentOps, LangSmith, Langfuse oder OpenTelemetry." },
      { q: "Kann LangSmith sehen, wer meine Website besucht?", a: "Nein. Es ist weder auf der Seite noch im Server-Log; es sieht nur, was dein eigener Code ihm schickt." },
    ],
    related: ["kann-google-analytics-ki-agenten-messen", "mcp-und-webmcp-tool-aufrufe-erfassen"],
    updated: "2026-09-08",
  },
  {
    slug: "cloudflare-ai-audit-oder-agent-tracking",
    question: "Wie unterscheidet sich Cloudflare AI Crawl Control von Agent Tracking?",
    title: "Cloudflare AI Crawl Control und Agent Tracking im Vergleich",
    summary:
      "Cloudflare AI Crawl Control, früher AI Audit, beobachtet Crawler-Anfragen am Netzrand und kann Zugriffsregeln anwenden. Auf unterstützten Plänen gibt es auch Referral-Analysen. Agent Tracking nutzt ein Seiten-Snippet und optional Origin-Logs für Assistenten-Referrals, Crawler-Abrufe, Browser-Tools und Ziele. Die Wahl hängt von Hosting und benötigten Ereignissen ab.",
    sections: [
      { h: "Was Edge-Analytics gut kann", p: ["[Cloudflare AI Crawl Control](https://developers.cloudflare.com/ai-crawl-control/) sieht Anfragen, die Cloudflare bearbeitet, auch Cache-Treffer, die im Origin-Log fehlen. Es bietet Crawler-Regeln, Anfragemetriken und auf unterstützten Plänen Referral-Analysen. Im Free-Plan beruht die Crawler-Erkennung auf User-Agent-Strings; fortgeschrittene Erkennung braucht Bot Management. Prüfe vor einem Funktionsvergleich die aktuellen Plangrenzen."] },
      { h: "Wofür Browser- oder Serverereignisse nötig sind", p: ["Assistenten-Referrals können in Edge- oder Browser-Analytics erscheinen. Browser-WebMCP-Aufrufe brauchen Onpage-Instrumentierung; eine bestätigte Buchung braucht einen getrennten Beleg des Site-Servers. Die Edge-Sicht setzt Cloudflare als Proxy voraus."] },
      { h: "Was Agent Tracking abdeckt", p: ["Erkennbare Assistenten-Referrals, Origin-Log-Abrufe mit unterstützter Verifikation und Burst-Gruppierung, instrumentierte technische Tool-Ergebnisse, Browser-Zielversuche und getrennte Serverbelege. Das Browser-Snippet sieht weder Remote-Tools noch Crawler-Anfragen allein."] },
      { h: "Die Datensätze vergleichen", p: ["Wenn beides installiert ist, vergleiche denselben Zeitraum und dieselben HTML-Pfade. Zahlen können abweichen: Die Edge sieht Cache-Treffer und Blockierungen, das Origin-Log nur Anfragen, die den Server erreichen. Für Browser-Tools und Ziele ergänzt Agent Tracking die Daten. Der [Messleitfaden](/de/guides/ki-agenten-traffic-website-messen-leitfaden) zeigt die Trennung."] },
    ],
    faq: [
      { q: "Kann Agent Tracking einen Crawler blockieren?", a: "Nein, mit Absicht. Blockieren gehört in die robots.txt oder an den Netzrand; dieses Tool sagt dir, was passiert, damit die Entscheidung informiert ist." },
      { q: "Braucht Agent Tracking Cloudflare?", a: "Nein. Es braucht ein Script-Tag auf der Seite und, für Crawler, ein Access-Log von irgendeinem Webserver." },
    ],
    related: ["welche-ki-crawler-lesen-meine-seiten", "kann-google-analytics-ki-agenten-messen"],
    published: "2026-09-08",
    updated: "2026-09-24",
  },
  {
    slug: "analytics-fuer-webmcp-tools",
    question: "Wie bekomme ich Analytics für WebMCP-Tools auf meiner Site?",
    title: "Analytics für WebMCP-Tools: Aufrufe, Erfolgsquote, Fehler, ungenutzte Tools",
    summary:
      "Unterstützte WebMCP-Aufrufe können im Browser instrumentiert werden; Remote-MCP-Aufrufe brauchen eine Serverintegration. Das Snippet beobachtet unterstützte Model-Context-APIs und deklarative Formulare und erfasst sichere Metadaten sowie technische Ergebnisse ohne rohe Argumentwerte. Die Abdeckung hängt von Browser-API und Einbaureihenfolge ab.",
    sections: [
      { h: "Warum Instrumentierung nötig ist", p: ["Ein lokaler Browser-WebMCP-Aufruf erzeugt möglicherweise keine separate Serveranfrage. Eigene Analytics können dafür ein Custom Event senden; Agent Tracking beobachtet unterstützte APIs bei rechtzeitig geladenem Snippet. Rohe Argumentwerte werden nicht erfasst."] },
      { h: "Vor der Tool-Registrierung installieren", p: ["Lade das Snippet vor der Registrierung unterstützter Tools. Deklarative Formulare brauchen unterstütztes Markup und Browser-Verhalten. Prüfe die Tools-Ansicht nach einem echten Aufruf, statt vollständige Abdeckung anzunehmen."], code: TOOL, codeLang: "js" },
      { h: "Die Fragen, die die Tools-Ansicht beantwortet", p: ["Wie viele beobachtete Aufrufe je Tool und Tag stattfanden, ihre technischen Ergebnisse und ihre Dauer. Registrierte Tools ohne beobachteten Aufruf können ungenutzt sein oder außerhalb der Instrumentierung liegen. Fehler sind sichere Klassen statt roher Meldungen."] },
      { h: "Von Aufrufen zu Ergebnissen", p: ["data-agent-goal erfasst einen Browser-Versuch. Ein Site-Server-Endpunkt erfasst einen bestätigten Geschäftsabschluss. Lies beide getrennt, solange dein eigener Workflow nicht den konkreten Aufruf und Beleg verbindet."], code: GOAL, codeLang: "html" },
    ],
    faq: [
      { q: "Deckt das auch entfernte MCP-Server ab?", a: "Ja, über den getrennten authentifizierten Server-Tool-Endpunkt. Das Browser-Snippet sieht entfernte Aufrufe nicht; der MCP-Leseendpunkt zeigt gemeldete Kennzahlen." },
      { q: "Werden Argumentwerte erfasst?", a: "Rohe Argumentwerte werden nicht gespeichert. Unterstützte Browserereignisse enthalten sichere Metadaten wie Toolname und technisches Ergebnis; das Eventschema nennt die genauen Felder." },
    ],
    related: ["mcp-und-webmcp-tool-aufrufe-erfassen", "sehen-ob-ki-agenten-auf-der-site-kaufen"],
    updated: "2026-09-08",
  },
  {
    slug: "wie-viel-ki-bot-traffic-hat-eine-website",
    question: "Wie viel KI-Bot-Traffic hat eine typische Website?",
    title: "Wie viel KI-Bot-Traffic eine Website hat, und wie du deinen misst",
    summary:
      "Eine verlässliche Zahl für eine typische Site gibt es nicht, weil es davon abhängt, was die Site ist: Eine Dokumentationssite wird jede Nacht von Crawlern gelesen, ein Shop sieht Live-Assistenten, die Produktfragen beantworten, ein Blog sieht Referrals, nachdem er zitiert wurde. Was du tun kannst: deinen eigenen an einem Tag messen, Crawler-Abrufe aus dem Server-Log, gegen Anbieter-Adressbereiche verifiziert, plus Assistenten-Referrals und Tool-Aufrufe über ein Script-Tag.",
    sections: [
      { h: "Warum veröffentlichte Durchschnitte nicht helfen", p: ["Branchenberichte zählen Anfragen am Netzrand über Millionen Sites, was etwas über das Internet sagt und nichts über dich. Ein Crawler, der jede Nacht 400 Seiten einer Dokumentationssite liest, ist dort normal und auf einer Fünf-Seiten-Broschüre alarmierend. Die nützliche Zahl ist deine, nach Agent und Seite, mit Trend."] },
      { h: "Die drei Bestandteile", p: ["Origin-Log-Abrufe benannter Crawler oder nutzerausgelöster Fetcher, mit sichtbarem Verifikationsstatus soweit unterstützt. Erkennbare Assistenten-Referrals sind menschliche Landungen und belegen kein Zitat. Instrumentierte Tool-Aufrufe sind eine dritte Quelle. Google-Extended ist ein robots-Richtlinientoken, keine Crawler-Identität."] },
      { h: "An einem Tag messen", p: ["Site hinzufügen, Snippet einbauen, das Access-Log von gestern hochladen. Das Dashboard zeigt innerhalb von Minuten Abrufe je Agent mit Verifikation, Bursts, Referrals und Seiten, nach einer Woche einen Trend. Ein öffentliches Beispiel ist die Live-Stats-Seite dieser Site, täglich aktualisiert, und sie ist klein, weil die Domain neu ist."], code: LOG, codeLang: "sh" },
      { h: "Das Ergebnis lesen", p: ["Abrufmengen allein verraten weder Training noch Indexierung oder Verwendung in einer Antwort. Ein Burst bündelt zeitnahe Anfragen, zeigt aber keinen Prompt oder ein Zitat. Referrals zeigen erkennbare menschliche Landungen; Serverbelege zeigen bestätigte Abschlüsse. Unverifizierte Bot-Namen brauchen Prüfung und sind nicht automatisch Nachahmer."] },
    ],
    faq: [
      { q: "Könnt ihr Benchmarks eurer Kunden teilen?", a: "Noch nicht, und nicht ohne deren Zustimmung. Die Pilotphase ist Tage alt. Wenn es genug Sites gibt und die Betreiber einverstanden sind, erscheinen hier aggregierte Spannen je Site-Typ." },
      { q: "Zählen Seitenaufrufe von Menschen auf mein Kontingent?", a: "Nein. Nur Agenten-Ereignisse zählen. Reine Seitenaufrufe erscheinen als Summe zur Einordnung." },
    ],
    related: ["ki-traffic-ausblick-2026-2027", "welche-ki-crawler-lesen-meine-seiten", "ki-agenten-auf-der-website-tracken"],
    updated: "2026-09-08",
  },
  {
    slug: "welche-seiten-zitieren-ki-assistenten",
    question: "Welche Seiten zitieren KI-Assistenten von meiner Site?",
    title: "Herausfinden, welche Seiten KI-Assistenten von deiner Site zitieren",
    summary:
      "Referrals zeigen Seiten, auf denen Menschen aus einem Assistenten landeten. Logs zeigen Seiten, die ein Bot angefragt hat. Keines der Signale beweist, dass eine bestimmte Seite sichtbar zitiert wurde. Nutze sie zur Auswahl interessanter Seiten und prüfe Antworten getrennt, wenn du Belege für Zitate brauchst.",
    sections: [
      { h: "Was die Spuren zeigen", p: ["Ein Referral zeigt einen erkennbaren Klick aus einem Assistenten auf eine Einstiegsseite. Ein Burst zeigt mehrere zeitnahe Anfragen im verfügbaren Server-Log. Beides kann ohne sichtbares Zitat vorkommen; ein Zitat kann auch ohne messbaren Klick erscheinen. Es sind Belege für Besuche und Anfragen, keine Zitat-Zählung."] },
      { h: "Wo du hinschaust", p: ["Die Seiten-Ansicht listet Agenten-Abrufe und Tool-Aufrufe. Die Agenten-Ansicht zeigt jüngste Bursts und Referrals. Vergleiche angefragte Pfade mit Einstiegsseiten, um Inhalte für eine nähere Prüfung auszuwählen. Eine abgerufene Seite ohne Referral kann berücksichtigt, ignoriert, ohne Klick ausgegeben oder für etwas anderes genutzt worden sein."] },
      { h: "Einrichten", p: ["Referrals brauchen das Snippet auf jeder Seite. Bursts brauchen das Server-Log, einmal hochgeladen oder täglich geschickt. Beides zusammen dauert etwa zehn Minuten."], code: SNIPPET, codeLang: "html" },
      { h: "Daraus eine Schleife machen", p: ["Ändere eine Seite, die Assistenten ständig holen, aber nie Menschen hinschicken, und beobachte die Referral-Zeile zwei Wochen. Das ist Generative Engine Optimization mit einer Messung darin. Stell dieselbe Frage Claude oder ChatGPT über das MCP-Tool, wenn dir Worte lieber sind als Tabellen."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Sehe ich die genaue Frage, die der Assistent beantwortet hat?", a: "Nein. Weder Referrer noch Abruf tragen den Prompt, und das Tool erfasst keine Inhalte. Die Seiten in einem Burst sind das nächste Signal." },
      { q: "Funktioniert das für Google AI Overviews?", a: "Google-Extended ist ein robots-Richtlinientoken, kein eigener Crawler-User-Agent. Origin-Logs können unterstützte Google-Fetcher zeigen; Abrufe oder gewöhnliche Google-Referrals belegen kein Zitat in AI Overviews." },
    ],
    related: ["chatgpt-referral-traffic-sehen", "welche-ki-assistenten-schicken-besucher", "welche-ki-crawler-lesen-meine-seiten"],
    published: "2026-09-08",
    updated: "2026-09-24",
  },
  {
    slug: "ist-diese-anfrage-wirklich-gptbot",
    question: "Wie erkenne ich, ob eine Anfrage, die sich als GPTBot ausgibt, echt ist?",
    title: "Prüfen, ob eine Anfrage, die sich als GPTBot ausgibt, wirklich von OpenAI kommt",
    summary:
      "Ein User-Agent-String lässt sich fälschen. Agent Tracking vergleicht bei unterstützten Crawler-Identitäten die Origin-Log-Adresse mit aktuellen veröffentlichten Bereichen und zeigt verifiziert, unverifiziert oder nicht verfügbar. Eine unverifizierte Anfrage braucht Prüfung; fehlende Unterstützung oder eine Adressabweichung allein beweist keinen Nachahmer.",
    sections: [
      { h: "Warum der String nicht reicht", p: ["Scraper kopieren den GPTBot-User-Agent, weil Sites ihn meist erlauben. Eine robots.txt-Regel oder eine Drosselung auf den String behandelt die Kopie also wie das Original. Das einzige verlässliche Signal ist die Netzwerkadresse, die die Anbieter genau deshalb veröffentlichen."] },
      { h: "Woher die Bereiche kommen", p: ["Unterstützte Betreiber veröffentlichen Adressbereiche ihrer Crawler oder Fetcher. Der Importer verwendet aktualisierte Listen für unterstützte Identitäten und erhält den Status nicht verfügbar bei fehlender Prüfbasis. Prüfe je Identität die aktuelle Betreiber-Dokumentation."] },
      { h: "Von Hand", p: ["Nimm die Adresse aus der Log-Zeile, hol die Liste des Anbieters und prüf, ob die Adresse in einem der CIDR-Blöcke liegt. Für eine Zeile ist das eine Minute; für das Log einer Nacht ein Script. Der Log-Import macht es für jede Zeile und zeigt das Ergebnis je Agent als verifizierte und unverifizierte Zahlen."], code: LOG, codeLang: "sh" },
      { h: "Was du mit einem unverifizierten Namen machst", p: ["Das Produkt blockiert keine Anfragen. Prüfe Log-Herkunft und aktuelle Anbieterbereiche vor einer Edge-Regel; robots.txt ist eine Anweisung an Crawler, kein Authentifizierungsmechanismus."] },
    ],
    faq: [
      { q: "Veröffentlichen alle Crawler Bereiche?", a: "Nein. Wo ein Anbieter keine veröffentlicht, ist die Zeile als nicht verifizierbar markiert, und die Abrufe werden mit diesem Vorbehalt allein nach dem String gezählt." },
      { q: "Ist Reverse DNS eine Alternative?", a: "Für Googlebot und Bingbot ja. OpenAI und Perplexity setzen stattdessen auf veröffentlichte Bereiche, darum prüft das Tool durchgehend über Bereiche." },
    ],
    related: ["welche-ki-crawler-lesen-meine-seiten", "wie-viel-ki-bot-traffic-hat-eine-website"],
    updated: "2026-09-08",
  },
  {
    slug: "kaufen-ki-agenten-schon-auf-websites-ein",
    question: "Kaufen KI-Agenten schon auf Websites ein?",
    title: "Kaufen KI-Agenten schon auf Websites ein, und woher wüsstest du das?",
    summary:
      "Ein Browser-Zielmarker zeigt einen Versuch, keinen abgeschlossenen Kauf und keinen Beweis für einen autonomen Akteur. Melde tatsächliche Käufe erst nach Bestätigung durch den Site-Server und kennzeichne die Akteur-Zuordnung nach ihrer Belegstufe.",
    sections: [
      { h: "Was Agenten heute können", p: ["Assistenten mit Browsersteuerung navigieren Seiten, füllen Formulare und klicken, wie ein Mensch, und scheitern, wo ein Mensch nicht scheitern würde: versteckte Pflichtfelder, CAPTCHAs, Layouts, die nur visuell Sinn ergeben. Sites, die WebMCP-Tools registrieren, geben dem Assistenten stattdessen eine dokumentierte Funktion, schneller und mit weniger Fehlern. Zahlen ohne Mensch an der Tastatur braucht einen Weg wie das Agentic Commerce Protocol, das Universal Commerce Protocol oder x402, und die Verbreitung ist früh."] },
      { h: "Wie du es auf deiner Site misst", p: ["Markiere eine Aktion mit data-agent-goal für einen unbestätigten Browser-Versuch. Melde einen Serverbeleg erst nach einer bestätigten Bestellung. Ein ChatGPT-Referral zeigt die Quelle einer menschlichen Landung; weder es noch ein Browser-Tool-Aufruf beweisen, wer den Kauf abgeschlossen hat."], code: GOAL, codeLang: "html" },
      { h: "Die Lücke lesen", p: ["Ein technischer Tool-Fehler ist ein möglicher Hinderungsgrund. Aufrufe, Browser-Versuche und bestätigte Serverbelege haben ohne explizite Verknüpfung verschiedene Nenner. Ein Kauf ohne beobachteten Tool-Aufruf beweist keinen menschlichen Akteur."] },
      { h: "Was diese Site veröffentlichen wird", p: ["Aggregierte Raten je Site-Typ, sobald genug Shops in der Pilotphase laufen und ihre Betreiber zustimmen. Bis dahin zählt die eigene Zahl, und die kostet ein Attribut."] },
    ],
    faq: [
      { q: "Sieht Agent Tracking den Bestellwert?", a: "Nein. Serverbelege enthalten einen Ereignisnamen und sichere Belegfelder; Umsatz bleibt im Shopsystem. Zeitliche Nähe allein ist kein verlässlicher Verknüpfungsschlüssel." },
      { q: "Brauche ich dafür WebMCP?", a: "Nein. data-agent-goal funktioniert auf jedem Knopf und Formular. WebMCP ergänzt die Tool-Schicht, die zeigt, wo Agenten vor dem Ziel scheitern." },
    ],
    related: ["sehen-ob-ki-agenten-auf-der-site-kaufen", "analytics-fuer-webmcp-tools"],
    updated: "2026-09-08",
  },
  {
    slug: "webmcp-tool-in-zehn-minuten-einbauen",
    question: "Wie baue ich in zehn Minuten ein WebMCP-Tool in meine Site ein?",
    title: "Dein erstes WebMCP-Tool in zehn Minuten in eine Site einbauen",
    summary:
      "Wähl die eine Aktion, die ein Assistent auf deiner Site am ehesten ausführen will, beschreib sie in einem Satz, gib ihr ein typisiertes Eingabeschema und registriere sie mit document.modelContext.registerTool. Ein Polyfill lässt es in Browsern laufen, die die API noch nicht mitbringen. Fang nur lesend an, miss dann, ob Agenten es aufrufen, und ergänze erst danach ein Tool, das etwas ändert.",
    sections: [
      { h: "Die Aktion wählen", p: ["Katalog durchsuchen, Verfügbarkeit prüfen, Bestellstatus nachsehen, Angebot holen. Ein Tool, das, wonach Menschen am häufigsten fragen. Ein Tool, das liest, ist ohne Bestätigung sicher; ein Tool, das bucht oder kauft, braucht einen menschlichen Schritt, und das Bedrohungsmodell der Spezifikation ist der Grund."] },
      { h: "Registrieren", p: ["Benenn es im erlaubten Zeichensatz, beschreib, was es zurückgibt und wann es zu bevorzugen ist, typisiere jede Eingabe mit Beschreibung und markiere es als nur lesend. Die execute-Funktion ruft den Endpunkt auf, den deine Site ohnehin hat."], code: TOOL, codeLang: "js" },
      { h: "Oder ein Formular annotieren", p: ["Wenn die Aktion schon als Formular existiert, braucht der deklarative Weg gar kein JavaScript: ein toolname und eine Beschreibung am Formular, und der Browser leitet das Schema aus den Feldern ab, die du ohnehin ausspielst. Die Attributnamen sind in der Spezifikation noch in Bewegung; prüf den aktuellen Text, bevor du es breit ausrollst."], code: `<form toolname="request_quote" tooldescription="Angebot für ein Produkt und eine Menge anfordern." action="/quote" method="post">
  <label for="sku">Produkt</label><input id="sku" name="sku" required>
  <label for="qty">Menge</label><input id="qty" name="qty" type="number" min="1" required>
  <button type="submit">Angebot anfordern</button>
</form>`, codeLang: "html" },
      { h: "Ausliefern, dann messen", p: ["Ergänze das Polyfill, damit die API existiert, wo der Browser sie noch nicht mitbringt, deploye, und lass den Readiness-Check auf webmcp-tool.com laufen, um das Tool erkannt zu sehen. Mit dem Agent-Tracking-Snippet auf der Seite zeigt die Tools-Ansicht ab dem ersten Agenten Aufrufe, Dauer, Erfolgsquote und Fehler, und nur so weißt du, ob die Beschreibung funktioniert."], code: SNIPPET, codeLang: "html" },
    ],
    faq: [
      { q: "Welche Browser unterstützen WebMCP?", a: "Chrome liefert es hinter einem Origin Trial; das @mcp-b-Polyfill deckt den Rest ab. Registriere über document.modelContext und fall für ältere Builds auf navigator.modelContext zurück." },
      { q: "Wie viele Tools sollte eine Seite haben?", a: "Zwei oder drei gute. Agenten wählen nach Beschreibungen, und fünfzig Tools sind eine Liste, aus der niemand gut wählt." },
    ],
    related: ["analytics-fuer-webmcp-tools", "mcp-und-webmcp-tool-aufrufe-erfassen"],
    updated: "2026-09-08",
  },
  {
    slug: "was-ist-ein-agentischer-besucher",
    question: "Kann ich agentische Besucher auf meiner Website tracken, und was zählt als einer?",
    title: "Was als agentischer Besucher zählt, und wie jede Art erfasst wird",
    summary:
      "Ein erkennbares Assistenten-Referral ist ein menschlicher Besuch, ein Origin-Log-Abruf eine automatische Anfrage und ein instrumentiertes Tool-Ereignis eine technische Interaktion. Halte die Zählungen getrennt. Keines davon beweist allein, dass ein autonomer Agent eine Aufgabe abgeschlossen hat; dafür braucht es einen Serverbeleg.",
    sections: [
      { h: "Ebene 1: Referrals", p: ["Ein Mensch klickt einen Link in ChatGPT, Perplexity, Claude oder Copilot. Der Besuch kann mit einem Referrer wie chatgpt.com oder perplexity.ai kommen; manche Links tragen zusätzlich utm_source. GA4 kann solche Quellen auswerten, Plausible gruppiert bekannte Quellen inzwischen im Kanal AI Assistants. Agent Tracking zeigt erkennbare Assistenten-Referrals ebenfalls getrennt. Ein fehlender Referrer lässt sich nicht sicher erschließen."] },
      { h: "Ebene 2: Abrufe", p: ["Origin-Logs zeigen Anfragen mit behaupteter Crawler- oder nutzerausgelöster Fetcher-Identität. Unterstützte Identitäten lassen sich gegen aktuelle veröffentlichte Bereiche prüfen; fehlende Unterstützung bleibt unbekannt. Bursts gruppieren zeitnahe Anfragen, verraten aber keine konkrete Nutzerfrage."], code: LOG, codeLang: "sh" },
      { h: "Ebene 3: Tool-Aufrufe und Ausführung im Browser", p: ["Unterstützte Browser-Tool-APIs können auf der Seite instrumentiert werden; Remote-MCP-Tools brauchen authentifizierte Servermeldungen. Technische Aufruf-Ergebnisse und Browser-Zielversuche bleiben von bestätigten Shop- oder Buchungsbelegen getrennt. Rohe Argumentwerte werden nicht gespeichert."], code: SNIPPET, codeLang: "html" },
      { h: "Belege zusammen lesen", p: ["Vergleiche angefragte Seiten, technische Tool-Fehler und bestätigte Serverbelege, aber behalte die getrennten Nenner. Agent Tracking bietet diese Sicht als Open-Source-Produkt zur Selbstinstallation. Observability-Tools können Besuche eigener Agenten ebenfalls sehen, wenn diese entsprechend instrumentiert sind."] },
    ],
    faq: [
      { q: "Welche Ebene habe ich heute ohne Werkzeug?", a: "Ebene 1 teilweise, wenn du das Referrer-Segment gebaut hast. Ebene 2 liegt ungelesen im Access-Log. Ebene 3 existiert nirgends, bis etwas auf der Seite sie erfasst." },
      { q: "Ist ein von ChatGPT geschickter Mensch ein Agent?", a: "Der Besuch zählt als KI-Referral: ein Mensch, von einem Agenten geschickt. Er bleibt getrennt von Abrufen, bei denen der Agent selbst die Seite liest." },
    ],
    related: ["ki-agenten-auf-der-website-tracken", "welche-ki-crawler-lesen-meine-seiten", "analytics-fuer-webmcp-tools"],
    updated: "2026-09-08",
  },
];

export function guides(lang: DashLang): Guide[] {
  return lang === "de" ? [...DE, ...SEO_GUIDES_DE, ...WORKFLOW_GUIDES_DE] : [...EN, ...SEO_GUIDES_EN, ...WORKFLOW_GUIDES_EN];
}

export function guideBySlug(lang: DashLang, slug: string): Guide | undefined {
  return guides(lang).find((g) => g.slug === slug);
}

/** The same guide in the other language, by position: the two lists are kept in the same order. */
export function counterpart(lang: DashLang, slug: string): Guide | undefined {
  const i = guides(lang).findIndex((g) => g.slug === slug);
  return i < 0 ? undefined : guides(lang === "de" ? "en" : "de")[i];
}
