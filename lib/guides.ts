import type { DashLang } from "@/lib/tracking/copy";

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
  /** ISO date of the last substantive change, for lastmod and datePublished. */
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
      "Agents reach a site in three ways: as a referral (a person sent by ChatGPT or Perplexity), as a fetch (the agent itself loading a page) and as a tool call (the agent operating your MCP or WebMCP tools). Measuring agent behaviour means recording all three, with the agent named, and reading them side by side.",
    sections: [
      { h: "What counts as agent behaviour", p: ["A crawler reading 400 pages overnight, a live assistant fetching three pages in four seconds to answer a question, a person arriving from a chat, and an assistant calling a tool inside the browser are four different behaviours with four different meanings. Ordinary analytics folds the first three into one line labelled Direct or Other and never sees the fourth.", "To measure behaviour you need each event with three facts: which agent, which page or tool, and what happened next."] },
      { h: "Step 1: one line of script", p: ["Add your site in the dashboard and put the snippet on every page. It records the page path (no query string), whether the visit came from or was made by an AI assistant, and every MCP or WebMCP tool registration and call. No cookies, no network address stored."], code: SNIPPET, codeLang: "html" },
      { h: "Step 2: your server log for crawlers", p: ["Most crawlers never run JavaScript, so the snippet cannot see them. Upload your access log on the settings page or send it daily from a cron with the API token. Each line is matched against the agent list and checked against the vendor's published IP ranges; an impostor claiming to be GPTBot from a random address is listed as unverified, not counted."], code: LOG, codeLang: "sh" },
      { h: "Step 3: read the four views", p: ["Overview shows referrals, fetches, tool calls and conversions per day with the trend against the previous period. Agents lists who sent visitors and who fetched pages, with share, trend, bursts and verification. Tools shows calls, success rate, average duration and top errors per tool. Pages shows what agents fetch and where tools are called.", "A burst is one agent fetching several pages within seconds: the footprint of an assistant answering one question about you. Watching which pages a burst takes tells you what the assistant considered relevant."] },
      { h: "Step 4: ask instead of browsing", p: ["Every number is available as JSON and as an MCP tool. Point Claude, ChatGPT or Cursor at it and ask which agents read your site this week and which tool failed most."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Can I measure agents without a script on the page?", a: "Partly. The server log gives you crawler fetches and bursts. Referrals and tool calls happen in the browser and need the snippet." },
      { q: "Does it slow the site down?", a: "The snippet is 4.5 KB, loads deferred and sends small batches with sendBeacon. Nothing blocks rendering." },
    ],
    related: ["see-whether-ai-agents-buy-on-your-site", "which-ai-assistants-send-visitors", "which-ai-crawlers-read-my-pages"],
    updated: "2026-09-08",
  },
  {
    slug: "see-whether-ai-agents-buy-on-your-site",
    question: "How do I see whether AI agents buy on my site?",
    title: "How to see whether AI agents buy, book or sign up on your site",
    summary:
      "Mark the moment that matters with one attribute, data-agent-goal, or mark a tool as a goal. Agent Tracking then counts conversions reached by agents separately from people, and shows whether the agents that called your tools actually got to the end.",
    sections: [
      { h: "Why a tool call is not a sale", p: ["An assistant can add to the cart, fill the form and still fail at checkout because a field it cannot see is required. The Tools view shows the call; only a goal shows the completion. The distance between the two is your agent conversion rate, and it is usually the most surprising number in the dashboard."] },
      { h: "Step 1: mark the goal", p: ["Put data-agent-goal on the element that means done: the order button, the booking confirmation, the signup submit. When it is clicked or the form is submitted, the snippet records a conversion with the goal's name."], code: GOAL, codeLang: "html" },
      { h: "Step 2: give agents a tool worth finishing", p: ["If your site exposes WebMCP tools, the snippet wraps them automatically. Register the checkout tool as the specification says and every call is recorded with duration, outcome and the names of the input keys."], code: TOOL, codeLang: "js" },
      { h: "Step 3: read Conversions next to Tool calls", p: ["The overview shows both per day. The Tools view shows, per tool, how many calls failed and with which error class, which is where the lost purchases are. A tool with a good success rate and no conversions is a checkout agents cannot finish; a goal with conversions and no tool calls is people, not agents."] },
      { h: "What you will not see", p: ["No order value, no customer, no basket contents. The conversion carries the goal name, the page and the agent class, nothing else. If you want revenue per agent, join the goal name with your own order data by time; the dashboard deliberately does not hold it."] },
    ],
    faq: [
      { q: "Does this work without WebMCP tools?", a: "Yes. data-agent-goal works on any button or form. Tool calls are the extra layer for sites that publish tools." },
      { q: "Can a person trigger an agent conversion?", a: "The conversion is attributed to an agent when the session was classified as one, from the referrer or user agent. A person arriving from ChatGPT who then buys is an AI referral conversion; a plain visitor is not counted as an agent." },
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
      { h: "Why this is the GEO number", p: ["Generative engine optimisation is guesswork until you know which assistant actually recommends you and for which page. Two weeks of referrals tell you which content assistants cite and which they ignore; that is the feedback loop the discipline was missing."] },
      { h: "Reading it from your own tools", p: ["The same rows come back from the stats API and the MCP tool, so a weekly report or a Claude question can read them without opening the dashboard."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Do all assistants send a referrer?", a: "No. Some open links in ways that strip it. Those visits are counted as ordinary views, not as agents. The number you see is a floor, not an estimate." },
      { q: "Is the assistant's user identified?", a: "No. The session id is a daily-salted hash; the address is not stored, no cookie is set, and nothing about the person is recorded." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website", "which-ai-crawlers-read-my-pages"],
    updated: "2026-09-08",
  },
  {
    slug: "which-ai-crawlers-read-my-pages",
    question: "Which AI crawlers read my pages, and are they real?",
    title: "How to see which AI crawlers read your pages, and verify they are real",
    summary:
      "GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended and their kind announce themselves in the user agent, and anyone can fake that string. Agent Tracking counts them from your server log and verifies each line against the IP ranges the vendor publishes.",
    sections: [
      { h: "Why the snippet is not enough", p: ["Crawlers fetch raw HTML and never execute a script, so a browser-side tracker does not see them at all. The server log does, one line per request, with the user agent and the address."] },
      { h: "Step 1: send the log", p: ["Upload on the settings page or post it daily with the API token. nginx and Apache combined format, plain or gzipped, whole files; lines older than the newest already imported are skipped."], code: LOG, codeLang: "sh" },
      { h: "Step 2: verification against published ranges", p: ["OpenAI, Anthropic's partners, Perplexity, Microsoft, Google and Apple publish the address ranges their crawlers use. Every line claiming one of them is checked; a match counts, a miss is listed as unverified. The ranges are refreshed nightly.", "Unverified does not mean malicious, but it does mean the request did not come from where the vendor says it would, which is worth knowing before you trust a robots.txt rule to hold."] },
      { h: "Step 3: bursts", p: ["One agent, several pages, a few seconds: that is an assistant answering a question about you, not a crawl. The Agents view counts bursts per agent and lists the recent ones with their pages, so you can see which of your pages an assistant pulled together to answer."] },
    ],
    faq: [
      { q: "Which crawlers are on the list?", a: "The list is public in the repository and versioned; the docs page prints the current version. Missing one? Open a pull request with the vendor's documentation." },
      { q: "Is the address stored?", a: "No. It is used while the upload is processed, to group one agent's fetches and to check the range, and discarded when the request ends. The log file is not kept." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website", "which-ai-assistants-send-visitors"],
    updated: "2026-09-08",
  },
  {
    slug: "track-mcp-and-webmcp-tool-calls",
    question: "How do I track MCP and WebMCP tool calls on my site?",
    title: "How to track MCP and WebMCP tool calls on your site",
    summary:
      "If your pages register tools through navigator.modelContext or document.modelContext, or expose declarative forms with a toolname, the snippet records every registration and every call: name, duration, success or failure, error class and the names of the input keys, never their values.",
    sections: [
      { h: "Nothing to change in your code", p: ["The snippet wraps registerTool and provideContext before your code runs. Register tools as the specification says and they appear in the Tools view. Declarative tools, forms carrying a toolname attribute, are caught on submit."], code: TOOL, codeLang: "js" },
      { h: "What the Tools view answers", p: ["Per tool: calls, success rate, average duration, the top three error messages, whether it is declarative, when it was last seen, and whether it has ever been called. The last one matters most: a tool nobody calls has a description agents do not understand or a schema they cannot fill."] },
      { h: "Input keys, never values", p: ["The names of the argument keys are recorded so you can see that agents send sku but never qty. The values are not, so nothing a person typed reaches the server."] },
      { h: "The manifest", p: ["If you publish /.well-known/webmcp, the snippet hashes it once per visit. The dashboard shows when it last changed; on Pro and Agency plans an email goes out when it does, which catches a deploy that silently dropped a tool."] },
    ],
    faq: [
      { q: "Does it see MCP servers that agents call outside the browser?", a: "No. It sees tools called inside the page through the browser's model context API. A remote MCP server has its own logs; this measures the browser side." },
      { q: "Can I test it without an agent?", a: "Yes. The demo page has two tools and a simulate button; simulated calls are marked and never counted as agents." },
    ],
    related: ["see-whether-ai-agents-buy-on-your-site", "measure-ai-agent-behaviour-on-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "ai-agent-analytics-without-cookie-banner",
    question: "Do I need a cookie banner for AI agent analytics?",
    title: "AI agent analytics without a cookie banner: how it stays legal",
    summary:
      "Consent under the ePrivacy rules is for storing or reading something on the visitor's device. Agent Tracking stores nothing there: no cookie, no local storage, no fingerprint. The session id is a hash of a value that changes daily, the address is not kept, and the data stays on a server in Germany under a data processing agreement.",
    sections: [
      { h: "What triggers consent, and what does not", p: ["The banner obligation attaches to access to the terminal device: cookies, local storage, and techniques that read device characteristics to build a fingerprint. A script that sends the page path and the referrer host, and keeps no identifier that survives the day, does not touch the device in that sense. That is the reasoning cookieless analytics rests on, and it is the reasoning here."] },
      { h: "What is recorded", p: ["Page path without query string; referrer host and utm_source only when they name an assistant; tool name, duration, outcome, error class and input key names; a session id computed from a daily random salt, the domain, a coarse browser class and the address, hashed to 16 characters. The address itself is not stored."] },
      { h: "Where it lives, and under what contract", p: ["One server in Germany. Adding a site concludes the data processing agreement under Art. 28 GDPR, which names the sub-processors, includes the EU standard contractual clauses and describes the processing as the code does it. The source is public, so a data protection officer can check the description against the implementation."] },
      { h: "If even that is too much", p: ["Run it yourself. The software is AGPL-3.0 and installs with one compose file; the data then never leaves your own machine."] },
    ],
    faq: [
      { q: "Is the daily hash personal data?", a: "It is treated as pseudonymous data and processed on the site owner's behalf under the DPA. It cannot be linked across days and cannot be resolved to a person, because the input that would allow it, the address, is not stored." },
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
      "An AI agent visits a website in one of three ways: it sends a person (a referral from ChatGPT or Perplexity), it fetches pages itself (a crawler or a live assistant), or it operates the site through MCP and WebMCP tools. Tracking agents means catching all three, each from its own source: the referrer, the user agent verified against vendor IP ranges, and the browser's tool API.",
    sections: [
      { h: "The three ways an agent shows up", p: ["A referral looks like a normal visit with chatgpt.com or perplexity.ai as the referrer. A fetch is a request from GPTBot, ClaudeBot, PerplexityBot or a live assistant such as ChatGPT-User, most of which never run JavaScript. A tool call happens inside the visitor's browser when an assistant uses a WebMCP tool the page registered, and no server ever sees it.", "Ordinary analytics catches part of the first, none of the second and none of the third. That is why an agent tracker is a separate thing rather than a report inside your existing analytics."] },
      { h: "Ten minutes of setup", p: ["Sign in with an email address, add the domain, paste one script tag on every page, press verify. The snippet is 4.5 KB, sets no cookie and stores no address. From that moment referrals and tool calls are counted, attributed to the assistant or agent by a published list."], code: SNIPPET, codeLang: "html" },
      { h: "Add the server log for crawlers", p: ["Crawlers fetch HTML and leave. Upload your access log once on the settings page, or let a cron send it daily with the API token. Every line that claims a known crawler is checked against the address ranges the vendor publishes, so a fake GPTBot is shown as unverified rather than counted, and requests from one agent within seconds are grouped into a burst."], code: LOG, codeLang: "sh" },
      { h: "What you can see afterwards", p: ["Which assistants send visitors and where they land. Which crawlers read which pages, how often, verified or not. Which tools agents call, how long they take, whether they fail. Whether an agent reaches a goal you marked. All of it per day, with a trend against the previous period, and the same numbers as JSON and as an MCP tool for your own agents."] },
    ],
    faq: [
      { q: "Do I need to change my analytics setup?", a: "No. Agent Tracking runs beside Google Analytics, Plausible or Matomo and counts a different thing. Nothing about your existing setup changes." },
      { q: "Will it slow the site or need a consent banner?", a: "The snippet loads deferred and sends small batches with sendBeacon. It stores nothing on the device, so there is nothing to consent to." },
    ],
    related: ["measure-ai-agent-behaviour-on-your-website", "which-ai-crawlers-read-my-pages", "tool-to-track-agentic-use-of-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "tool-to-track-agentic-use-of-your-website",
    question: "Is there a tool that tracks only the agentic use of my website?",
    title: "A tool that tracks only the agentic use of your website",
    summary:
      "Yes. Agent Tracking counts nothing but agents: the visitors assistants send, the pages crawlers read, the tools agents call and the goals they reach. Human traffic stays in your web analytics; this dashboard shows the agentic part of your site on its own, so the numbers are not diluted by everything else.",
    sections: [
      { h: "Why a separate tool rather than a segment", p: ["A segment in web analytics can isolate visits with an assistant referrer, and that is the only one of the four agent signals it can see. Crawler fetches never execute the analytics script, tool calls never leave the browser, and a conversion reached by an agent looks like any other conversion. A tool built for agents reads the other sources: the server log, the browser's model context API, and goal markers in the page."] },
      { h: "What counts as agentic use", p: ["A visit from ChatGPT, Perplexity, Claude, Copilot or Gemini. A fetch by GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Applebot-Extended or another named crawler, verified against the vendor's address ranges. A call to an MCP or WebMCP tool on the page. A goal reached in a session classified as an agent. Plain page views by people are recorded only as a total for context and never counted against the quota."] },
      { h: "What it deliberately leaves out", p: ["No people analytics: no bounce rate, no funnels for humans, no heatmaps. No prompts, spans or token costs of agents you build yourself; that is LLM observability, a different product. No blocking: it measures and never interferes. The result is a small dashboard with four views that answers agent questions and nothing else."] },
      { h: "Open source, or hosted", p: ["The software is AGPL-3.0 and runs on your own server with one compose file, or as a hosted service in Germany with a free pilot. Either way the data is one SQLite file and the code is public."] },
    ],
    faq: [
      { q: "Does it count human visitors at all?", a: "Only as a daily total beside the agent numbers, so you can see the proportion. Human visits are not classified, not segmented and not charged." },
      { q: "Can I get the numbers out?", a: "Yes: JSON through the stats API, CSV export, a weekly mail, and an MCP tool your own assistant can call." },
    ],
    related: ["how-to-track-ai-agents-visiting-your-website", "can-google-analytics-track-ai-agents", "measure-ai-agent-behaviour-on-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "see-chatgpt-referral-traffic",
    question: "How do I see ChatGPT referral traffic to my website?",
    title: "How to see ChatGPT referral traffic to your website",
    summary:
      "A click on a link inside ChatGPT arrives with the referrer chatgpt.com, sometimes with utm_source=chatgpt.com, and most analytics tools file it under Referral or Direct. Agent Tracking matches the referrer and the utm parameter against a maintained list and shows ChatGPT, Perplexity, Claude, Copilot and Gemini as their own rows, with landing pages and a week-over-week trend.",
    sections: [
      { h: "Where the signal is", p: ["ChatGPT sends chatgpt.com as the referrer for links a person clicks in an answer. Perplexity sends perplexity.ai, Claude sends claude.ai, Copilot copilot.microsoft.com, Gemini gemini.google.com. OpenAI additionally appends utm_source=chatgpt.com on many links. Both are visible to a script on your page and to nothing else."] },
      { h: "Why Google Analytics undercounts it", p: ["GA4 groups these hosts under Referral without naming the assistant, and links opened in apps or in ways that strip the referrer land in Direct. You can build a segment by host name if you know the list, and you have to maintain it as assistants change domains. Agent Tracking keeps that list in one versioned file, applies it on the server, and shows the result per assistant."] },
      { h: "Set it up", p: ["Add the site, paste the snippet, verify. From the first visit onward the Agents view lists each assistant as a referral row with count, share of agent traffic and trend; the Pages view shows where those visitors land, which is usually not the homepage."], code: SNIPPET, codeLang: "html" },
      { h: "What to do with the number", p: ["Two weeks of referral rows tell you which content assistants cite and which they ignore. That is the feedback loop generative engine optimisation was missing: change a page, watch whether the assistant starts sending people to it. Read the same rows from the stats API or ask Claude or ChatGPT through the MCP tool."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Does every ChatGPT click carry a referrer?", a: "No. Some clients strip it. Those visits are counted as ordinary views, so the number is a floor, never an estimate." },
      { q: "Is the person identified?", a: "No. The session id is a daily-salted hash, the address is not stored and no cookie is set." },
    ],
    related: ["which-ai-assistants-send-visitors", "how-to-track-ai-agents-visiting-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "can-google-analytics-track-ai-agents",
    question: "Can Google Analytics or Plausible track AI agents?",
    title: "Can Google Analytics or Plausible track AI agents?",
    summary:
      "Partly. Web analytics can show visits with an assistant referrer if you build and maintain the segment yourself. It cannot see crawlers, which never run its script; it cannot see MCP or WebMCP tool calls, which never leave the browser; and it cannot tell an agent's conversion from a person's. Agent Tracking covers those three and runs beside your analytics rather than replacing it.",
    sections: [
      { h: "What web analytics sees", p: ["A referral from chatgpt.com or perplexity.ai is a normal page view with a referrer, and GA4, Plausible and Matomo record it. Whether they name the assistant depends on you: GA4 needs a custom channel group, Plausible a filter on referrer, Matomo a segment. Each of them has to be updated when an assistant changes its domain."] },
      { h: "What it cannot see", p: ["GPTBot, ClaudeBot and PerplexityBot fetch HTML and never execute JavaScript, so no analytics script fires; only the server log knows they were there. A WebMCP tool call happens inside the visitor's browser between the assistant and the page; no request reaches any analytics endpoint. And a purchase completed by an agent looks exactly like a purchase completed by a person, so nothing separates the two."] },
      { h: "What Agent Tracking adds", p: ["Crawler fetches from the server log, verified against the vendors' published IP ranges and grouped into bursts. Tool calls with duration, success rate, error class and input key names. Conversions attributed to agents through a goal marker. And assistant referrals from a maintained list, so nobody has to build the segment."] },
      { h: "Use both", p: ["Keep your analytics for people. Add one script tag for agents. The two do not overlap, and the agent dashboard stays small enough to read in a minute."], code: SNIPPET, codeLang: "html" },
    ],
    faq: [
      { q: "Does Agent Tracking replace my analytics?", a: "No. It counts a different population. Human traffic appears only as a daily total for context." },
      { q: "Can I build all of this in GA4 with enough work?", a: "The referral part, yes. The crawler part needs log processing outside GA4, and tool calls and agent conversions need code in the page that GA4 does not provide." },
    ],
    related: ["tool-to-track-agentic-use-of-your-website", "see-chatgpt-referral-traffic", "what-is-the-difference-to-agentops-and-langsmith"],
    updated: "2026-09-08",
  },
  {
    slug: "what-is-the-difference-to-agentops-and-langsmith",
    question: "What is the difference between Agent Tracking and AgentOps or LangSmith?",
    title: "Agent Tracking versus AgentOps, LangSmith and LLM observability",
    summary:
      "AgentOps, LangSmith, Langfuse and similar tools trace the agents you build, from inside your own code: prompts, spans, token costs, evaluation runs. Agent Tracking measures agents other people run when they visit your website, from the outside, through a script tag and your server log. One is observability for your product; the other is analytics for your site. A team that builds agents and runs a website may need both.",
    sections: [
      { h: "Where each one sits", p: ["Observability lives in your application: an SDK wraps your LLM calls and tool executions and sends traces to a dashboard. It answers why your agent produced an output and what it cost. Agent Tracking lives on your web pages: a script watches referrals and tool calls, a log import watches crawlers. It answers which agents use your site and what they achieve."] },
      { h: "What only one of them can tell you", p: ["Only observability knows the prompt, the chain of thought and the token bill of your agent. Only Agent Tracking knows that ChatGPT sent 40 visitors to your pricing page this week, that PerplexityBot fetched 300 pages last night, or that an assistant called your booking tool six times and failed on a required field. The data never overlaps, because the agents are different: yours versus everyone else's."] },
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
    question: "Do I need Cloudflare AI Audit if I have Agent Tracking, or the other way round?",
    title: "Cloudflare AI Audit and Agent Tracking: what each one covers",
    summary:
      "Cloudflare AI Audit counts and controls crawlers at the edge, for sites behind Cloudflare, and can block or charge them. Agent Tracking measures referrals, fetches and tool calls in the page and from your own log, needs no CDN, verifies crawlers against vendor IP ranges and follows agents through to a goal. If you want to block crawlers, use Cloudflare. If you want to know what agents do on the site and whether they finish, use Agent Tracking. Many sites use both.",
    sections: [
      { h: "What a CDN bot audit does well", p: ["It sits in front of the site, so it sees every request including the ones your origin never gets, and it can act: allow, block, challenge, or charge per crawl. For a publisher whose main concern is training crawlers taking content, that control is the point."] },
      { h: "What it does not see", p: ["A visitor sent by ChatGPT is a person to the CDN, not an agent. A WebMCP tool call happens inside the browser and never crosses the edge. Whether an agent completed a booking is invisible from a request log. And it only works if your DNS runs through Cloudflare."] },
      { h: "What Agent Tracking covers instead", p: ["Referrals attributed to the assistant, crawler fetches from your own log verified against the vendors' address ranges and grouped into bursts, tool calls with success and duration, and conversions reached by agents. It never blocks; it measures. It works on any host, with one script tag and an optional log upload."] },
      { h: "Using both", p: ["Let Cloudflare enforce your crawler policy at the edge. Let Agent Tracking tell you which assistants send business, which tools work and where agents give up. The crawler counts will roughly agree; the rest only exists on one side."] },
    ],
    faq: [
      { q: "Can Agent Tracking block a crawler?", a: "No, by design. Blocking belongs in robots.txt or at the edge; this tool tells you what is happening so that decision is informed." },
      { q: "Does Agent Tracking need Cloudflare?", a: "No. It needs a script tag on the page and, for crawlers, an access log from any web server." },
    ],
    related: ["which-ai-crawlers-read-my-pages", "can-google-analytics-track-ai-agents"],
    updated: "2026-09-08",
  },
  {
    slug: "analytics-for-webmcp-tools",
    question: "How do I get analytics for WebMCP tools on my site?",
    title: "Analytics for WebMCP tools: calls, success rate, errors, unused tools",
    summary:
      "WebMCP tools run inside the visitor's browser, so no server log and no web analytics ever sees a call. Agent Tracking's snippet wraps navigator.modelContext and document.modelContext, watches declarative forms, and records every registration and call: tool name, duration, success or failure, error class and the names of the input keys, never their values. The Tools view then shows what works, what fails and what nobody calls.",
    sections: [
      { h: "Why nothing else measures this", p: ["A WebMCP call is a function call between the assistant and the page. There is no HTTP request to log, no pixel to fire, no server involved. If the page does not report it, it did not happen as far as anyone can tell. The snippet reports it, with the argument key names and never the values."] },
      { h: "Nothing to change in your tools", p: ["Register tools as the specification says. The snippet wraps registerTool before your code runs and catches declarative forms on submit. Registrations appear in the Tools view within a minute."], code: TOOL, codeLang: "js" },
      { h: "The questions the Tools view answers", p: ["How many calls per tool, per day. What share succeeded and what the top three error messages were. How long a call took on average. Which tools were registered but never called, which usually means a description agents do not understand or a schema they cannot fill. When the manifest at /.well-known/webmcp last changed, and on paid plans an email when it does."] },
      { h: "From calls to outcomes", p: ["Mark the goal with data-agent-goal or treat a tool as the goal, and the dashboard shows whether the agents that called your tools reached the end. The gap between calls and conversions is the number worth working on."], code: GOAL, codeLang: "html" },
    ],
    faq: [
      { q: "Does this cover remote MCP servers too?", a: "Not their server-side logs; those have their own. Agent Tracking sees tools called in the page through the browser's model context API and, through the MCP endpoint, lets you read the numbers." },
      { q: "Are argument values recorded?", a: "Never. Only the names of the input keys, so you can see which fields agents send and which they skip." },
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
      { h: "The three components", p: ["Crawler fetches: GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended and their kind, visible only in the server log because they run no JavaScript. Live fetches: ChatGPT-User, Perplexity-User and other assistants answering a question about you right now, usually three to ten pages in a few seconds. Referrals: people arriving from an assistant that cited you. Most sites have the first two long before the third."] },
      { h: "Measure it in a day", p: ["Add the site, paste the snippet, upload yesterday's access log. The dashboard shows fetches per agent with verification, bursts, referrals and pages within minutes, and a trend after a week. One public example is this site's own live stats page, updated daily, and it is small because the domain is new."], code: LOG, codeLang: "sh" },
      { h: "Reading the result", p: ["A high, steady fetch count from one crawler is training or indexing; whether you want that is a robots.txt decision. Bursts of a few pages in seconds are questions being answered about you; those pages are what assistants consider relevant. Referrals are the part that turns into business, and they usually lag the other two by weeks. Unverified lines claiming a known bot are impostors and worth a look."] },
    ],
    faq: [
      { q: "Can you share benchmarks from your customers?", a: "Not yet, and not without their consent. The pilot is days old. When there are enough sites and owners agree, aggregate ranges by site type will be published here." },
      { q: "Do page views by people count against my quota?", a: "No. Only agent events count. Plain page views appear as a total for context." },
    ],
    related: ["which-ai-crawlers-read-my-pages", "how-to-track-ai-agents-visiting-your-website"],
    updated: "2026-09-08",
  },
  {
    slug: "which-pages-do-ai-assistants-cite",
    question: "Which pages do AI assistants cite from my site?",
    title: "How to find out which pages AI assistants cite from your site",
    summary:
      "Two signals answer this. Referrals show which page a person landed on after an assistant cited it, per assistant. Fetch bursts show which pages an assistant pulled together to answer a question, before anyone clicked. Agent Tracking records both, so the Pages view lists the pages assistants actually use, not the ones you hoped they would.",
    sections: [
      { h: "Citations leave two traces", p: ["When ChatGPT or Perplexity cites you, two things happen. First the assistant fetches the page, often together with two or three related pages, within seconds: a burst. Later, maybe, a person clicks the citation and arrives with the assistant as referrer. The burst tells you what was considered; the referral tells you what was chosen."] },
      { h: "Where to look", p: ["The Pages view lists pages by agent fetches and tool calls. The Agents view lists recent bursts with the pages in each one. The referral rows in the Agents view, combined with the Pages view, show landing pages per assistant. Compare the three: a page that is fetched in bursts but never referred to is cited without a click, or considered and dropped."] },
      { h: "Set it up", p: ["Referrals need the snippet on every page. Bursts need the server log, uploaded once or sent daily. Both together take about ten minutes."], code: SNIPPET, codeLang: "html" },
      { h: "Turning it into a loop", p: ["Change a page assistants keep fetching but never send people to, and watch the referral row for two weeks. That is generative engine optimisation with a measurement in it. Ask the same question from Claude or ChatGPT through the MCP tool if you prefer words to tables."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Can I see the exact question the assistant answered?", a: "No. Neither the referrer nor the fetch carries the prompt, and the tool records no content. The pages in a burst are the closest signal." },
      { q: "Does this work for Google AI Overviews?", a: "Fetches by Google-Extended and Google's user-triggered fetchers are counted from the log. Referrals from AI Overviews arrive as ordinary Google referrals and cannot be separated by referrer alone." },
    ],
    related: ["see-chatgpt-referral-traffic", "which-ai-assistants-send-visitors", "which-ai-crawlers-read-my-pages"],
    updated: "2026-09-08",
  },
  {
    slug: "is-this-request-really-gptbot",
    question: "How do I know whether a request claiming to be GPTBot is real?",
    title: "How to verify that a request claiming to be GPTBot really comes from OpenAI",
    summary:
      "The user agent string is free text and anyone can send it. OpenAI publishes the IP address ranges its crawlers use, as do Perplexity, Microsoft, Google and Apple. A request is real when its address falls in the published range for that crawler; otherwise it is an impostor, whatever the string says. Agent Tracking does this check for every log line and lists impostors as unverified instead of counting them.",
    sections: [
      { h: "Why the string is not enough", p: ["Scrapers copy the GPTBot user agent because sites tend to allow it. A robots.txt rule or a rate limit keyed on the string therefore treats the copy the same as the original. The only reliable signal is the network address, which the vendors publish precisely so that sites can tell."] },
      { h: "Where the ranges come from", p: ["OpenAI publishes separate JSON lists for GPTBot, ChatGPT-User and OAI-SearchBot. Perplexity, Microsoft, Google and Apple publish theirs. The lists change; Agent Tracking refreshes them nightly and checks each log line against the list for the crawler it claims."] },
      { h: "Doing it by hand", p: ["Take the address from the log line, fetch the vendor's list, and test whether the address is inside any of the CIDR blocks. For one line that is a minute; for a night's log it is a script. The log import does it for every line and shows the result per agent as verified and unverified counts."], code: LOG, codeLang: "sh" },
      { h: "What to do with an impostor", p: ["Nothing automatic; the tool never blocks. But an agent whose unverified count is a large share of its total is worth a rule at the edge or in robots.txt, and the verified share tells you how much real crawler traffic you would keep."] },
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
      "Some do, most do not, and the honest answer for your site is a measurement rather than an opinion. Browser-driving assistants can fill forms and press buttons today; WebMCP lets a site offer the checkout as a tool instead of a guessing game; the payment rails for unattended purchases are young. Mark the goal with one attribute and Agent Tracking shows conversions reached by agents, separately from people, so you know for your shop.",
    sections: [
      { h: "What agents can do today", p: ["Assistants with browser control navigate pages, fill forms and click, the way a person would, and fail where a person would not: hidden required fields, CAPTCHAs, layouts that only make sense visually. Sites that register WebMCP tools give the assistant a documented function instead, which is faster and fails less. Payment without a human at the keyboard needs a rail such as the Agentic Commerce Protocol, the Universal Commerce Protocol or x402, and adoption is early."] },
      { h: "How to measure it on your site", p: ["Put data-agent-goal on the element that means done: the order button, the booking confirmation. Register the checkout as a tool if you have WebMCP. The overview then shows conversions per day and the Tools view shows where calls fail. A session is attributed to an agent from the referrer or user agent, so a purchase by a person sent from ChatGPT counts as an AI referral conversion, and a purchase driven by an assistant in the browser counts as an agent conversion."], code: GOAL, codeLang: "html" },
      { h: "Reading the gap", p: ["Tool calls without conversions mean agents try and do not finish; the error class in the Tools view usually says why. Conversions without tool calls are people. Neither number appears anywhere else, because a purchase by an agent looks like any other purchase to a shop system."] },
      { h: "What this site will publish", p: ["Aggregate rates by site type, once enough shops run the pilot and their owners agree. Until then the number that matters is your own, and it takes one attribute to get."] },
    ],
    faq: [
      { q: "Can Agent Tracking see the order value?", a: "No. A conversion carries the goal name, the page and the agent class. Revenue stays in your shop system; join it by time if you need it." },
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
      "Yes, but it depends on what you mean by agentic visitor, because there are three different things and most analytics only sees one of them: a referral (a person sent by an assistant), a fetch (the agent itself loading pages, verified by IP range and grouped into bursts), and a tool call (an assistant operating your MCP or WebMCP tools inside the browser). Behaviour is the combination of all three, and only the combination says whether an agent finished what it came for.",
    sections: [
      { h: "Level 1: referrals", p: ["A person clicks a link inside ChatGPT, Perplexity, Claude or Copilot. The visit arrives with a referrer such as chatgpt.com or perplexity.ai, and OpenAI often adds utm_source=chatgpt.com. GA4 or Plausible can show these if you build a segment by host name and keep it updated as assistants change domains. Agent Tracking keeps that list in one versioned file and shows each assistant as its own row."] },
      { h: "Level 2: fetches", p: ["The agent itself loads your pages: GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, or live fetchers such as ChatGPT-User. Most of them never execute JavaScript, so standard analytics scripts never fire; the only place they exist is your server log. Two things matter here. Verification: anyone can fake a user agent string, so the request address has to be checked against the ranges OpenAI, Perplexity, Microsoft, Google and Apple publish. Bursts: one agent fetching five pages in four seconds is a live assistant answering a prompt right now, not a routine crawl."], code: LOG, codeLang: "sh" },
      { h: "Level 3: tool calls and in-browser execution", p: ["If your site exposes MCP or WebMCP tools, an assistant calls them inside the visitor's browser. No separate page request hits a server, so only on-page event tracking can capture it: call duration, error rates, tools nobody calls, and goal completion such as a checkout. The snippet wraps the browser's model context API and records the names of the input keys, never their values."], code: SNIPPET, codeLang: "html" },
      { h: "Behaviour is the combination", p: ["Which pages a burst hits, which tools fail, and whether the assistant actually finishes the intended goal. If you only care about level 2, a server log parser plus the vendors' IP lists gets you most of the way there. If you want all three on one board, open source and self-hostable, that is what Agent Tracking is. AgentOps or LangSmith handle observability for agents you build yourself and will not show third-party visitors on your website."] },
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
      "Agenten erreichen eine Site auf drei Wegen: als Referral (ein Mensch, den ChatGPT oder Perplexity geschickt hat), als Abruf (der Agent lädt selbst eine Seite) und als Tool-Aufruf (der Agent bedient deine MCP- oder WebMCP-Tools). Agentenverhalten messen heißt, alle drei mit Namen des Agenten zu erfassen und nebeneinander zu lesen.",
    sections: [
      { h: "Was als Agentenverhalten zählt", p: ["Ein Crawler, der nachts 400 Seiten liest, ein Assistent, der in vier Sekunden drei Seiten holt, um eine Frage zu beantworten, ein Mensch aus einem Chat und ein Assistent, der im Browser ein Tool aufruft: vier Verhaltensweisen mit vier Bedeutungen. Normale Analytics faltet die ersten drei in eine Zeile namens Direct oder Sonstige und sieht die vierte nie.", "Für die Messung braucht jedes Ereignis drei Angaben: welcher Agent, welche Seite oder welches Tool, und was danach passiert ist."] },
      { h: "Schritt 1: eine Zeile Script", p: ["Site im Dashboard anlegen und das Snippet auf jede Seite setzen. Es erfasst den Seitenpfad (ohne Query-String), ob der Besuch von einem KI-Assistenten kam oder durch einen erfolgte, und jede Registrierung und jeden Aufruf von MCP- und WebMCP-Tools. Keine Cookies, keine gespeicherte Netzwerkadresse."], code: SNIPPET, codeLang: "html" },
      { h: "Schritt 2: das Server-Log für Crawler", p: ["Die meisten Crawler führen kein JavaScript aus, das Snippet sieht sie nicht. Lade das Access-Log auf der Einstellungsseite hoch oder schick es täglich per Cron mit dem API-Token. Jede Zeile wird gegen die Agentenliste und die veröffentlichten IP-Bereiche des Anbieters geprüft; ein Nachahmer, der sich von einer beliebigen Adresse als GPTBot ausgibt, landet als unverifiziert, nicht in der Zählung."], code: LOG, codeLang: "sh" },
      { h: "Schritt 3: die vier Ansichten lesen", p: ["Überblick zeigt Referrals, Abrufe, Tool-Aufrufe und Conversions pro Tag mit Trend zur Vorperiode. Agenten listet, wer Besucher geschickt und wer Seiten geholt hat, mit Anteil, Trend, Bursts und Verifikation. Tools zeigt Aufrufe, Erfolgsquote, Dauer und häufigste Fehler je Tool. Seiten zeigt, was Agenten abrufen und wo Tools aufgerufen werden.", "Ein Burst ist ein Agent, der innerhalb von Sekunden mehrere Seiten holt: die Spur eines Assistenten, der eine Frage über dich beantwortet. Welche Seiten ein Burst nimmt, zeigt, was der Assistent für relevant hielt."] },
      { h: "Schritt 4: fragen statt klicken", p: ["Jede Zahl gibt es als JSON und als MCP-Tool. Richte Claude, ChatGPT oder Cursor darauf und frag, welche Agenten deine Site diese Woche gelesen haben und welches Tool am häufigsten gescheitert ist."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Kann ich Agenten ohne Script auf der Seite messen?", a: "Teilweise. Das Server-Log liefert Crawler-Abrufe und Bursts. Referrals und Tool-Aufrufe passieren im Browser und brauchen das Snippet." },
      { q: "Bremst es die Site?", a: "Das Snippet hat 4,5 KB, lädt mit defer und schickt kleine Batches per sendBeacon. Nichts blockiert das Rendern." },
    ],
    related: ["sehen-ob-ki-agenten-auf-der-site-kaufen", "welche-ki-assistenten-schicken-besucher", "welche-ki-crawler-lesen-meine-seiten"],
    updated: "2026-09-08",
  },
  {
    slug: "sehen-ob-ki-agenten-auf-der-site-kaufen",
    question: "Wie sehe ich, ob KI-Agenten bei mir auf der Seite einkaufen?",
    title: "Sehen, ob KI-Agenten auf deiner Site kaufen, buchen oder sich anmelden",
    summary:
      "Markiere den entscheidenden Moment mit einem Attribut, data-agent-goal, oder markiere ein Tool als Ziel. Agent Tracking zählt dann Conversions von Agenten getrennt von Menschen und zeigt, ob die Agenten, die deine Tools aufgerufen haben, wirklich bis zum Ende gekommen sind.",
    sections: [
      { h: "Warum ein Tool-Aufruf kein Verkauf ist", p: ["Ein Assistent kann in den Warenkorb legen, das Formular füllen und trotzdem am Checkout scheitern, weil ein Feld Pflicht ist, das er nicht sieht. Die Tools-Ansicht zeigt den Aufruf; erst ein Ziel zeigt den Abschluss. Der Abstand zwischen beiden ist deine Agenten-Conversion-Rate, und meist die überraschendste Zahl im Dashboard."] },
      { h: "Schritt 1: das Ziel markieren", p: ["Setze data-agent-goal auf das Element, das fertig bedeutet: den Bestellknopf, die Buchungsbestätigung, das Anmelde-Submit. Beim Klick oder Absenden erfasst das Snippet eine Conversion mit dem Namen des Ziels."], code: GOAL, codeLang: "html" },
      { h: "Schritt 2: Agenten ein Tool geben, das sich zu Ende führen lässt", p: ["Wenn deine Site WebMCP-Tools bereitstellt, umhüllt das Snippet sie automatisch. Registriere das Checkout-Tool wie in der Spezifikation, und jeder Aufruf wird mit Dauer, Ergebnis und den Namen der Eingabefelder erfasst."], code: TOOL, codeLang: "js" },
      { h: "Schritt 3: Conversions neben Tool-Aufrufen lesen", p: ["Der Überblick zeigt beides pro Tag. Die Tools-Ansicht zeigt je Tool, wie viele Aufrufe mit welcher Fehlerklasse gescheitert sind, und da stecken die verlorenen Käufe. Ein Tool mit guter Erfolgsquote und ohne Conversions ist ein Checkout, den Agenten nicht abschließen können; ein Ziel mit Conversions und ohne Tool-Aufrufe sind Menschen, keine Agenten."] },
      { h: "Was du nicht sehen wirst", p: ["Keinen Bestellwert, keinen Kunden, keinen Warenkorbinhalt. Die Conversion trägt Zielname, Seite und Agentenklasse, sonst nichts. Willst du Umsatz je Agent, verknüpfe den Zielnamen zeitlich mit deinen eigenen Bestelldaten; das Dashboard hält sie bewusst nicht."] },
    ],
    faq: [
      { q: "Geht das ohne WebMCP-Tools?", a: "Ja. data-agent-goal funktioniert auf jedem Knopf und Formular. Tool-Aufrufe sind die zusätzliche Schicht für Sites, die Tools veröffentlichen." },
      { q: "Kann ein Mensch eine Agenten-Conversion auslösen?", a: "Die Conversion wird einem Agenten zugeschrieben, wenn die Sitzung als solcher erkannt wurde, über Referrer oder User-Agent. Ein Mensch, der von ChatGPT kommt und kauft, ist eine KI-Referral-Conversion; ein normaler Besucher zählt nicht als Agent." },
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
      { h: "Warum das die GEO-Zahl ist", p: ["Generative Engine Optimization ist Raten, bis du weißt, welcher Assistent dich tatsächlich empfiehlt und für welche Seite. Zwei Wochen Referrals zeigen, welche Inhalte Assistenten zitieren und welche sie ignorieren; das ist die Rückkopplung, die der Disziplin gefehlt hat."] },
      { h: "Aus den eigenen Werkzeugen lesen", p: ["Dieselben Zeilen kommen aus der Stats-API und dem MCP-Tool, sodass ein Wochenbericht oder eine Frage an Claude sie lesen kann, ohne das Dashboard zu öffnen."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Schicken alle Assistenten einen Referrer?", a: "Nein. Manche öffnen Links so, dass er fehlt. Diese Besuche zählen als normale Aufrufe, nicht als Agenten. Die Zahl ist eine Untergrenze, keine Schätzung." },
      { q: "Wird der Nutzer des Assistenten identifiziert?", a: "Nein. Die Sitzungskennung ist ein täglich neu gesalzener Hash; die Adresse wird nicht gespeichert, kein Cookie gesetzt, nichts über die Person erfasst." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen", "welche-ki-crawler-lesen-meine-seiten"],
    updated: "2026-09-08",
  },
  {
    slug: "welche-ki-crawler-lesen-meine-seiten",
    question: "Welche KI-Crawler lesen meine Seiten, und sind sie echt?",
    title: "Sehen, welche KI-Crawler deine Seiten lesen, und prüfen, ob sie echt sind",
    summary:
      "GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended und Co. geben sich im User-Agent zu erkennen, und jeder kann diese Zeichenkette fälschen. Agent Tracking zählt sie aus deinem Server-Log und prüft jede Zeile gegen die IP-Bereiche, die der Anbieter veröffentlicht.",
    sections: [
      { h: "Warum das Snippet nicht reicht", p: ["Crawler holen rohes HTML und führen nie ein Script aus, ein browserseitiger Tracker sieht sie gar nicht. Das Server-Log schon, eine Zeile je Anfrage, mit User-Agent und Adresse."] },
      { h: "Schritt 1: das Log schicken", p: ["Auf der Einstellungsseite hochladen oder täglich mit dem API-Token posten. nginx- und Apache-Format combined, roh oder gezippt, ganze Dateien; Zeilen, die älter sind als die neueste bereits importierte, werden übersprungen."], code: LOG, codeLang: "sh" },
      { h: "Schritt 2: Verifikation gegen veröffentlichte Bereiche", p: ["OpenAI, Perplexity, Microsoft, Google und Apple veröffentlichen die Adressbereiche ihrer Crawler. Jede Zeile, die einen davon behauptet, wird geprüft; ein Treffer zählt, ein Fehltreffer landet als unverifiziert. Die Bereiche werden nächtlich aktualisiert.", "Unverifiziert heißt nicht bösartig, aber es heißt, dass die Anfrage nicht von dort kam, wo der Anbieter es sagt, und das sollte man wissen, bevor man sich auf eine robots.txt-Regel verlässt."] },
      { h: "Schritt 3: Bursts", p: ["Ein Agent, mehrere Seiten, wenige Sekunden: das ist ein Assistent, der eine Frage über dich beantwortet, kein Crawl. Die Agenten-Ansicht zählt Bursts je Agent und listet die jüngsten mit ihren Seiten, damit du siehst, welche deiner Seiten ein Assistent für eine Antwort zusammengezogen hat."] },
    ],
    faq: [
      { q: "Welche Crawler stehen auf der Liste?", a: "Die Liste ist öffentlich im Repository und versioniert; die Doku-Seite zeigt die aktuelle Version. Fehlt einer? Pull Request mit der Dokumentation des Anbieters." },
      { q: "Wird die Adresse gespeichert?", a: "Nein. Sie wird während der Verarbeitung genutzt, um Abrufe eines Agenten zu gruppieren und den Bereich zu prüfen, und mit dem Ende der Anfrage verworfen. Die Logdatei wird nicht behalten." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen", "welche-ki-assistenten-schicken-besucher"],
    updated: "2026-09-08",
  },
  {
    slug: "mcp-und-webmcp-tool-aufrufe-erfassen",
    question: "Wie erfasse ich MCP- und WebMCP-Tool-Aufrufe auf meiner Site?",
    title: "MCP- und WebMCP-Tool-Aufrufe auf deiner Site erfassen",
    summary:
      "Wenn deine Seiten Tools über navigator.modelContext oder document.modelContext registrieren oder deklarative Formulare mit toolname bereitstellen, erfasst das Snippet jede Registrierung und jeden Aufruf: Name, Dauer, Erfolg oder Fehlschlag, Fehlerklasse und die Namen der Eingabefelder, nie deren Werte.",
    sections: [
      { h: "Nichts an deinem Code ändern", p: ["Das Snippet umhüllt registerTool und provideContext, bevor dein Code läuft. Registriere Tools wie in der Spezifikation, und sie erscheinen in der Tools-Ansicht. Deklarative Tools, Formulare mit toolname-Attribut, werden beim Absenden erfasst."], code: TOOL, codeLang: "js" },
      { h: "Was die Tools-Ansicht beantwortet", p: ["Je Tool: Aufrufe, Erfolgsquote, mittlere Dauer, die drei häufigsten Fehlermeldungen, ob es deklarativ ist, wann es zuletzt gesehen wurde und ob es je aufgerufen wurde. Das Letzte zählt am meisten: Ein Tool, das niemand aufruft, hat eine Beschreibung, die Agenten nicht verstehen, oder ein Schema, das sie nicht füllen können."] },
      { h: "Feldnamen, nie Werte", p: ["Die Namen der Argument-Felder werden erfasst, damit du siehst, dass Agenten sku schicken, aber nie qty. Die Werte nicht, sodass nichts, was jemand eingetippt hat, den Server erreicht."] },
      { h: "Das Manifest", p: ["Wenn du /.well-known/webmcp veröffentlichst, hasht das Snippet es einmal pro Besuch. Das Dashboard zeigt die letzte Änderung; in Pro und Agency geht eine Mail raus, wenn es sich ändert, was ein Deployment entlarvt, das still ein Tool entfernt hat."] },
    ],
    faq: [
      { q: "Sieht es MCP-Server, die Agenten außerhalb des Browsers aufrufen?", a: "Nein. Es sieht Tools, die in der Seite über die Model-Context-API des Browsers aufgerufen werden. Ein entfernter MCP-Server hat eigene Logs; hier wird die Browserseite gemessen." },
      { q: "Kann ich es ohne Agenten testen?", a: "Ja. Die Demo-Seite hat zwei Tools und einen Simulieren-Knopf; simulierte Aufrufe sind markiert und zählen nie als Agenten." },
    ],
    related: ["sehen-ob-ki-agenten-auf-der-site-kaufen", "verhalten-von-ki-agenten-auf-der-website-messen"],
    updated: "2026-09-08",
  },
  {
    slug: "ki-agenten-analytics-ohne-cookie-banner",
    question: "Brauche ich für KI-Agenten-Analytics ein Cookie-Banner?",
    title: "KI-Agenten-Analytics ohne Cookie-Banner: warum es rechtlich hält",
    summary:
      "Die Einwilligung nach ePrivacy gilt dem Speichern oder Auslesen auf dem Endgerät. Agent Tracking speichert dort nichts: kein Cookie, kein Local Storage, kein Fingerprint. Die Sitzungskennung ist ein Hash aus einem täglich neuen Wert, die Adresse wird nicht behalten, und die Daten bleiben auf einem Server in Deutschland unter einem Auftragsverarbeitungsvertrag.",
    sections: [
      { h: "Was eine Einwilligung auslöst, und was nicht", p: ["Die Banner-Pflicht knüpft an den Zugriff auf das Endgerät: Cookies, Local Storage und Techniken, die Gerätemerkmale zu einem Fingerprint auslesen. Ein Script, das Seitenpfad und Referrer-Host schickt und keine Kennung behält, die den Tag überlebt, greift in diesem Sinn nicht auf das Gerät zu. Das ist die Begründung, auf der cookieloses Analytics steht, und sie gilt auch hier."] },
      { h: "Was erfasst wird", p: ["Seitenpfad ohne Query-String; Referrer-Host und utm_source nur, wenn sie einen Assistenten nennen; Toolname, Dauer, Ergebnis, Fehlerklasse und Namen der Eingabefelder; eine Sitzungskennung aus täglichem Zufallswert, Domain, grober Browserklasse und Adresse, gehasht auf 16 Zeichen. Die Adresse selbst wird nicht gespeichert."] },
      { h: "Wo es liegt, und unter welchem Vertrag", p: ["Ein Server in Deutschland. Das Hinzufügen einer Site schließt den Auftragsverarbeitungsvertrag nach Art. 28 DSGVO, der die Unterauftragsverarbeiter nennt, die EU-Standardvertragsklauseln enthält und die Verarbeitung so beschreibt, wie der Code sie macht. Der Quellcode ist öffentlich, ein Datenschutzbeauftragter kann Beschreibung und Umsetzung vergleichen."] },
      { h: "Wenn selbst das zu viel ist", p: ["Betreib es selbst. Die Software ist AGPL-3.0 und installiert sich mit einer Compose-Datei; die Daten verlassen dann nie deinen eigenen Rechner."] },
    ],
    faq: [
      { q: "Ist der Tages-Hash ein personenbezogenes Datum?", a: "Er wird als pseudonymes Datum behandelt und im Auftrag des Site-Betreibers unter dem AVV verarbeitet. Er lässt sich nicht über Tage verknüpfen und nicht auf eine Person auflösen, weil die Eingabe, die das erlauben würde, die Adresse, nicht gespeichert wird." },
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
      "Ein KI-Agent kommt auf drei Wegen auf eine Website: Er schickt einen Menschen (ein Referral von ChatGPT oder Perplexity), er holt Seiten selbst (ein Crawler oder ein Live-Assistent), oder er bedient die Site über MCP- und WebMCP-Tools. Agenten tracken heißt, alle drei zu erfassen, jeden aus seiner eigenen Quelle: dem Referrer, dem gegen Anbieter-IP-Bereiche verifizierten User-Agent und der Tool-API des Browsers.",
    sections: [
      { h: "Die drei Arten, wie ein Agent auftaucht", p: ["Ein Referral sieht aus wie ein normaler Besuch mit chatgpt.com oder perplexity.ai als Referrer. Ein Abruf ist eine Anfrage von GPTBot, ClaudeBot, PerplexityBot oder einem Live-Assistenten wie ChatGPT-User, und die meisten davon führen kein JavaScript aus. Ein Tool-Aufruf passiert im Browser des Besuchers, wenn ein Assistent ein WebMCP-Tool nutzt, das die Seite registriert hat, und kein Server sieht ihn je.", "Normale Analytics erfasst einen Teil des Ersten, nichts vom Zweiten und nichts vom Dritten. Darum ist ein Agenten-Tracker ein eigenes Werkzeug und kein Report im bestehenden Analytics."] },
      { h: "Zehn Minuten Einrichtung", p: ["Per E-Mail anmelden, Domain hinzufügen, ein Script-Tag auf jede Seite, Prüfen drücken. Das Snippet hat 4,5 KB, setzt kein Cookie und speichert keine Adresse. Ab diesem Moment werden Referrals und Tool-Aufrufe gezählt und über eine veröffentlichte Liste dem Assistenten oder Agenten zugeordnet."], code: SNIPPET, codeLang: "html" },
      { h: "Das Server-Log für Crawler dazunehmen", p: ["Crawler holen HTML und gehen. Lade das Access-Log einmal auf der Einstellungsseite hoch oder lass es täglich per Cron mit dem API-Token schicken. Jede Zeile, die einen bekannten Crawler behauptet, wird gegen die veröffentlichten Adressbereiche des Anbieters geprüft; ein falscher GPTBot erscheint als unverifiziert statt gezählt, und Anfragen eines Agenten innerhalb weniger Sekunden werden zu einem Burst gruppiert."], code: LOG, codeLang: "sh" },
      { h: "Was du danach siehst", p: ["Welche Assistenten Besucher schicken und wo sie landen. Welche Crawler welche Seiten lesen, wie oft, verifiziert oder nicht. Welche Tools Agenten aufrufen, wie lange sie brauchen, ob sie scheitern. Ob ein Agent ein markiertes Ziel erreicht. Alles pro Tag, mit Trend zur Vorperiode, und dieselben Zahlen als JSON und als MCP-Tool für deine eigenen Agenten."] },
    ],
    faq: [
      { q: "Muss ich mein Analytics umbauen?", a: "Nein. Agent Tracking läuft neben Google Analytics, Plausible oder Matomo und zählt etwas anderes. An deinem bestehenden Setup ändert sich nichts." },
      { q: "Bremst es die Site oder braucht es ein Consent-Banner?", a: "Das Snippet lädt mit defer und schickt kleine Batches per sendBeacon. Es speichert nichts auf dem Gerät, also gibt es nichts, dem man zustimmen müsste." },
    ],
    related: ["verhalten-von-ki-agenten-auf-der-website-messen", "welche-ki-crawler-lesen-meine-seiten", "tool-fuer-agentische-nutzung-der-website"],
    updated: "2026-09-08",
  },
  {
    slug: "tool-fuer-agentische-nutzung-der-website",
    question: "Gibt es ein Tool, das nur die agentische Nutzung meiner Website misst?",
    title: "Ein Tool, das nur die agentische Nutzung deiner Website misst",
    summary:
      "Ja. Agent Tracking zählt nichts als Agenten: die Besucher, die Assistenten schicken, die Seiten, die Crawler lesen, die Tools, die Agenten aufrufen, und die Ziele, die sie erreichen. Menschlicher Traffic bleibt in deinem Web-Analytics; dieses Dashboard zeigt den agentischen Teil deiner Site für sich, damit die Zahlen nicht von allem anderen verwässert werden.",
    sections: [
      { h: "Warum ein eigenes Tool statt eines Segments", p: ["Ein Segment im Web-Analytics kann Besuche mit Assistenten-Referrer isolieren, und das ist das einzige der vier Agentensignale, das es sehen kann. Crawler-Abrufe führen das Analytics-Script nie aus, Tool-Aufrufe verlassen den Browser nie, und eine von einem Agenten erreichte Conversion sieht aus wie jede andere. Ein für Agenten gebautes Tool liest die anderen Quellen: das Server-Log, die Model-Context-API des Browsers und Zielmarker in der Seite."] },
      { h: "Was als agentische Nutzung zählt", p: ["Ein Besuch von ChatGPT, Perplexity, Claude, Copilot oder Gemini. Ein Abruf durch GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Applebot-Extended oder einen anderen benannten Crawler, verifiziert gegen die Adressbereiche des Anbieters. Ein Aufruf eines MCP- oder WebMCP-Tools auf der Seite. Ein erreichtes Ziel in einer als Agent erkannten Sitzung. Reine Seitenaufrufe von Menschen werden nur als Summe zur Einordnung erfasst und nie auf das Kontingent angerechnet."] },
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
      { h: "Wo das Signal steckt", p: ["ChatGPT sendet chatgpt.com als Referrer für Links, die jemand in einer Antwort anklickt. Perplexity sendet perplexity.ai, Claude claude.ai, Copilot copilot.microsoft.com, Gemini gemini.google.com. OpenAI hängt an viele Links zusätzlich utm_source=chatgpt.com. Beides sieht ein Script auf deiner Seite, und sonst nichts."] },
      { h: "Warum Google Analytics zu wenig zählt", p: ["GA4 fasst diese Hosts unter Referral zusammen, ohne den Assistenten zu nennen, und Links, die in Apps oder ohne Referrer geöffnet werden, landen unter Direct. Du kannst ein Segment nach Hostname bauen, wenn du die Liste kennst, und musst es pflegen, wenn Assistenten ihre Domains ändern. Agent Tracking hält diese Liste in einer versionierten Datei, wendet sie auf dem Server an und zeigt das Ergebnis je Assistent."] },
      { h: "Einrichten", p: ["Site hinzufügen, Snippet einbauen, prüfen. Ab dem ersten Besuch listet die Agenten-Ansicht jeden Assistenten als Referral-Zeile mit Anzahl, Anteil am Agententraffic und Trend; die Seiten-Ansicht zeigt, wo diese Besucher landen, und das ist meist nicht die Startseite."], code: SNIPPET, codeLang: "html" },
      { h: "Was du mit der Zahl machst", p: ["Zwei Wochen Referral-Zeilen zeigen, welche Inhalte Assistenten zitieren und welche sie ignorieren. Das ist die Rückkopplung, die Generative Engine Optimization gefehlt hat: Seite ändern, beobachten, ob der Assistent anfängt, Menschen dorthin zu schicken. Dieselben Zeilen kommen aus der Stats-API, oder frag Claude oder ChatGPT über das MCP-Tool."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Trägt jeder ChatGPT-Klick einen Referrer?", a: "Nein. Manche Clients entfernen ihn. Diese Besuche zählen als normale Aufrufe, die Zahl ist also eine Untergrenze, nie eine Schätzung." },
      { q: "Wird die Person identifiziert?", a: "Nein. Die Sitzungskennung ist ein täglich neu gesalzener Hash, die Adresse wird nicht gespeichert, kein Cookie gesetzt." },
    ],
    related: ["welche-ki-assistenten-schicken-besucher", "ki-agenten-auf-der-website-tracken"],
    updated: "2026-09-08",
  },
  {
    slug: "kann-google-analytics-ki-agenten-messen",
    question: "Kann Google Analytics oder Plausible KI-Agenten messen?",
    title: "Kann Google Analytics oder Plausible KI-Agenten messen?",
    summary:
      "Teilweise. Web-Analytics kann Besuche mit Assistenten-Referrer zeigen, wenn du das Segment selbst baust und pflegst. Es sieht keine Crawler, die sein Script nie ausführen; es sieht keine MCP- oder WebMCP-Tool-Aufrufe, die den Browser nie verlassen; und es kann die Conversion eines Agenten nicht von der eines Menschen unterscheiden. Agent Tracking deckt diese drei ab und läuft neben deinem Analytics, nicht statt dessen.",
    sections: [
      { h: "Was Web-Analytics sieht", p: ["Ein Referral von chatgpt.com oder perplexity.ai ist ein normaler Seitenaufruf mit Referrer, und GA4, Plausible und Matomo erfassen ihn. Ob sie den Assistenten benennen, hängt von dir ab: GA4 braucht eine eigene Channel-Gruppe, Plausible einen Filter auf den Referrer, Matomo ein Segment. Jedes davon muss aktualisiert werden, wenn ein Assistent seine Domain ändert."] },
      { h: "Was es nicht sehen kann", p: ["GPTBot, ClaudeBot und PerplexityBot holen HTML und führen nie JavaScript aus, also feuert kein Analytics-Script; nur das Server-Log weiß, dass sie da waren. Ein WebMCP-Tool-Aufruf passiert im Browser des Besuchers zwischen Assistent und Seite; keine Anfrage erreicht einen Analytics-Endpunkt. Und ein von einem Agenten abgeschlossener Kauf sieht genau aus wie einer von einem Menschen, nichts trennt die beiden."] },
      { h: "Was Agent Tracking ergänzt", p: ["Crawler-Abrufe aus dem Server-Log, gegen die veröffentlichten IP-Bereiche der Anbieter verifiziert und zu Bursts gruppiert. Tool-Aufrufe mit Dauer, Erfolgsquote, Fehlerklasse und Feldnamen. Über einen Zielmarker Agenten zugeschriebene Conversions. Und Assistenten-Referrals aus einer gepflegten Liste, damit niemand das Segment bauen muss."] },
      { h: "Beides nutzen", p: ["Behalte dein Analytics für Menschen. Ergänze ein Script-Tag für Agenten. Die beiden überschneiden sich nicht, und das Agenten-Dashboard bleibt klein genug, um es in einer Minute zu lesen."], code: SNIPPET, codeLang: "html" },
    ],
    faq: [
      { q: "Ersetzt Agent Tracking mein Analytics?", a: "Nein. Es zählt eine andere Population. Menschlicher Traffic erscheint nur als Tagessumme zur Einordnung." },
      { q: "Kann ich das alles mit genug Aufwand in GA4 bauen?", a: "Den Referral-Teil, ja. Der Crawler-Teil braucht Log-Verarbeitung außerhalb von GA4, und Tool-Aufrufe und Agenten-Conversions brauchen Code in der Seite, den GA4 nicht liefert." },
    ],
    related: ["tool-fuer-agentische-nutzung-der-website", "chatgpt-referral-traffic-sehen", "unterschied-zu-agentops-und-langsmith"],
    updated: "2026-09-08",
  },
  {
    slug: "unterschied-zu-agentops-und-langsmith",
    question: "Was ist der Unterschied zwischen Agent Tracking und AgentOps oder LangSmith?",
    title: "Agent Tracking gegenüber AgentOps, LangSmith und LLM-Observability",
    summary:
      "AgentOps, LangSmith, Langfuse und ähnliche Werkzeuge tracen die Agenten, die du baust, von innen aus deinem eigenen Code: Prompts, Spans, Token-Kosten, Evaluationsläufe. Agent Tracking misst Agenten, die andere betreiben, wenn sie deine Website besuchen, von außen, über ein Script-Tag und dein Server-Log. Das eine ist Observability für dein Produkt, das andere Analytics für deine Site. Ein Team, das Agenten baut und eine Website betreibt, braucht womöglich beides.",
    sections: [
      { h: "Wo beides sitzt", p: ["Observability lebt in deiner Anwendung: Ein SDK umhüllt deine LLM-Aufrufe und Tool-Ausführungen und schickt Traces in ein Dashboard. Es beantwortet, warum dein Agent eine Ausgabe erzeugt hat und was sie gekostet hat. Agent Tracking lebt auf deinen Webseiten: Ein Script beobachtet Referrals und Tool-Aufrufe, ein Log-Import beobachtet Crawler. Es beantwortet, welche Agenten deine Site nutzen und was sie erreichen."] },
      { h: "Was nur eines von beiden weiß", p: ["Nur Observability kennt den Prompt, die Gedankenkette und die Token-Rechnung deines Agenten. Nur Agent Tracking weiß, dass ChatGPT diese Woche 40 Besucher auf deine Preisseite geschickt hat, dass PerplexityBot letzte Nacht 300 Seiten geholt hat oder dass ein Assistent dein Buchungs-Tool sechsmal aufgerufen hat und an einem Pflichtfeld gescheitert ist. Die Daten überschneiden sich nie, weil die Agenten andere sind: deine gegen die aller anderen."] },
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
    question: "Brauche ich Cloudflare AI Audit, wenn ich Agent Tracking habe, oder umgekehrt?",
    title: "Cloudflare AI Audit und Agent Tracking: was beide abdecken",
    summary:
      "Cloudflare AI Audit zählt und steuert Crawler am Netzrand, für Sites hinter Cloudflare, und kann sie blockieren oder Geld verlangen. Agent Tracking misst Referrals, Abrufe und Tool-Aufrufe in der Seite und aus deinem eigenen Log, braucht kein CDN, verifiziert Crawler gegen Anbieter-IP-Bereiche und folgt Agenten bis zum Ziel. Wer Crawler blockieren will, nimmt Cloudflare. Wer wissen will, was Agenten auf der Site tun und ob sie ans Ziel kommen, nimmt Agent Tracking. Viele Sites nutzen beides.",
    sections: [
      { h: "Was ein CDN-Bot-Audit gut kann", p: ["Es sitzt vor der Site, sieht also jede Anfrage, auch die, die dein Origin nie bekommt, und es kann handeln: erlauben, blockieren, prüfen oder pro Crawl abrechnen. Für einen Verlag, dem es vor allem um Trainings-Crawler geht, die Inhalte abgreifen, ist diese Kontrolle der Punkt."] },
      { h: "Was es nicht sieht", p: ["Ein von ChatGPT geschickter Besucher ist für das CDN ein Mensch, kein Agent. Ein WebMCP-Tool-Aufruf passiert im Browser und überquert nie den Netzrand. Ob ein Agent eine Buchung abgeschlossen hat, ist aus einem Anfrage-Log unsichtbar. Und es funktioniert nur, wenn dein DNS über Cloudflare läuft."] },
      { h: "Was Agent Tracking stattdessen abdeckt", p: ["Dem Assistenten zugeordnete Referrals, Crawler-Abrufe aus deinem eigenen Log, gegen die Adressbereiche der Anbieter verifiziert und zu Bursts gruppiert, Tool-Aufrufe mit Erfolg und Dauer und von Agenten erreichte Conversions. Es blockiert nie; es misst. Es läuft auf jedem Host, mit einem Script-Tag und einem optionalen Log-Upload."] },
      { h: "Beides nutzen", p: ["Lass Cloudflare deine Crawler-Regeln am Netzrand durchsetzen. Lass Agent Tracking dir sagen, welche Assistenten Geschäft schicken, welche Tools funktionieren und wo Agenten aufgeben. Die Crawler-Zahlen werden ungefähr übereinstimmen; der Rest existiert nur auf einer Seite."] },
    ],
    faq: [
      { q: "Kann Agent Tracking einen Crawler blockieren?", a: "Nein, mit Absicht. Blockieren gehört in die robots.txt oder an den Netzrand; dieses Tool sagt dir, was passiert, damit die Entscheidung informiert ist." },
      { q: "Braucht Agent Tracking Cloudflare?", a: "Nein. Es braucht ein Script-Tag auf der Seite und, für Crawler, ein Access-Log von irgendeinem Webserver." },
    ],
    related: ["welche-ki-crawler-lesen-meine-seiten", "kann-google-analytics-ki-agenten-messen"],
    updated: "2026-09-08",
  },
  {
    slug: "analytics-fuer-webmcp-tools",
    question: "Wie bekomme ich Analytics für WebMCP-Tools auf meiner Site?",
    title: "Analytics für WebMCP-Tools: Aufrufe, Erfolgsquote, Fehler, ungenutzte Tools",
    summary:
      "WebMCP-Tools laufen im Browser des Besuchers, also sieht kein Server-Log und kein Web-Analytics je einen Aufruf. Das Snippet von Agent Tracking umhüllt navigator.modelContext und document.modelContext, beobachtet deklarative Formulare und erfasst jede Registrierung und jeden Aufruf: Toolname, Dauer, Erfolg oder Fehlschlag, Fehlerklasse und die Namen der Eingabefelder, nie deren Werte. Die Tools-Ansicht zeigt dann, was funktioniert, was scheitert und was niemand aufruft.",
    sections: [
      { h: "Warum nichts anderes das misst", p: ["Ein WebMCP-Aufruf ist ein Funktionsaufruf zwischen Assistent und Seite. Es gibt keine HTTP-Anfrage zum Loggen, keinen Pixel, der feuert, keinen beteiligten Server. Wenn die Seite ihn nicht meldet, ist er für alle anderen nie passiert. Das Snippet meldet ihn, mit den Namen der Argument-Felder und nie den Werten."] },
      { h: "Nichts an deinen Tools ändern", p: ["Registriere Tools wie in der Spezifikation. Das Snippet umhüllt registerTool, bevor dein Code läuft, und fängt deklarative Formulare beim Absenden. Registrierungen erscheinen innerhalb einer Minute in der Tools-Ansicht."], code: TOOL, codeLang: "js" },
      { h: "Die Fragen, die die Tools-Ansicht beantwortet", p: ["Wie viele Aufrufe je Tool, je Tag. Welcher Anteil erfolgreich war und was die drei häufigsten Fehlermeldungen waren. Wie lange ein Aufruf im Schnitt dauerte. Welche Tools registriert, aber nie aufgerufen wurden, was meist eine Beschreibung bedeutet, die Agenten nicht verstehen, oder ein Schema, das sie nicht füllen können. Wann sich das Manifest unter /.well-known/webmcp zuletzt geändert hat, und in bezahlten Plänen eine Mail, wenn es passiert."] },
      { h: "Von Aufrufen zu Ergebnissen", p: ["Markiere das Ziel mit data-agent-goal oder behandle ein Tool als Ziel, und das Dashboard zeigt, ob die Agenten, die deine Tools aufgerufen haben, bis zum Ende gekommen sind. Der Abstand zwischen Aufrufen und Conversions ist die Zahl, an der sich Arbeit lohnt."], code: GOAL, codeLang: "html" },
    ],
    faq: [
      { q: "Deckt das auch entfernte MCP-Server ab?", a: "Nicht deren serverseitige Logs; die haben ihre eigenen. Agent Tracking sieht Tools, die in der Seite über die Model-Context-API des Browsers aufgerufen werden, und lässt dich über den MCP-Endpunkt die Zahlen lesen." },
      { q: "Werden Argumentwerte erfasst?", a: "Nie. Nur die Namen der Eingabefelder, damit du siehst, welche Felder Agenten schicken und welche sie auslassen." },
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
      { h: "Die drei Bestandteile", p: ["Crawler-Abrufe: GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended und Co., nur im Server-Log sichtbar, weil sie kein JavaScript ausführen. Live-Abrufe: ChatGPT-User, Perplexity-User und andere Assistenten, die gerade eine Frage über dich beantworten, meist drei bis zehn Seiten in wenigen Sekunden. Referrals: Menschen, die von einem Assistenten kommen, der dich zitiert hat. Die meisten Sites haben die ersten beiden lange vor dem dritten."] },
      { h: "An einem Tag messen", p: ["Site hinzufügen, Snippet einbauen, das Access-Log von gestern hochladen. Das Dashboard zeigt innerhalb von Minuten Abrufe je Agent mit Verifikation, Bursts, Referrals und Seiten, nach einer Woche einen Trend. Ein öffentliches Beispiel ist die Live-Stats-Seite dieser Site, täglich aktualisiert, und sie ist klein, weil die Domain neu ist."], code: LOG, codeLang: "sh" },
      { h: "Das Ergebnis lesen", p: ["Ein hoher, gleichmäßiger Abrufwert eines Crawlers ist Training oder Indexierung; ob du das willst, ist eine robots.txt-Entscheidung. Bursts von wenigen Seiten in Sekunden sind Fragen, die über dich beantwortet werden; diese Seiten hält der Assistent für relevant. Referrals sind der Teil, der zu Geschäft wird, und sie hinken den anderen beiden meist um Wochen hinterher. Unverifizierte Zeilen, die einen bekannten Bot behaupten, sind Nachahmer und einen Blick wert."] },
    ],
    faq: [
      { q: "Könnt ihr Benchmarks eurer Kunden teilen?", a: "Noch nicht, und nicht ohne deren Zustimmung. Die Pilotphase ist Tage alt. Wenn es genug Sites gibt und die Betreiber einverstanden sind, erscheinen hier aggregierte Spannen je Site-Typ." },
      { q: "Zählen Seitenaufrufe von Menschen auf mein Kontingent?", a: "Nein. Nur Agenten-Ereignisse zählen. Reine Seitenaufrufe erscheinen als Summe zur Einordnung." },
    ],
    related: ["welche-ki-crawler-lesen-meine-seiten", "ki-agenten-auf-der-website-tracken"],
    updated: "2026-09-08",
  },
  {
    slug: "welche-seiten-zitieren-ki-assistenten",
    question: "Welche Seiten zitieren KI-Assistenten von meiner Site?",
    title: "Herausfinden, welche Seiten KI-Assistenten von deiner Site zitieren",
    summary:
      "Zwei Signale beantworten das. Referrals zeigen, auf welcher Seite ein Mensch gelandet ist, nachdem ein Assistent sie zitiert hat, je Assistent. Abruf-Bursts zeigen, welche Seiten ein Assistent zusammengezogen hat, um eine Frage zu beantworten, bevor jemand geklickt hat. Agent Tracking erfasst beides, sodass die Seiten-Ansicht die Seiten listet, die Assistenten wirklich nutzen, nicht die, von denen du es gehofft hast.",
    sections: [
      { h: "Zitate hinterlassen zwei Spuren", p: ["Wenn ChatGPT oder Perplexity dich zitiert, passieren zwei Dinge. Zuerst holt der Assistent die Seite, oft zusammen mit zwei oder drei verwandten Seiten, innerhalb von Sekunden: ein Burst. Später, vielleicht, klickt ein Mensch das Zitat und kommt mit dem Assistenten als Referrer. Der Burst sagt, was erwogen wurde; das Referral sagt, was gewählt wurde."] },
      { h: "Wo du hinschaust", p: ["Die Seiten-Ansicht listet Seiten nach Agenten-Abrufen und Tool-Aufrufen. Die Agenten-Ansicht listet die jüngsten Bursts mit ihren Seiten. Die Referral-Zeilen der Agenten-Ansicht zeigen zusammen mit der Seiten-Ansicht die Landingpages je Assistent. Vergleich die drei: Eine Seite, die in Bursts geholt, aber nie verlinkt wird, wird ohne Klick zitiert, oder erwogen und verworfen."] },
      { h: "Einrichten", p: ["Referrals brauchen das Snippet auf jeder Seite. Bursts brauchen das Server-Log, einmal hochgeladen oder täglich geschickt. Beides zusammen dauert etwa zehn Minuten."], code: SNIPPET, codeLang: "html" },
      { h: "Daraus eine Schleife machen", p: ["Ändere eine Seite, die Assistenten ständig holen, aber nie Menschen hinschicken, und beobachte die Referral-Zeile zwei Wochen. Das ist Generative Engine Optimization mit einer Messung darin. Stell dieselbe Frage Claude oder ChatGPT über das MCP-Tool, wenn dir Worte lieber sind als Tabellen."], code: MCP, codeLang: "json" },
    ],
    faq: [
      { q: "Sehe ich die genaue Frage, die der Assistent beantwortet hat?", a: "Nein. Weder Referrer noch Abruf tragen den Prompt, und das Tool erfasst keine Inhalte. Die Seiten in einem Burst sind das nächste Signal." },
      { q: "Funktioniert das für Google AI Overviews?", a: "Abrufe durch Google-Extended und Googles nutzerausgelöste Fetcher werden aus dem Log gezählt. Referrals aus AI Overviews kommen als normale Google-Referrals und lassen sich über den Referrer allein nicht trennen." },
    ],
    related: ["chatgpt-referral-traffic-sehen", "welche-ki-assistenten-schicken-besucher", "welche-ki-crawler-lesen-meine-seiten"],
    updated: "2026-09-08",
  },
  {
    slug: "ist-diese-anfrage-wirklich-gptbot",
    question: "Wie erkenne ich, ob eine Anfrage, die sich als GPTBot ausgibt, echt ist?",
    title: "Prüfen, ob eine Anfrage, die sich als GPTBot ausgibt, wirklich von OpenAI kommt",
    summary:
      "Der User-Agent-String ist freier Text, und jeder kann ihn senden. OpenAI veröffentlicht die IP-Adressbereiche seiner Crawler, ebenso Perplexity, Microsoft, Google und Apple. Eine Anfrage ist echt, wenn ihre Adresse im veröffentlichten Bereich dieses Crawlers liegt; sonst ist sie ein Nachahmer, egal was der String sagt. Agent Tracking macht diese Prüfung für jede Log-Zeile und listet Nachahmer als unverifiziert, statt sie zu zählen.",
    sections: [
      { h: "Warum der String nicht reicht", p: ["Scraper kopieren den GPTBot-User-Agent, weil Sites ihn meist erlauben. Eine robots.txt-Regel oder eine Drosselung auf den String behandelt die Kopie also wie das Original. Das einzige verlässliche Signal ist die Netzwerkadresse, die die Anbieter genau deshalb veröffentlichen."] },
      { h: "Woher die Bereiche kommen", p: ["OpenAI veröffentlicht getrennte JSON-Listen für GPTBot, ChatGPT-User und OAI-SearchBot. Perplexity, Microsoft, Google und Apple veröffentlichen ihre. Die Listen ändern sich; Agent Tracking aktualisiert sie nächtlich und prüft jede Log-Zeile gegen die Liste des Crawlers, den sie behauptet."] },
      { h: "Von Hand", p: ["Nimm die Adresse aus der Log-Zeile, hol die Liste des Anbieters und prüf, ob die Adresse in einem der CIDR-Blöcke liegt. Für eine Zeile ist das eine Minute; für das Log einer Nacht ein Script. Der Log-Import macht es für jede Zeile und zeigt das Ergebnis je Agent als verifizierte und unverifizierte Zahlen."], code: LOG, codeLang: "sh" },
      { h: "Was du mit einem Nachahmer machst", p: ["Nichts Automatisches; das Tool blockiert nie. Aber ein Agent, dessen unverifizierter Anteil groß ist, ist eine Regel am Netzrand oder in der robots.txt wert, und der verifizierte Anteil sagt dir, wie viel echten Crawler-Traffic du behalten würdest."] },
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
      "Manche ja, die meisten nicht, und die ehrliche Antwort für deine Site ist eine Messung statt einer Meinung. Browser-steuernde Assistenten können heute Formulare füllen und Knöpfe drücken; WebMCP lässt eine Site den Checkout als Tool anbieten statt als Rätsel; die Zahlungswege für unbeaufsichtigte Käufe sind jung. Markiere das Ziel mit einem Attribut, und Agent Tracking zeigt von Agenten erreichte Conversions getrennt von Menschen, damit du es für deinen Shop weißt.",
    sections: [
      { h: "Was Agenten heute können", p: ["Assistenten mit Browsersteuerung navigieren Seiten, füllen Formulare und klicken, wie ein Mensch, und scheitern, wo ein Mensch nicht scheitern würde: versteckte Pflichtfelder, CAPTCHAs, Layouts, die nur visuell Sinn ergeben. Sites, die WebMCP-Tools registrieren, geben dem Assistenten stattdessen eine dokumentierte Funktion, schneller und mit weniger Fehlern. Zahlen ohne Mensch an der Tastatur braucht einen Weg wie das Agentic Commerce Protocol, das Universal Commerce Protocol oder x402, und die Verbreitung ist früh."] },
      { h: "Wie du es auf deiner Site misst", p: ["Setze data-agent-goal auf das Element, das fertig bedeutet: den Bestellknopf, die Buchungsbestätigung. Registriere den Checkout als Tool, wenn du WebMCP hast. Der Überblick zeigt dann Conversions pro Tag und die Tools-Ansicht, wo Aufrufe scheitern. Eine Sitzung wird über Referrer oder User-Agent einem Agenten zugeordnet, sodass ein Kauf eines von ChatGPT geschickten Menschen als KI-Referral-Conversion zählt und ein von einem Assistenten im Browser gesteuerter Kauf als Agenten-Conversion."], code: GOAL, codeLang: "html" },
      { h: "Die Lücke lesen", p: ["Tool-Aufrufe ohne Conversions heißen: Agenten versuchen es und kommen nicht ans Ende; die Fehlerklasse in der Tools-Ansicht sagt meist warum. Conversions ohne Tool-Aufrufe sind Menschen. Keine der beiden Zahlen gibt es sonst irgendwo, weil ein Kauf eines Agenten für ein Shopsystem aussieht wie jeder andere."] },
      { h: "Was diese Site veröffentlichen wird", p: ["Aggregierte Raten je Site-Typ, sobald genug Shops in der Pilotphase laufen und ihre Betreiber zustimmen. Bis dahin zählt die eigene Zahl, und die kostet ein Attribut."] },
    ],
    faq: [
      { q: "Sieht Agent Tracking den Bestellwert?", a: "Nein. Eine Conversion trägt Zielname, Seite und Agentenklasse. Umsatz bleibt in deinem Shopsystem; verknüpfe ihn zeitlich, wenn du ihn brauchst." },
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
      "Ja, aber es kommt darauf an, was du mit agentischem Besucher meinst, denn es sind drei verschiedene Dinge, und die meisten Analytics sehen nur eines davon: ein Referral (ein Mensch, den ein Assistent geschickt hat), ein Abruf (der Agent lädt selbst Seiten, verifiziert über IP-Bereiche und zu Bursts gruppiert) und ein Tool-Aufruf (ein Assistent bedient deine MCP- oder WebMCP-Tools im Browser). Verhalten ist die Kombination aller drei, und nur die Kombination sagt, ob ein Agent erledigt hat, wofür er kam.",
    sections: [
      { h: "Ebene 1: Referrals", p: ["Ein Mensch klickt einen Link in ChatGPT, Perplexity, Claude oder Copilot. Der Besuch kommt mit einem Referrer wie chatgpt.com oder perplexity.ai, und OpenAI hängt oft utm_source=chatgpt.com an. GA4 oder Plausible können das zeigen, wenn du ein Segment nach Hostname baust und es pflegst, wenn Assistenten ihre Domains ändern. Agent Tracking hält diese Liste in einer versionierten Datei und zeigt jeden Assistenten als eigene Zeile."] },
      { h: "Ebene 2: Abrufe", p: ["Der Agent lädt selbst deine Seiten: GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot oder Live-Fetcher wie ChatGPT-User. Die meisten führen nie JavaScript aus, also feuert kein Analytics-Script; sie existieren nur im Server-Log. Zwei Dinge zählen hier. Verifikation: Jeder kann einen User-Agent-String fälschen, also muss die Adresse gegen die Bereiche geprüft werden, die OpenAI, Perplexity, Microsoft, Google und Apple veröffentlichen. Bursts: Ein Agent, der fünf Seiten in vier Sekunden holt, ist ein Live-Assistent, der gerade eine Frage beantwortet, kein Routine-Crawl."], code: LOG, codeLang: "sh" },
      { h: "Ebene 3: Tool-Aufrufe und Ausführung im Browser", p: ["Wenn deine Site MCP- oder WebMCP-Tools bereitstellt, ruft ein Assistent sie im Browser des Besuchers auf. Keine eigene Seitenanfrage erreicht einen Server, also kann nur ein Event-Tracking auf der Seite es erfassen: Dauer, Fehlerquoten, Tools, die niemand aufruft, und Zielabschlüsse wie ein Checkout. Das Snippet umhüllt die Model-Context-API des Browsers und erfasst die Namen der Eingabefelder, nie deren Werte."], code: SNIPPET, codeLang: "html" },
      { h: "Verhalten ist die Kombination", p: ["Welche Seiten ein Burst trifft, welche Tools scheitern und ob der Assistent das eigentliche Ziel erreicht. Wenn dich nur Ebene 2 interessiert, bringt dich ein Log-Parser plus die IP-Listen der Anbieter weit. Wenn du alle drei auf einem Board willst, Open Source und selbst hostbar, ist das Agent Tracking. AgentOps oder LangSmith kümmern sich um Observability für Agenten, die du selbst baust, und zeigen keine fremden Besucher auf deiner Website."] },
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
  return lang === "de" ? DE : EN;
}

export function guideBySlug(lang: DashLang, slug: string): Guide | undefined {
  return guides(lang).find((g) => g.slug === slug);
}

/** The same guide in the other language, by position: the two lists are kept in the same order. */
export function counterpart(lang: DashLang, slug: string): Guide | undefined {
  const i = guides(lang).findIndex((g) => g.slug === slug);
  return i < 0 ? undefined : guides(lang === "de" ? "en" : "de")[i];
}
