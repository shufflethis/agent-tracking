import type { DashLang } from "@/lib/tracking/copy";

/**
 * The positioning of the product, in both languages, as data.
 *
 * One structure feeds the landing pages, the FAQ schema and llms-full.txt, so
 * a search engine, an answer engine and a person read the same sentences.
 * Written to be quotable: each definition is one sentence that stands alone.
 */

export type Row = { k: string; t: string; d: string };
export type Compare = { label: string; us: string; analytics: string; cdn: string; logs: string; saas: string };
export type Faq = { q: string; a: string };

export type HomeContent = {
  /** The category in three words, used wherever the ambiguous name needs a qualifier. */
  category: string;
  definitionTitle: string;
  definition: string;
  definitionMore: string;
  notTitle: string;
  notDek: string;
  not: Row[];
  /** Products whose names are one letter away from this one. Named so a reader, or a model, stops confusing them. */
  notNamesTitle: string;
  notNames: { name: string; what: string }[];
  seesTitle: string;
  seesDek: string;
  sees: Row[];
  seesScore: string;
  fightTitle: string;
  fightDek: string;
  fight: Row[];
  whoTitle: string;
  whoDek: string;
  who: Row[];
  useTitle: string;
  useDek: string;
  use: Row[];
  useAsk: string[];
  whyTitle: string;
  whyDek: string;
  compareHead: { feature: string; us: string; analytics: string; cdn: string; logs: string; saas: string };
  compare: Compare[];
  compareNote: string;
  euTitle: string;
  euDek: string;
  eu: Row[];
  valueTitle: string;
  valueDek: string;
  value: Row[];
  faqTitle: string;
  faqDek: string;
  faq: Faq[];
};

const EN: HomeContent = {
  category: "AI agent analytics for websites",
  definitionTitle: "What Agent Tracking does",
  definition:
    "Agent Tracking is AI agent analytics for websites: it records which AI assistants send visitors, which AI crawlers and live fetchers read pages, which MCP and WebMCP tools an agent calls inside the browser, and whether the agent reaches a goal.",
  definitionMore:
    "Web analytics counts people. Bot managers count crawlers at the edge. Neither sees the agent that is already inside the site, calling a tool or finishing a booking on someone's behalf. Agent Tracking measures that third kind of visitor, from the referral to the completed action, with one line of script, without cookies and without personal data.",
  notTitle: "What it is not",
  notDek: "The name is used for five other things. None of them is this. If a search engine or an assistant sent you here for one of those, this is the wrong page, and here is where the right one lives.",
  not: [
    { k: "Not agent observability", t: "AgentOps, LangSmith, Langfuse, OpenTelemetry for LLM apps", d: "Those trace the agents you build, from inside your own code: spans, prompts, token cost. Agent Tracking measures agents other people run when they visit your website, from the outside, with a script tag. The two are complementary; a team can use both." },
    { k: "Not workforce tracking", t: "Call-centre or support agents", d: "No schedule adherence, handle time, idle time or ticket counts of human employees. The word agent here means a piece of software acting for a person." },
    { k: "Not field tracking", t: "Sales reps, couriers, GPS check-ins", d: "No location, no route, no visit duration of any person. Nothing here knows where anyone is." },
    { k: "Not parcel tracking", t: "Air waybills, shipments, delivery agents", d: "Not a package lookup and not connected to any carrier." },
    { k: "Not mobile agents", t: "The distributed-computing sense", d: "Not a mechanism for forwarding or locating migrating code across hosts." },
    { k: "Not a bot blocker", t: "No CAPTCHA, no firewall, no rate limit on your visitors", d: "It measures and never blocks. The only request it makes to your site is one fetch of the homepage to verify the snippet." },
  ],
  notNamesTitle: "Similar names, unrelated products",
  notNames: [
    { name: "Agent Track (agenttrack.io)", what: "a CRM and marketing platform for real-estate buyers' agents" },
    { name: "AgencyTrack (agencytrack.app)", what: "an insurance agency management system" },
    { name: "AgenTrak", what: "employee monitoring and workforce analytics software" },
    { name: "agent tracking automation (API Nation and similar)", what: "syncing sales-agent KPIs into spreadsheets" },
    { name: "AgentOps, LangSmith, Langfuse", what: "observability for agents a developer builds" },
  ],
  seesTitle: "What it sees",
  seesDek: "Five layers, from the first click to the finished job. Each one comes from a source you can check.",
  sees: [
    { k: "AI referrals", t: "Who sends visitors", d: "A visit from chatgpt.com, perplexity.ai, claude.ai, copilot.microsoft.com, gemini.google.com and a dozen more is attributed to the assistant, from the referrer and utm_source, matched against a published, versioned list." },
    { k: "AI fetches", t: "Who reads your pages", d: "GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Applebot-Extended, Bytespider and the rest. Agents that run JavaScript are seen by the snippet; the others come from your server log, each line verified against the vendor's published IP ranges, and grouped into fetch bursts: one agent, many pages, a few seconds, which is what a query fan-out looks like from your side." },
    { k: "Tool calls", t: "What they do with your tools", d: "Every MCP and WebMCP tool on the site: calls, duration, success rate, error classes, the names of the input keys, and the tools no agent has ever called. The snippet wraps navigator.modelContext and watches declarative forms; nothing in your code changes." },
    { k: "Conversions", t: "Whether they finish", d: "Mark a booking, an order or a signup with data-agent-goal and see the conversion rate of agents, separately from people." },
    { k: "Manifest", t: "When your tool list changes", d: "The manifest at /.well-known/webmcp is hashed once per visit. The dashboard shows when it last changed; Pro accounts are alerted by email." },
  ],
  seesScore: "Beside the numbers stands the site's Agent Readiness Score from webmcp-tool.com: how well the site can be used by agents, next to how much it actually is.",
  fightTitle: "Win the fight for AI bot traffic",
  fightDek: "Agents already decide which sites get cited, read and used. Most sites have no idea what agents do on them. The one that knows can improve; the rest guess. Four steps, repeated.",
  fight: [
    { k: "1. Measure", t: "Every agent, every action", d: "Referrals, verified fetches, bursts, tool calls, goals. Not sampled, not estimated: the actual events, with the agent named." },
    { k: "2. Understand", t: "Study how MCP and WebMCP agents behave", d: "Which pages a crawler takes, in which order and how fast. Which tool an assistant tries first, where it fails, which argument keys it sends, whether it reaches the goal or gives up." },
    { k: "3. Fix", t: "Change the site, the tools, the manifest", d: "Rename the tool the agent keeps missing. Fix the error class that fails half the calls. Open the page every fan-out lands on. Publish the manifest agents look for." },
    { k: "4. Verify", t: "Readiness score and real usage, side by side", d: "The score from webmcp-tool.com says whether agents can use the site. The numbers say whether they do. When both go up, you are winning." },
  ],
  whoTitle: "Who it is for",
  whoDek: "Anyone whose site is read, cited or operated by AI agents, which today is every site that ranks.",
  who: [
    { k: "Marketing and GEO", t: "Teams working on AI visibility", d: "Know which assistants send visitors and which pages they cite, week over week. The number your generative engine optimisation was missing." },
    { k: "Developers", t: "Teams publishing MCP and WebMCP tools", d: "Production analytics for your tools: calls, success rate, duration, errors, the tools nobody uses. The only place this exists." },
    { k: "Agencies", t: "Many client sites, one account", d: "Unlimited sites on the Agency plan, a public stats page per client, a white-label badge, one API token for your own reporting." },
    { k: "European companies", t: "Data protection first", d: "No consent banner, no transfer, a DPA on adding the site, hosting in Germany, or your own server. The dashboard your DPO signs off." },
  ],
  useTitle: "Ask your agent, not a dashboard",
  useDek: "Every number is an MCP tool. Point the agent you already use at it and ask in words. Claude, ChatGPT, Cursor, Codex, Hermes, OpenClaw: anything that speaks MCP, or a script with curl.",
  use: [
    { k: "Claude", t: "Claude Desktop and Claude Code", d: "Add the MCP server with your token and ask: which agents read our site this week, and which tool failed most?" },
    { k: "ChatGPT", t: "Connectors and custom GPTs", d: "The same endpoint as a connector, and your GPT answers from your own agent data." },
    { k: "Cursor, Codex, Hermes, OpenClaw", t: "Any MCP client, in the terminal or a workflow", d: "One JSON block in the client config. The agent that writes your code can read how agents use the result." },
    { k: "Scripts and BI", t: "JSON, CSV, weekly digest", d: "GET /api/stats for dashboards and notebooks, CSV export for spreadsheets, a Monday mail with the week's numbers for people who read mail." },
  ],
  useAsk: ["Which agents read our site this week, and which pages did they take?", "Which of our WebMCP tools has the worst success rate, and what is the top error?", "Did any fetch burst look like a Perplexity fan-out on the pricing page?", "How many agent conversions did we have in the last 30 days, compared to the 30 before?"],
  whyTitle: "Why it is different",
  whyDek: "Every tool on the market measures people or crawlers. The layer in between, where an agent uses the site, is the one nobody measured. Categories rather than vendor names, because products change; check any one of them against the rows.",
  compareHead: { feature: "", us: "Agent Tracking", analytics: "Web analytics", cdn: "CDN bot audit", logs: "Log analyzer", saas: "AI referral SaaS" },
  compare: [
    { label: "AI referrals attributed to the assistant", us: "yes", analytics: "partly", cdn: "no", logs: "no", saas: "yes" },
    { label: "Crawler fetches verified against vendor IP ranges", us: "yes", analytics: "no", cdn: "yes", logs: "partly", saas: "no" },
    { label: "Fetch bursts (query fan-outs)", us: "yes", analytics: "no", cdn: "no", logs: "no", saas: "no" },
    { label: "MCP and WebMCP tool calls with success, errors, duration", us: "yes", analytics: "no", cdn: "no", logs: "no", saas: "no" },
    { label: "Agent conversions (goals reached by agents)", us: "yes", analytics: "no", cdn: "no", logs: "no", saas: "no" },
    { label: "Manifest change alerts", us: "yes", analytics: "no", cdn: "no", logs: "no", saas: "no" },
    { label: "Readiness score beside the usage", us: "yes", analytics: "no", cdn: "no", logs: "no", saas: "no" },
    { label: "Works without a CDN or proxy in front of the site", us: "yes", analytics: "yes", cdn: "no", logs: "yes", saas: "yes" },
    { label: "No cookies, no IP stored, no consent banner", us: "yes", analytics: "some", cdn: "n/a", logs: "no", saas: "rarely" },
    { label: "Data stays in the EU", us: "yes, server in Germany", analytics: "depends", cdn: "no", logs: "yes", saas: "no" },
    { label: "Numbers as JSON and as an MCP tool", us: "yes", analytics: "API only", cdn: "no", logs: "no", saas: "API only" },
    { label: "Open source, self-hostable, one file to back up", us: "yes", analytics: "some", cdn: "no", logs: "yes", saas: "no" },
  ],
  compareNote: "The middle five rows are the ones you will not find elsewhere.",
  euTitle: "Built for European companies and professionals",
  euDek: "Usable by a company that has a data protection officer, a works council and a lawyer, without a consent banner and without a transfer to think about.",
  eu: [
    { k: "GDPR by construction", t: "Not by banner", d: "No cookies, nothing on the device, no network address stored, no fingerprint. The session id is a hash of a value that changes every day, so yesterday's rows cannot be linked to today's. Tool arguments are recorded as key names, never values. Raw events are deleted after 90 days." },
    { k: "Hosted in Germany", t: "With a DPA you conclude by adding a site", d: "The data processing agreement names the sub-processors, includes the EU standard contractual clauses and describes the processing exactly as the code does it. Your data protection officer can read the source." },
    { k: "Two languages", t: "Dashboard, docs and legal pages", d: "English and German throughout, English binding. Support in both." },
    { k: "Self-hostable", t: "When data must not leave your house", d: "One Node process, one SQLite file, AGPL-3.0, ten minutes with Docker. What the cloud does, your server does." },
  ],
  valueTitle: "The concrete value",
  valueDek: "Six questions the dashboard answers that nothing else on your site can.",
  value: [
    { k: "Channels", t: "Who sends you business", d: "\"Perplexity referred 40 visitors this week, ChatGPT 12, and they land on the pricing page.\" A channel you can now optimise, and a number for whoever asks whether AI matters for your site." },
    { k: "Readers", t: "Who reads you, and what they take", d: "GPTBot fetching 400 pages a night is training. ChatGPT-User fetching 3 pages in 4 seconds is a person asking about you right now. The Agents view tells them apart; the bursts tell you which question." },
    { k: "Tools", t: "Whether your tools work for agents", d: "You published MCP or WebMCP tools. Are they called? Do they fail? Which error? How long do they take? Which ones has no agent ever touched? This view is the only place that exists." },
    { k: "Goals", t: "Whether agents finish", d: "A tool call is not a sale. Mark the goal and see the conversion rate of agents, separately from people." },
    { k: "Monitoring", t: "What machines do to your site", d: "Verified fetches, impostors claiming to be a known bot, bursts, manifest changes: the operational picture of non-human behaviour, every day, in one place." },
    { k: "Your agents", t: "The numbers in your own tools", d: "A bearer token and one MCP tool, and Claude, ChatGPT or Cursor answer \"which agents read our site this week?\" from your data." },
  ],
  faqTitle: "Questions people ask",
  faqDek: "Short answers. The documentation has the long ones.",
  faq: [
    { q: "What is Agent Tracking?", a: "Agent Tracking is an open-source analytics service that measures what AI agents do on a website: AI referrals, AI crawler fetches verified against published IP ranges, MCP and WebMCP tool calls with their outcome, and conversions reached by agents. It is installed with one script tag and stores no cookies and no personal data. Its category is AI agent analytics for websites." },
    { q: "Is this the same as AgentOps, LangSmith or LLM observability?", a: "No. Observability tools trace the agents you build, from inside your code. Agent Tracking measures agents that other people run when they visit your website, from the outside, through a script tag on your pages. It does not see prompts, spans or token costs, and it needs no SDK. The two complement each other." },
    { q: "Does it track call-centre agents, field staff or parcels?", a: "No. Agent here means software acting for a person: ChatGPT, Claude, Perplexity, a crawler, a WebMCP-capable browser. Nothing in the product records people, locations, shifts or shipments." },
    { q: "Is agenttracking.co the same as Agent Track, AgencyTrack or AgenTrak?", a: "No. Agent Track (agenttrack.io) is a CRM for real-estate agents, AgencyTrack (agencytrack.app) manages insurance agencies, and AgenTrak monitors employees. agenttracking.co is Agent Tracking, an open-source analytics service that measures what AI agents such as ChatGPT, Claude, Perplexity and their crawlers do on a website. The names are similar; the products have nothing in common." },
    { q: "How is it different from Google Analytics or Plausible?", a: "Web analytics counts people and their pages. Agent Tracking counts agents and their actions: which assistant sent the visitor, which crawler read which pages, which tool an agent called and whether it succeeded. It runs beside your analytics, not instead of it." },
    { q: "How is it different from Cloudflare AI Audit or a bot manager?", a: "A bot manager sees crawlers at the edge and needs to sit in front of your site. Agent Tracking sees referrals, fetches and tool calls inside the page, needs no CDN, verifies crawlers against vendor IP ranges from your own log, and measures whether agents reach a goal." },
    { q: "Do I need a cookie banner for it?", a: "No. The snippet sets no cookie, writes nothing to the device, stores no network address and builds no fingerprint. The session id is a hash of a daily random value. Consent under ePrivacy is for storage on the device, and there is none." },
    { q: "Where is the data stored?", a: "On a server in Germany. A data processing agreement with the EU standard contractual clauses is concluded when you add a site. Or run the software yourself: it is open source under AGPL-3.0." },
    { q: "How long does installation take?", a: "About a minute: sign in by email, add the domain, paste one script tag on every page, press verify. Tools registered through navigator.modelContext are picked up automatically. Server logs for crawlers that do not run JavaScript can be uploaded or sent by a daily cron." },
    { q: "What does it cost?", a: "Free during the pilot: one site, 10,000 agent events a month, 30 days of history, no card. Plain page views are never counted. Paid plans with more sites and a year of history follow with 30 days' notice. Self-hosting is free." },
    { q: "Can my own agents read the numbers?", a: "Yes. Every number is available as JSON through a bearer token and as an MCP tool named get_agent_stats, so Claude, ChatGPT, Cursor or a script can ask which agents read your site this week." },
  ],
};

const DE: HomeContent = {
  category: "KI-Agenten-Analytics für Websites",
  definitionTitle: "Was Agent Tracking macht",
  definition:
    "Agent Tracking ist KI-Agenten-Analytics für Websites: Es erfasst, welche KI-Assistenten Besucher schicken, welche KI-Crawler und Live-Abrufer Seiten lesen, welche MCP- und WebMCP-Tools ein Agent im Browser aufruft und ob der Agent ein Ziel erreicht.",
  definitionMore:
    "Web-Analytics zählt Menschen. Bot-Manager zählen Crawler am Rand des Netzes. Keiner sieht den Agenten, der schon in der Site ist, ein Tool aufruft oder für jemanden eine Buchung abschließt. Agent Tracking misst diese dritte Besucherart, von der Empfehlung bis zur erledigten Aufgabe, mit einer Zeile Script, ohne Cookies und ohne personenbezogene Daten.",
  notTitle: "Was es nicht ist",
  notDek: "Der Name steht auch für fünf andere Dinge. Keines davon ist das hier. Wenn dich eine Suchmaschine oder ein Assistent wegen einem davon hierher geschickt hat, ist das die falsche Seite, und hier steht, wo die richtige liegt.",
  not: [
    { k: "Keine Agent-Observability", t: "AgentOps, LangSmith, Langfuse, OpenTelemetry für LLM-Apps", d: "Die tracen die Agenten, die du selbst baust, von innen aus deinem Code: Spans, Prompts, Token-Kosten. Agent Tracking misst Agenten, die andere betreiben, wenn sie deine Website besuchen, von außen, per Script-Tag. Beides ergänzt sich; ein Team kann beides nutzen." },
    { k: "Kein Workforce-Tracking", t: "Callcenter- oder Support-Agenten", d: "Keine Schichttreue, Bearbeitungszeit, Leerlaufzeit oder Ticketzahlen von Mitarbeitern. Agent heißt hier eine Software, die für einen Menschen handelt." },
    { k: "Kein Außendienst-Tracking", t: "Vertriebler, Kuriere, GPS-Check-ins", d: "Kein Standort, keine Route, keine Besuchsdauer irgendeiner Person. Nichts hier weiß, wo jemand ist." },
    { k: "Keine Paketverfolgung", t: "Luftfrachtbriefe, Sendungen, Zustellagenten", d: "Keine Sendungssuche und mit keinem Versanddienst verbunden." },
    { k: "Keine mobilen Agenten", t: "Im Sinne verteilter Systeme", d: "Kein Mechanismus zum Weiterleiten oder Auffinden wandernder Programme zwischen Rechnern." },
    { k: "Kein Bot-Blocker", t: "Kein CAPTCHA, keine Firewall, keine Drosselung deiner Besucher", d: "Es misst und blockiert nie. Die einzige Anfrage an deine Site ist ein Abruf der Startseite, um das Snippet zu prüfen." },
  ],
  notNamesTitle: "Ähnliche Namen, andere Produkte",
  notNames: [
    { name: "Agent Track (agenttrack.io)", what: "ein CRM und Marketing-Werkzeug für Immobilienmakler" },
    { name: "AgencyTrack (agencytrack.app)", what: "eine Verwaltungssoftware für Versicherungsagenturen" },
    { name: "AgenTrak", what: "Mitarbeiterüberwachung und Workforce-Analytics" },
    { name: "Agent-Tracking-Automation (API Nation und ähnliche)", what: "Vertriebs-KPIs von Agenten in Tabellen synchronisieren" },
    { name: "AgentOps, LangSmith, Langfuse", what: "Observability für Agenten, die ein Entwickler selbst baut" },
  ],
  seesTitle: "Was es sieht",
  seesDek: "Fünf Schichten, vom ersten Klick bis zur erledigten Aufgabe. Jede kommt aus einer Quelle, die du prüfen kannst.",
  sees: [
    { k: "KI-Referrals", t: "Wer Besucher schickt", d: "Ein Besuch von chatgpt.com, perplexity.ai, claude.ai, copilot.microsoft.com, gemini.google.com und einem Dutzend mehr wird dem Assistenten zugeordnet, aus Referrer und utm_source, abgeglichen mit einer veröffentlichten, versionierten Liste." },
    { k: "KI-Abrufe", t: "Wer deine Seiten liest", d: "GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended, Applebot-Extended, Bytespider und der Rest. Agenten mit JavaScript sieht das Snippet; die anderen kommen aus deinem Server-Log, jede Zeile gegen die veröffentlichten IP-Bereiche des Anbieters geprüft und zu Bursts gruppiert: ein Agent, viele Seiten, wenige Sekunden, so sieht ein Query-Fan-out von deiner Seite aus." },
    { k: "Tool-Aufrufe", t: "Was sie mit deinen Tools tun", d: "Jedes MCP- und WebMCP-Tool der Site: Aufrufe, Dauer, Erfolgsquote, Fehlerklassen, Namen der Eingabefelder und die Tools, die kein Agent je aufgerufen hat. Das Snippet umhüllt navigator.modelContext und beobachtet deklarative Formulare; an deinem Code ändert sich nichts." },
    { k: "Conversions", t: "Ob sie ans Ziel kommen", d: "Markiere eine Buchung, eine Bestellung oder eine Anmeldung mit data-agent-goal und sieh die Conversion-Rate der Agenten, getrennt von Menschen." },
    { k: "Manifest", t: "Wenn sich deine Tool-Liste ändert", d: "Das Manifest unter /.well-known/webmcp wird einmal pro Besuch gehasht. Das Dashboard zeigt die letzte Änderung; Pro-Konten bekommen eine Mail." },
  ],
  seesScore: "Neben den Zahlen steht der Agent Readiness Score der Site von webmcp-tool.com: wie gut Agenten die Site nutzen können, neben dem, wie sehr sie es tatsächlich tun.",
  fightTitle: "Den Kampf um AI-Bot-Traffic gewinnen",
  fightDek: "Agenten entscheiden schon heute, welche Sites zitiert, gelesen und benutzt werden. Die meisten Sites wissen nicht, was Agenten auf ihnen tun. Wer es weiß, kann besser werden; der Rest rät. Vier Schritte, immer wieder.",
  fight: [
    { k: "1. Messen", t: "Jeder Agent, jede Aktion", d: "Referrals, verifizierte Abrufe, Bursts, Tool-Aufrufe, Ziele. Nicht gesampelt, nicht geschätzt: die tatsächlichen Ereignisse, mit Namen des Agenten." },
    { k: "2. Verstehen", t: "Das Verhalten von MCP- und WebMCP-Agenten studieren", d: "Welche Seiten ein Crawler nimmt, in welcher Reihenfolge, wie schnell. Welches Tool ein Assistent zuerst probiert, wo es scheitert, welche Argument-Felder er schickt, ob er ans Ziel kommt oder aufgibt." },
    { k: "3. Beheben", t: "Site, Tools und Manifest ändern", d: "Das Tool umbenennen, das der Agent immer verfehlt. Die Fehlerklasse beheben, an der die Hälfte der Aufrufe scheitert. Die Seite öffnen, auf der jeder Fan-out landet. Das Manifest veröffentlichen, nach dem Agenten suchen." },
    { k: "4. Prüfen", t: "Readiness-Score und echte Nutzung nebeneinander", d: "Der Score von webmcp-tool.com sagt, ob Agenten die Site nutzen können. Die Zahlen sagen, ob sie es tun. Steigen beide, gewinnst du." },
  ],
  whoTitle: "Für wen es ist",
  whoDek: "Für jeden, dessen Site von KI-Agenten gelesen, zitiert oder bedient wird, und das ist heute jede Site, die rankt.",
  who: [
    { k: "Marketing und GEO", t: "Teams, die an KI-Sichtbarkeit arbeiten", d: "Wissen, welche Assistenten Besucher schicken und welche Seiten sie zitieren, Woche für Woche. Die Zahl, die deiner Generative Engine Optimization gefehlt hat." },
    { k: "Entwickler", t: "Teams, die MCP- und WebMCP-Tools veröffentlichen", d: "Produktions-Analytics für deine Tools: Aufrufe, Erfolgsquote, Dauer, Fehler, die Tools, die niemand nutzt. Gibt es sonst nirgends." },
    { k: "Agenturen", t: "Viele Kundensites, ein Konto", d: "Unbegrenzt Sites im Agency-Plan, eine öffentliche Stats-Seite je Kunde, White-Label-Badge, ein API-Token für dein eigenes Reporting." },
    { k: "Europäische Unternehmen", t: "Datenschutz zuerst", d: "Kein Consent-Banner, keine Drittlandübermittlung, AVV beim Anlegen der Site, Hosting in Deutschland oder eigener Server. Das Dashboard, das dein DSB abnimmt." },
  ],
  useTitle: "Frag deinen Agenten, nicht ein Dashboard",
  useDek: "Jede Zahl ist ein MCP-Tool. Richte den Agenten, den du ohnehin nutzt, darauf und frag in Worten. Claude, ChatGPT, Cursor, Codex, Hermes, OpenClaw: alles, was MCP spricht, oder ein Script mit curl.",
  use: [
    { k: "Claude", t: "Claude Desktop und Claude Code", d: "MCP-Server mit deinem Token eintragen und fragen: Welche Agenten haben unsere Site diese Woche gelesen, und welches Tool ist am häufigsten gescheitert?" },
    { k: "ChatGPT", t: "Connectors und eigene GPTs", d: "Derselbe Endpunkt als Connector, und dein GPT antwortet aus deinen eigenen Agentendaten." },
    { k: "Cursor, Codex, Hermes, OpenClaw", t: "Jeder MCP-Client, im Terminal oder Workflow", d: "Ein JSON-Block in der Client-Konfiguration. Der Agent, der deinen Code schreibt, kann lesen, wie Agenten das Ergebnis nutzen." },
    { k: "Scripts und BI", t: "JSON, CSV, Wochenbericht", d: "GET /api/stats für Dashboards und Notebooks, CSV-Export für Tabellen, montags eine Mail mit den Zahlen der Woche für alle, die Mail lesen." },
  ],
  useAsk: ["Welche Agenten haben unsere Site diese Woche gelesen, und welche Seiten haben sie genommen?", "Welches unserer WebMCP-Tools hat die schlechteste Erfolgsquote, und was ist der häufigste Fehler?", "Sah ein Abruf-Burst nach einem Perplexity-Fan-out auf der Preisseite aus?", "Wie viele Agenten-Conversions hatten wir in den letzten 30 Tagen, verglichen mit den 30 davor?"],
  whyTitle: "Warum es anders ist",
  whyDek: "Jedes Werkzeug am Markt misst Menschen oder Crawler. Die Schicht dazwischen, in der ein Agent die Site benutzt, hat niemand gemessen. Kategorien statt Anbieternamen, weil sich Produkte ändern; prüf jeden davon gegen die Zeilen.",
  compareHead: { feature: "", us: "Agent Tracking", analytics: "Web-Analytics", cdn: "CDN-Bot-Audit", logs: "Log-Analyzer", saas: "KI-Referral-SaaS" },
  compare: [
    { label: "KI-Referrals dem Assistenten zugeordnet", us: "ja", analytics: "teils", cdn: "nein", logs: "nein", saas: "ja" },
    { label: "Crawler-Abrufe gegen Anbieter-IP-Bereiche verifiziert", us: "ja", analytics: "nein", cdn: "ja", logs: "teils", saas: "nein" },
    { label: "Abruf-Bursts (Query-Fan-outs)", us: "ja", analytics: "nein", cdn: "nein", logs: "nein", saas: "nein" },
    { label: "MCP- und WebMCP-Tool-Aufrufe mit Erfolg, Fehlern, Dauer", us: "ja", analytics: "nein", cdn: "nein", logs: "nein", saas: "nein" },
    { label: "Agenten-Conversions (von Agenten erreichte Ziele)", us: "ja", analytics: "nein", cdn: "nein", logs: "nein", saas: "nein" },
    { label: "Alarm bei Manifest-Änderung", us: "ja", analytics: "nein", cdn: "nein", logs: "nein", saas: "nein" },
    { label: "Readiness-Score neben der Nutzung", us: "ja", analytics: "nein", cdn: "nein", logs: "nein", saas: "nein" },
    { label: "Ohne CDN oder Proxy vor der Site", us: "ja", analytics: "ja", cdn: "nein", logs: "ja", saas: "ja" },
    { label: "Keine Cookies, keine IP gespeichert, kein Consent-Banner", us: "ja", analytics: "manche", cdn: "n/a", logs: "nein", saas: "selten" },
    { label: "Daten bleiben in der EU", us: "ja, Server in Deutschland", analytics: "je nach", cdn: "nein", logs: "ja", saas: "nein" },
    { label: "Zahlen als JSON und als MCP-Tool", us: "ja", analytics: "nur API", cdn: "nein", logs: "nein", saas: "nur API" },
    { label: "Open Source, selbst hostbar, eine Datei als Backup", us: "ja", analytics: "manche", cdn: "nein", logs: "ja", saas: "nein" },
  ],
  compareNote: "Die mittleren fünf Zeilen findest du sonst nirgends.",
  euTitle: "Gebaut für europäische Unternehmen und Profis",
  euDek: "Einsetzbar in einem Unternehmen mit Datenschutzbeauftragtem, Betriebsrat und Anwalt, ohne Consent-Banner und ohne Drittlandübermittlung, über die man nachdenken müsste.",
  eu: [
    { k: "DSGVO durch Bauweise", t: "Nicht durch Banner", d: "Keine Cookies, nichts auf dem Gerät, keine Netzwerkadresse gespeichert, kein Fingerprint. Die Sitzungskennung ist ein Hash aus einem täglich neuen Wert, gestern und heute lassen sich nicht verknüpfen. Tool-Argumente werden als Feldnamen erfasst, nie als Werte. Rohdaten werden nach 90 Tagen gelöscht." },
    { k: "Hosting in Deutschland", t: "Mit AVV, den du beim Anlegen der Site schließt", d: "Der Auftragsverarbeitungsvertrag nennt die Unterauftragsverarbeiter, enthält die EU-Standardvertragsklauseln und beschreibt die Verarbeitung genau so, wie der Code sie macht. Dein Datenschutzbeauftragter kann den Quellcode lesen." },
    { k: "Zwei Sprachen", t: "Dashboard, Doku und Rechtstexte", d: "Durchgehend Englisch und Deutsch, Englisch bindend. Support in beiden." },
    { k: "Selbst hostbar", t: "Wenn Daten das Haus nicht verlassen dürfen", d: "Ein Node-Prozess, eine SQLite-Datei, AGPL-3.0, zehn Minuten mit Docker. Was die Cloud kann, kann dein Server." },
  ],
  valueTitle: "Der konkrete Mehrwert",
  valueDek: "Sechs Fragen, die das Dashboard beantwortet und sonst nichts auf deiner Site.",
  value: [
    { k: "Kanäle", t: "Wer dir Geschäft schickt", d: "„Perplexity hat diese Woche 40 Besucher geschickt, ChatGPT 12, und sie landen auf der Preisseite.“ Ein Kanal, den du jetzt optimieren kannst, und eine Zahl für jeden, der fragt, ob KI für deine Site eine Rolle spielt." },
    { k: "Leser", t: "Wer dich liest und was er mitnimmt", d: "GPTBot mit 400 Seiten pro Nacht ist Training. ChatGPT-User mit 3 Seiten in 4 Sekunden ist ein Mensch, der gerade nach dir fragt. Die Agenten-Ansicht unterscheidet beide; die Bursts zeigen, welche Frage." },
    { k: "Tools", t: "Ob deine Tools für Agenten funktionieren", d: "Du hast MCP- oder WebMCP-Tools veröffentlicht. Werden sie aufgerufen? Schlagen sie fehl? Mit welchem Fehler? Wie lange dauern sie? Welche hat noch kein Agent angefasst? Diese Ansicht gibt es sonst nirgends." },
    { k: "Ziele", t: "Ob Agenten ans Ziel kommen", d: "Ein Tool-Aufruf ist kein Verkauf. Markiere das Ziel und sieh die Conversion-Rate der Agenten, getrennt von Menschen." },
    { k: "Monitoring", t: "Was Maschinen mit deiner Site machen", d: "Verifizierte Abrufe, Nachahmer, die sich als bekannter Bot ausgeben, Bursts, Manifest-Änderungen: das Betriebsbild des nicht-menschlichen Verhaltens, jeden Tag, an einem Ort." },
    { k: "Deine Agenten", t: "Die Zahlen in deinen eigenen Werkzeugen", d: "Ein Bearer-Token und ein MCP-Tool, und Claude, ChatGPT oder Cursor beantworten „welche Agenten haben unsere Site diese Woche gelesen?“ aus deinen Daten." },
  ],
  faqTitle: "Fragen, die gestellt werden",
  faqDek: "Kurze Antworten. Die langen stehen in der Dokumentation.",
  faq: [
    { q: "Was ist Agent Tracking?", a: "Agent Tracking ist ein Open-Source-Analytics-Dienst, der misst, was KI-Agenten auf einer Website tun: KI-Referrals, gegen veröffentlichte IP-Bereiche verifizierte Crawler-Abrufe, MCP- und WebMCP-Tool-Aufrufe mit Ergebnis und von Agenten erreichte Conversions. Installiert wird ein Script-Tag; es gibt keine Cookies und keine personenbezogenen Daten. Die Kategorie heißt KI-Agenten-Analytics für Websites." },
    { q: "Ist das dasselbe wie AgentOps, LangSmith oder LLM-Observability?", a: "Nein. Observability-Werkzeuge tracen die Agenten, die du selbst baust, von innen aus deinem Code. Agent Tracking misst Agenten, die andere betreiben, wenn sie deine Website besuchen, von außen über ein Script-Tag auf deinen Seiten. Es sieht keine Prompts, Spans oder Token-Kosten und braucht kein SDK. Beides ergänzt sich." },
    { q: "Verfolgt es Callcenter-Agenten, Außendienst oder Pakete?", a: "Nein. Agent heißt hier Software, die für einen Menschen handelt: ChatGPT, Claude, Perplexity, ein Crawler, ein WebMCP-fähiger Browser. Nichts im Produkt erfasst Personen, Standorte, Schichten oder Sendungen." },
    { q: "Ist agenttracking.co dasselbe wie Agent Track, AgencyTrack oder AgenTrak?", a: "Nein. Agent Track (agenttrack.io) ist ein CRM für Immobilienmakler, AgencyTrack (agencytrack.app) verwaltet Versicherungsagenturen, und AgenTrak überwacht Mitarbeiter. agenttracking.co ist Agent Tracking, ein Open-Source-Analytics-Dienst, der misst, was KI-Agenten wie ChatGPT, Claude, Perplexity und ihre Crawler auf einer Website tun. Die Namen ähneln sich; die Produkte haben nichts gemeinsam." },
    { q: "Was unterscheidet es von Google Analytics oder Plausible?", a: "Web-Analytics zählt Menschen und ihre Seiten. Agent Tracking zählt Agenten und ihre Aktionen: welcher Assistent den Besucher geschickt hat, welcher Crawler welche Seiten gelesen hat, welches Tool ein Agent aufgerufen hat und ob es geklappt hat. Es läuft neben deinem Analytics, nicht statt dessen." },
    { q: "Was unterscheidet es von Cloudflare AI Audit oder einem Bot-Manager?", a: "Ein Bot-Manager sieht Crawler am Netzrand und muss vor deiner Site sitzen. Agent Tracking sieht Referrals, Abrufe und Tool-Aufrufe in der Seite, braucht kein CDN, verifiziert Crawler aus deinem eigenen Log gegen Anbieter-IP-Bereiche und misst, ob Agenten ein Ziel erreichen." },
    { q: "Brauche ich dafür ein Cookie-Banner?", a: "Nein. Das Snippet setzt kein Cookie, schreibt nichts auf das Gerät, speichert keine Netzwerkadresse und bildet keinen Fingerprint. Die Sitzungskennung ist ein Hash aus einem täglichen Zufallswert. Eine Einwilligung nach ePrivacy gilt dem Speichern auf dem Gerät, und das gibt es nicht." },
    { q: "Wo liegen die Daten?", a: "Auf einem Server in Deutschland. Ein Auftragsverarbeitungsvertrag mit den EU-Standardvertragsklauseln wird geschlossen, wenn du eine Site hinzufügst. Oder du betreibst die Software selbst: Sie ist Open Source unter AGPL-3.0." },
    { q: "Wie lange dauert die Installation?", a: "Etwa eine Minute: per E-Mail anmelden, Domain hinzufügen, ein Script-Tag auf jede Seite, Prüfen drücken. Über navigator.modelContext registrierte Tools werden automatisch erkannt. Server-Logs für Crawler ohne JavaScript lassen sich hochladen oder täglich per Cron schicken." },
    { q: "Was kostet es?", a: "In der Pilotphase kostenlos: eine Site, 10.000 Agenten-Ereignisse im Monat, 30 Tage Verlauf, keine Karte. Reine Seitenaufrufe zählen nie. Bezahlte Pläne mit mehr Sites und einem Jahr Verlauf folgen mit 30 Tagen Vorlauf. Selbst hosten ist kostenlos." },
    { q: "Können meine eigenen Agenten die Zahlen lesen?", a: "Ja. Jede Zahl gibt es als JSON über ein Bearer-Token und als MCP-Tool namens get_agent_stats, sodass Claude, ChatGPT, Cursor oder ein Script fragen können, welche Agenten deine Site diese Woche gelesen haben." },
  ],
};

export function homeContent(lang: DashLang): HomeContent {
  return lang === "de" ? DE : EN;
}

/** The FAQ as schema.org, for the page head. */
export function faqSchema(c: HomeContent) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}
