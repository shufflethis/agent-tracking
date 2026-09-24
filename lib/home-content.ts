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
    "Agent Tracking records recognized assistant referrals, browser-visible tool activity and, when connected, server-log fetches and server-confirmed inquiry receipts. Each source has its own evidence limit.",
  definitionMore:
    "The snippet observes selected browser actions without setting cookies. Origin logs and server integrations add separate evidence for crawler requests, remote tools and completed inquiries. A browser action alone cannot prove who acted or whether a business outcome succeeded.",
  notTitle: "What it is not",
  notDek: "The name is used for five other things. None of them is this. If a search engine or an assistant sent you here for one of those, this is the wrong page, and here is where the right one lives.",
  not: [
    { k: "Not agent observability", t: "AgentOps, LangSmith, Langfuse, OpenTelemetry for LLM apps", d: "Those trace the agents you build, from inside your own code: spans, prompts, token cost. Agent Tracking measures agents other people run when they visit your website, from the outside, with a script tag. The two are complementary; a team can use both." },
    { k: "Not workforce tracking", t: "Call-centre or support agents", d: "No schedule adherence, handle time, idle time or ticket counts of human employees. The word agent here means a piece of software acting for a person." },
    { k: "Not field tracking", t: "Sales reps, couriers, GPS check-ins", d: "No location, no route, no visit duration of any person. Nothing here knows where anyone is." },
    { k: "Not parcel tracking", t: "Air waybills, shipments, delivery agents", d: "Not a package lookup and not connected to any carrier." },
    { k: "Not mobile agents", t: "The distributed-computing sense", d: "Not a mechanism for forwarding or locating migrating code across hosts." },
    { k: "Not a bot blocker", t: "No CAPTCHA or firewall for your visitors", d: "The product measures activity and does not block visitors. Verification and optional readiness checks fetch pages from your site." },
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
  seesDek: "Separate browser observations, log evidence and server receipts, each with a stated limit.",
  sees: [
    { k: "AI referrals", t: "Who sends visitors", d: "A visit from chatgpt.com, perplexity.ai, claude.ai, copilot.microsoft.com, gemini.google.com and a dozen more is attributed to the assistant, from the referrer and utm_source, matched against a published, versioned list." },
    { k: "AI fetches", t: "Which crawler requests your pages", d: "Origin logs record HTTP attempts. A successful HTML fetch is counted separately from redirects and errors; published IP ranges verify supported crawler claims when fresh. Missing lists and legacy claims stay unverified. A burst shows nearby requests to distinct paths, not a query or intent." },
    { k: "Tool calls", t: "Observed tool activity", d: "The snippet observes supported WebMCP calls in the browser and records technical outcomes and safe error classes. A separate server adapter can report remote MCP calls. These sources can overlap and do not prove an agent identity by themselves." },
    { k: "Outcomes", t: "Attempts and confirmed results", d: "A data-agent-goal marker records a browser attempt. Your server can separately confirm a successfully created inquiry or booking with a stable receipt. Without a server receipt, the business result remains unknown." },
    { k: "Manifest", t: "When your tool list changes", d: "The manifest at /.well-known/webmcp is hashed once per visit. The dashboard shows when it last changed; Pro accounts are alerted by email." },
  ],
  seesScore: "A separate readiness check can show technical site findings beside observed activity when a scan has succeeded.",
  fightTitle: "Win the fight for AI bot traffic",
  fightDek: "Assistants can send visitors, fetch pages and use supported tools. Measure those signals separately, improve a task path and check it again.",
  fight: [
    { k: "1. Measure", t: "Observed, attributable signals", d: "Recognized referrals, access attempts, verified HTML fetches, browser-visible tool calls and optional server receipts. Unknown actors and missing sources remain explicit." },
    { k: "2. Understand", t: "Inspect task and tool evidence", d: "Compare fetch paths, technical tool outcomes and browser goal attempts without inferring prompts, intent or a completed sale from those signals." },
    { k: "3. Fix", t: "Change the site, the tools, the manifest", d: "Use a reproduced task failure to improve a tool description, error path or page. Record the change and run the same test again." },
    { k: "4. Verify", t: "Retest the same task", d: "Use a deterministic staging browser check and compare real run IDs and versions. Results describe that test path; business impact needs separate evidence." },
  ],
  whoTitle: "Who it is for",
  whoDek: "Teams that need evidence about recognized assistant referrals, crawler requests and tool activity on their own sites.",
  who: [
    { k: "Marketing and GEO", t: "Teams working on AI visibility", d: "See which assistants send identifiable visitors and where those people land, week over week. Compare that with crawler requests without treating either as a citation count." },
    { k: "Developers", t: "Teams publishing MCP and WebMCP tools", d: "Inspect supported browser calls and separately integrated server calls, technical outcomes, duration and sanitized errors." },
    { k: "Agencies", t: "Many client sites, one account", d: "Unlimited sites on the Agency plan, a public stats page per client, a white-label badge, one API token for your own reporting." },
    { k: "European companies", t: "Documented data selection", d: "The snippet sets no cookies; raw addresses are not stored. Review the privacy notice, data processing agreement and your own deployment before making a consent decision." },
  ],
  useTitle: "Ask your agent, not a dashboard",
  useDek: "A read-only MCP tool and JSON API expose authorized site summaries to compatible clients; CSV and private reports are available separately.",
  use: [
    { k: "Claude", t: "Claude Desktop and Claude Code", d: "Add the MCP server with your token and ask: which agents read our site this week, and which tool failed most?" },
    { k: "ChatGPT", t: "Compatible tool clients", d: "Clients that support authenticated MCP or the JSON API can read your authorized site summaries." },
    { k: "Cursor, Codex, Hermes, OpenClaw", t: "Any MCP client, in the terminal or a workflow", d: "One JSON block in the client config. The agent that writes your code can read how agents use the result." },
    { k: "Scripts and BI", t: "JSON, CSV, weekly digest", d: "GET /api/stats for dashboards and notebooks, CSV export for spreadsheets, a Monday mail with the week's numbers for people who read mail." },
  ],
  useAsk: ["Which verified crawler requests did we observe this week?", "Which observed WebMCP tool calls failed most often?", "Which distinct paths appeared in a fetch burst?", "How many server-confirmed inquiries and browser goal attempts were recorded separately?"],
  whyTitle: "Why it is different",
  whyDek: "This product combines several evidence sources. Other products vary by configuration and plan; check their current documentation for a direct comparison.",
  compareHead: { feature: "", us: "Agent Tracking", analytics: "Web analytics", cdn: "CDN bot audit", logs: "Log analyzer", saas: "AI referral SaaS" },
  compare: [
    { label: "AI referrals attributed to the assistant", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Crawler fetches verified against vendor IP ranges", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Fetch bursts (distinct paths in one import batch)", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "MCP and WebMCP tool calls with success, errors, duration", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Separate browser attempts and server-confirmed outcomes", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Manifest change alerts", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Readiness score beside the usage", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Works without a CDN or proxy in front of the site", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Snippet without cookies; raw IP not stored", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Data stays in the EU", us: "yes, server in Germany", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Numbers as JSON and as an MCP tool", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
    { label: "Open source, self-hostable, one file to back up", us: "yes", analytics: "varies", cdn: "varies", logs: "varies", saas: "varies" },
  ],
  compareNote: "Capabilities and evidence depend on each integration; competitor columns are illustrative and should be checked against current documentation.",
  euTitle: "Built for European companies and professionals",
  euDek: "The selected data and storage behavior are documented so organizations can review their own legal and deployment requirements.",
  eu: [
    { k: "Data selection", t: "Documented in the source", d: "The snippet sets no cookies; raw network addresses and tool argument values are not stored. Daily salted session hashes are estimates and can still need a privacy assessment. Raw event rows expire after 90 days." },
    { k: "Hosted in Germany", t: "With a DPA you conclude by adding a site", d: "The data processing agreement names the sub-processors, includes the EU standard contractual clauses and describes the processing exactly as the code does it. Your data protection officer can read the source." },
    { k: "Two languages", t: "Dashboard, docs and legal pages", d: "English and German throughout, English binding. Support in both." },
    { k: "Self-hostable", t: "When data must not leave your house", d: "One Node process, one SQLite file, AGPL-3.0, ten minutes with Docker. What the cloud does, your server does." },
  ],
  valueTitle: "The concrete value",
  valueDek: "Six questions the dashboard answers that nothing else on your site can.",
  value: [
    { k: "Channels", t: "Who sends you business", d: "\"Perplexity referred 40 visitors this week, ChatGPT 12, and they land on the pricing page.\" A channel you can now optimise, and a number for whoever asks whether AI matters for your site." },
    { k: "Readers", t: "Which requests reached your pages", d: "Verified crawler fetches and short bursts show requests to distinct paths. They do not reveal training use, the user's question or intent." },
    { k: "Tools", t: "Which tool calls were observed", d: "For supported browser and integrated server calls, inspect technical outcomes, duration and sanitized errors. Unobserved calls remain outside the measurement." },
    { k: "Goals", t: "Attempts and server receipts", d: "Browser goal markers show attempts. A separate site-server integration confirms an inquiry or booking. Unknown outcomes stay visible." },
    { k: "Monitoring", t: "What machines do to your site", d: "Verified fetches, unverified bot claims, bursts and manifest changes: separate operational signals with visible evidence levels." },
    { k: "Your agents", t: "The numbers in your own tools", d: "A bearer token and one MCP tool, and Claude, ChatGPT or Cursor answer \"which agents read our site this week?\" from your data." },
  ],
  faqTitle: "Questions people ask",
  faqDek: "Short answers. The documentation has the long ones.",
  faq: [
    { q: "What is Agent Tracking?", a: "Agent Tracking combines recognized assistant referrals, supported WebMCP browser observations, optional verified crawler log fetches and authenticated server outcome receipts. The snippet sets no cookies; actor identity and business success are shown only with the evidence available for each source." },
    { q: "Is this the same as AgentOps, LangSmith or LLM observability?", a: "No. Observability tools trace the agents you build, from inside your code. Agent Tracking measures agents that other people run when they visit your website, from the outside, through a script tag on your pages. It does not see prompts, spans or token costs, and it needs no SDK. The two complement each other." },
    { q: "Does it track call-centre agents, field staff or parcels?", a: "No. Agent here means software acting for a person: ChatGPT, Claude, Perplexity, a crawler, a WebMCP-capable browser. Nothing in the product records people, locations, shifts or shipments." },
    { q: "Is agenttracking.co the same as Agent Track, AgencyTrack or AgenTrak?", a: "No. Agent Track (agenttrack.io) is a CRM for real-estate agents, AgencyTrack (agencytrack.app) manages insurance agencies, and AgenTrak monitors employees. agenttracking.co is Agent Tracking, an open-source analytics service that measures what AI agents such as ChatGPT, Claude, Perplexity and their crawlers do on a website. The names are similar; the products have nothing in common." },
    { q: "How is it different from Google Analytics or Plausible?", a: "Web analytics counts people and their pages. Agent Tracking counts agents and their actions: which assistant sent the visitor, which crawler read which pages, which tool an agent called and whether it succeeded. It runs beside your analytics, not instead of it." },
    { q: "How is it different from Cloudflare AI Crawl Control?", a: "Cloudflare measures and controls crawler requests at the edge and offers referral analytics on supported plans. Agent Tracking works without a CDN, combines assistant referrals with optional origin logs, and measures browser tool calls and goals." },
    { q: "Do I need a cookie banner for it?", a: "The snippet sets no cookies or local storage entries. Your privacy and consent assessment depends on your deployment, other scripts and applicable law; review the documented data flow." },
    { q: "Where is the data stored?", a: "On a server in Germany. A data processing agreement with the EU standard contractual clauses is concluded when you add a site. Or run the software yourself: it is open source under AGPL-3.0." },
    { q: "How long does installation take?", a: "Add the domain, install the snippet and verify it. Supported browser model-context tools can be observed when the snippet loads in time. Crawler logs and server-confirmed outcomes need separate setup." },
    { q: "What does it cost?", a: "Free during the pilot: one site, 10,000 agent events a month, 30 days of history, no card. Plain page views are never counted. Paid plans with more sites and a year of history follow with 30 days' notice. Self-hosting is free." },
    { q: "Can my own agents read the numbers?", a: "Yes. Authorized readers can query evidence-labeled site statistics through JSON and the get_agent_stats MCP tool. Ask about observed, verified and unknown signals separately." },
  ],
};

const DE: HomeContent = {
  category: "KI-Agenten-Analytics für Websites",
  definitionTitle: "Was Agent Tracking macht",
  definition:
    "Agent Tracking erfasst erkannte Assistenten-Referrals, im Browser beobachtbare Tool-Aktivität und – bei angebundener Quelle – Server-Log-Abrufe sowie serverbestätigte Anfragen. Jede Quelle hat eigene Nachweisgrenzen.",
  definitionMore:
    "Das Snippet beobachtet ausgewählte Browseraktionen, ohne Cookies zu setzen. Origin-Logs und Serverintegrationen liefern getrennte Belege für Crawler-Anfragen, Remote-Tools und abgeschlossene Anfragen. Eine Browseraktion allein beweist weder den Akteur noch einen fachlichen Abschluss.",
  notTitle: "Was es nicht ist",
  notDek: "Der Name steht auch für fünf andere Dinge. Keines davon ist das hier. Wenn dich eine Suchmaschine oder ein Assistent wegen einem davon hierher geschickt hat, ist das die falsche Seite, und hier steht, wo die richtige liegt.",
  not: [
    { k: "Keine Agent-Observability", t: "AgentOps, LangSmith, Langfuse, OpenTelemetry für LLM-Apps", d: "Die tracen die Agenten, die du selbst baust, von innen aus deinem Code: Spans, Prompts, Token-Kosten. Agent Tracking misst Agenten, die andere betreiben, wenn sie deine Website besuchen, von außen, per Script-Tag. Beides ergänzt sich; ein Team kann beides nutzen." },
    { k: "Kein Workforce-Tracking", t: "Callcenter- oder Support-Agenten", d: "Keine Schichttreue, Bearbeitungszeit, Leerlaufzeit oder Ticketzahlen von Mitarbeitern. Agent heißt hier eine Software, die für einen Menschen handelt." },
    { k: "Kein Außendienst-Tracking", t: "Vertriebler, Kuriere, GPS-Check-ins", d: "Kein Standort, keine Route, keine Besuchsdauer irgendeiner Person. Nichts hier weiß, wo jemand ist." },
    { k: "Keine Paketverfolgung", t: "Luftfrachtbriefe, Sendungen, Zustellagenten", d: "Keine Sendungssuche und mit keinem Versanddienst verbunden." },
    { k: "Keine mobilen Agenten", t: "Im Sinne verteilter Systeme", d: "Kein Mechanismus zum Weiterleiten oder Auffinden wandernder Programme zwischen Rechnern." },
    { k: "Kein Bot-Blocker", t: "Kein CAPTCHA und keine Firewall für Besucher", d: "Das Produkt misst Aktivität und blockiert Besucher nicht. Verifikation und optionale Readiness-Checks rufen Seiten deiner Site ab." },
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
  seesDek: "Getrennte Browserbeobachtungen, Log-Nachweise und Serverbelege mit klaren Grenzen.",
  sees: [
    { k: "KI-Referrals", t: "Wer Besucher schickt", d: "Ein Besuch von chatgpt.com, perplexity.ai, claude.ai, copilot.microsoft.com, gemini.google.com und einem Dutzend mehr wird dem Assistenten zugeordnet, aus Referrer und utm_source, abgeglichen mit einer veröffentlichten, versionierten Liste." },
    { k: "KI-Abrufe", t: "Welche Crawler Seiten anfragen", d: "Origin-Logs erfassen HTTP-Zugriffsversuche. Erfolgreiche HTML-Abrufe bleiben von Weiterleitungen und Fehlern getrennt. Frische veröffentlichte IP-Bereiche bestätigen unterstützte Crawler-Claims; fehlende Listen und alte Claims bleiben unbestätigt. Bursts zeigen nahe Abrufe verschiedener Pfade, keine Suchfrage oder Absicht." },
    { k: "Tool-Aufrufe", t: "Beobachtete Tool-Aktivität", d: "Das Snippet erfasst unterstützte WebMCP-Aufrufe im Browser mit technischem Ausgang und bereinigter Fehlerklasse. Ein getrennter Serveradapter meldet Remote-MCP-Aufrufe. Beide Quellen können sich überlappen und beweisen für sich allein keine Agentenidentität." },
    { k: "Abschlüsse", t: "Versuche und bestätigte Ergebnisse", d: "data-agent-goal markiert einen Browser-Versuch. Dein Server kann eine erfolgreich angelegte Anfrage oder Buchung separat mit stabilem Beleg bestätigen. Ohne Serverbeleg bleibt der fachliche Ausgang unbekannt." },
    { k: "Manifest", t: "Wenn sich deine Tool-Liste ändert", d: "Das Manifest unter /.well-known/webmcp wird einmal pro Besuch gehasht. Das Dashboard zeigt die letzte Änderung; Pro-Konten bekommen eine Mail." },
  ],
  seesScore: "Ein separater Readiness-Check kann technische Befunde neben beobachteter Aktivität zeigen, sobald ein Scan erfolgreich war.",
  fightTitle: "Den Kampf um AI-Bot-Traffic gewinnen",
  fightDek: "Assistenten können Besucher schicken, Seiten abrufen und unterstützte Tools nutzen. Miss diese Signale getrennt, verbessere einen Aufgabenweg und teste ihn erneut.",
  fight: [
    { k: "1. Messen", t: "Beobachtete Signale", d: "Erkannte Referrals, Zugriffsversuche, verifizierte HTML-Abrufe, sichtbare Browser-Tools und optionale Serverbelege. Unbekannte Akteure und fehlende Quellen bleiben sichtbar." },
    { k: "2. Verstehen", t: "Aufgaben- und Tool-Belege prüfen", d: "Abrufpfade, technische Tool-Ausgänge und Browser-Zielversuche vergleichen, ohne daraus Prompts, Absicht oder Verkäufe abzuleiten." },
    { k: "3. Beheben", t: "Site, Tools und Manifest ändern", d: "Nutze einen reproduzierten Aufgabenfehler, um Tool-Beschreibung, Fehlerpfad oder Seite zu verbessern. Dokumentiere die Änderung und teste denselben Fall erneut." },
    { k: "4. Prüfen", t: "Dieselbe Aufgabe erneut testen", d: "Eine deterministische Browserprüfung auf Staging ausführen und echte Run-IDs und Versionen vergleichen. Das Ergebnis beschreibt diese Teststrecke; Geschäftswirkung braucht weitere Belege." },
  ],
  whoTitle: "Für wen es ist",
  whoDek: "Für Teams, die Belege zu erkannten Assistenten-Referrals, Crawler-Anfragen und Tool-Aktivität auf eigenen Sites brauchen.",
  who: [
    { k: "Marketing und GEO", t: "Teams, die an KI-Sichtbarkeit arbeiten", d: "Sehen, welche Assistenten erkennbare Besucher schicken und wo diese landen. Crawler-Abrufe lassen sich daneben auswerten, ohne beides als Zitat-Zahl auszugeben." },
    { k: "Entwickler", t: "Teams, die MCP- und WebMCP-Tools veröffentlichen", d: "Unterstützte Browser-Calls und getrennt integrierte Server-Calls mit technischem Ausgang, Dauer und bereinigten Fehlern prüfen." },
    { k: "Agenturen", t: "Viele Kundensites, ein Konto", d: "Unbegrenzt Sites im Agency-Plan, eine öffentliche Stats-Seite je Kunde, White-Label-Badge, ein API-Token für dein eigenes Reporting." },
    { k: "Europäische Unternehmen", t: "Dokumentierte Datenauswahl", d: "Das Snippet setzt keine Cookies; rohe Adressen werden nicht gespeichert. Datenschutzhinweise, AVV und eigene Installation vor einer Einwilligungsentscheidung prüfen." },
  ],
  useTitle: "Frag deinen Agenten, nicht ein Dashboard",
  useDek: "Ein lesendes MCP-Tool und die JSON-API geben berechtigte Site-Summen an kompatible Clients aus; CSV und interne Berichte sind getrennt verfügbar.",
  use: [
    { k: "Claude", t: "Claude Desktop und Claude Code", d: "MCP-Server mit deinem Token eintragen und fragen: Welche Agenten haben unsere Site diese Woche gelesen, und welches Tool ist am häufigsten gescheitert?" },
    { k: "ChatGPT", t: "Kompatible Tool-Clients", d: "Clients mit authentifiziertem MCP oder JSON-API-Zugriff können berechtigte Site-Summen lesen." },
    { k: "Cursor, Codex, Hermes, OpenClaw", t: "Jeder MCP-Client, im Terminal oder Workflow", d: "Ein JSON-Block in der Client-Konfiguration. Der Agent, der deinen Code schreibt, kann lesen, wie Agenten das Ergebnis nutzen." },
    { k: "Scripts und BI", t: "JSON, CSV, Wochenbericht", d: "GET /api/stats für Dashboards und Notebooks, CSV-Export für Tabellen, montags eine Mail mit den Zahlen der Woche für alle, die Mail lesen." },
  ],
  useAsk: ["Welche verifizierten Crawler-Abrufe haben wir diese Woche beobachtet?", "Welche beobachteten WebMCP-Aufrufe scheiterten am häufigsten?", "Welche unterschiedlichen Pfade erschienen in einem Abruf-Burst?", "Wie viele serverbestätigte Anfragen und Browser-Zielversuche wurden getrennt erfasst?"],
  whyTitle: "Warum es anders ist",
  whyDek: "Das Produkt kombiniert mehrere Nachweisquellen. Andere Angebote unterscheiden sich nach Konfiguration und Tarif; für einen direkten Vergleich ihre aktuelle Dokumentation prüfen.",
  compareHead: { feature: "", us: "Agent Tracking", analytics: "Web-Analytics", cdn: "CDN-Bot-Audit", logs: "Log-Analyzer", saas: "KI-Referral-SaaS" },
  compare: [
    { label: "KI-Referrals dem Assistenten zugeordnet", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Crawler-Abrufe gegen Anbieter-IP-Bereiche verifiziert", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Abruf-Bursts (verschiedene Pfade in einem Import-Batch)", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "MCP- und WebMCP-Tool-Aufrufe mit Erfolg, Fehlern, Dauer", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Browser-Versuche und serverbestätigte Abschlüsse getrennt", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Alarm bei Manifest-Änderung", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Readiness-Score neben der Nutzung", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Ohne CDN oder Proxy vor der Site", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Snippet ohne Cookies; keine rohe IP gespeichert", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Daten bleiben in der EU", us: "ja, Server in Deutschland", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Zahlen als JSON und als MCP-Tool", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
    { label: "Open Source, selbst hostbar, eine Datei als Backup", us: "ja", analytics: "je nach", cdn: "je nach", logs: "je nach", saas: "je nach" },
  ],
  compareNote: "Funktionen und Nachweisstärke hängen von der Integration ab; andere Produkte anhand aktueller Dokumentation prüfen.",
  euTitle: "Gebaut für europäische Unternehmen und Profis",
  euDek: "Datenauswahl und Speicherung sind dokumentiert, damit Unternehmen eigene rechtliche und technische Anforderungen prüfen können.",
  eu: [
    { k: "Datenauswahl", t: "Im Quellcode dokumentiert", d: "Das Snippet setzt keine Cookies; rohe Netzwerkadressen und Tool-Argumentwerte werden nicht gespeichert. Täglich gesalzene Session-Hashes sind Näherungen und können eine Datenschutzprüfung erfordern. Rohereignisse verfallen nach 90 Tagen." },
    { k: "Hosting in Deutschland", t: "Mit AVV, den du beim Anlegen der Site schließt", d: "Der Auftragsverarbeitungsvertrag nennt die Unterauftragsverarbeiter, enthält die EU-Standardvertragsklauseln und beschreibt die Verarbeitung genau so, wie der Code sie macht. Dein Datenschutzbeauftragter kann den Quellcode lesen." },
    { k: "Zwei Sprachen", t: "Dashboard, Doku und Rechtstexte", d: "Durchgehend Englisch und Deutsch, Englisch bindend. Support in beiden." },
    { k: "Selbst hostbar", t: "Wenn Daten das Haus nicht verlassen dürfen", d: "Ein Node-Prozess, eine SQLite-Datei, AGPL-3.0, zehn Minuten mit Docker. Was die Cloud kann, kann dein Server." },
  ],
  valueTitle: "Der konkrete Mehrwert",
  valueDek: "Sechs Fragen, die das Dashboard beantwortet und sonst nichts auf deiner Site.",
  value: [
    { k: "Kanäle", t: "Wer dir Geschäft schickt", d: "„Perplexity hat diese Woche 40 Besucher geschickt, ChatGPT 12, und sie landen auf der Preisseite.“ Ein Kanal, den du jetzt optimieren kannst, und eine Zahl für jeden, der fragt, ob KI für deine Site eine Rolle spielt." },
    { k: "Leser", t: "Welche Anfragen deine Seiten erreichen", d: "Verifizierte Crawler-Abrufe und kurze Bursts zeigen Anfragen an unterschiedliche Pfade. Sie verraten weder Training noch Suchfrage oder Absicht." },
    { k: "Tools", t: "Welche Tool-Aufrufe beobachtet wurden", d: "Bei unterstützten Browser- und integrierten Server-Calls siehst du technische Ausgänge, Dauer und bereinigte Fehler. Nicht beobachtete Aufrufe bleiben außerhalb der Messung." },
    { k: "Ziele", t: "Versuche und Serverbelege", d: "Browser-Zielmarker zeigen Versuche. Eine getrennte Site-Serverintegration bestätigt Anfragen oder Buchungen. Unbekannte Ausgänge bleiben sichtbar." },
    { k: "Monitoring", t: "Was Maschinen mit deiner Site machen", d: "Verifizierte Abrufe, unverifizierte Bot-Namen, Bursts und Manifest-Änderungen: getrennte Betriebssignale mit sichtbaren Belegstufen." },
    { k: "Deine Agenten", t: "Die Zahlen in deinen eigenen Werkzeugen", d: "Ein Bearer-Token und ein MCP-Tool, und Claude, ChatGPT oder Cursor beantworten „welche Agenten haben unsere Site diese Woche gelesen?“ aus deinen Daten." },
  ],
  faqTitle: "Fragen, die gestellt werden",
  faqDek: "Kurze Antworten. Die langen stehen in der Dokumentation.",
  faq: [
    { q: "Was ist Agent Tracking?", a: "Agent Tracking kombiniert erkannte Assistenten-Referrals, unterstützte WebMCP-Browserbeobachtungen, optionale verifizierte Crawler-Log-Abrufe und authentifizierte Serverbelege. Das Snippet setzt keine Cookies; Akteur und fachlicher Erfolg werden nur mit den jeweils verfügbaren Belegen ausgewiesen." },
    { q: "Ist das dasselbe wie AgentOps, LangSmith oder LLM-Observability?", a: "Nein. Observability-Werkzeuge tracen die Agenten, die du selbst baust, von innen aus deinem Code. Agent Tracking misst Agenten, die andere betreiben, wenn sie deine Website besuchen, von außen über ein Script-Tag auf deinen Seiten. Es sieht keine Prompts, Spans oder Token-Kosten und braucht kein SDK. Beides ergänzt sich." },
    { q: "Verfolgt es Callcenter-Agenten, Außendienst oder Pakete?", a: "Nein. Agent heißt hier Software, die für einen Menschen handelt: ChatGPT, Claude, Perplexity, ein Crawler, ein WebMCP-fähiger Browser. Nichts im Produkt erfasst Personen, Standorte, Schichten oder Sendungen." },
    { q: "Ist agenttracking.co dasselbe wie Agent Track, AgencyTrack oder AgenTrak?", a: "Nein. Agent Track (agenttrack.io) ist ein CRM für Immobilienmakler, AgencyTrack (agencytrack.app) verwaltet Versicherungsagenturen, und AgenTrak überwacht Mitarbeiter. agenttracking.co ist Agent Tracking, ein Open-Source-Analytics-Dienst, der misst, was KI-Agenten wie ChatGPT, Claude, Perplexity und ihre Crawler auf einer Website tun. Die Namen ähneln sich; die Produkte haben nichts gemeinsam." },
    { q: "Was unterscheidet es von Google Analytics oder Plausible?", a: "Web-Analytics zählt Menschen und ihre Seiten. Agent Tracking zählt Agenten und ihre Aktionen: welcher Assistent den Besucher geschickt hat, welcher Crawler welche Seiten gelesen hat, welches Tool ein Agent aufgerufen hat und ob es geklappt hat. Es läuft neben deinem Analytics, nicht statt dessen." },
    { q: "Was unterscheidet es von Cloudflare AI Crawl Control?", a: "Cloudflare misst und steuert Crawler-Anfragen am Netzrand und bietet auf unterstützten Plänen Referral-Analysen. Agent Tracking funktioniert ohne CDN, kombiniert Assistenten-Referrals mit optionalen Origin-Logs und misst Browser-Tools und Ziele." },
    { q: "Brauche ich dafür ein Cookie-Banner?", a: "Das Snippet setzt keine Cookies oder Local-Storage-Einträge. Die Bewertung von Datenschutz und Einwilligung hängt von deiner Installation, weiteren Skripten und geltendem Recht ab; prüfe den dokumentierten Datenfluss." },
    { q: "Wo liegen die Daten?", a: "Auf einem Server in Deutschland. Ein Auftragsverarbeitungsvertrag mit den EU-Standardvertragsklauseln wird geschlossen, wenn du eine Site hinzufügst. Oder du betreibst die Software selbst: Sie ist Open Source unter AGPL-3.0." },
    { q: "Wie lange dauert die Installation?", a: "Domain hinzufügen, Snippet einbauen und prüfen. Unterstützte Browser-Model-Context-Tools lassen sich bei rechtzeitig geladenem Snippet beobachten. Crawler-Logs und serverbestätigte Abschlüsse brauchen getrennte Einrichtung." },
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
