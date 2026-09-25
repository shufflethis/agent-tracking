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
  definitionTitle: "AI traffic is the beginning. What happens next?",
  definition: "Agent Tracking helps website teams inspect AI referrals and tool failures, confirm inquiries through server receipts, and document fixes with browser retests.",
  definitionMore: "Start with the signal you need. The snippet observes recognized referrals and supported browser tools. Origin logs add crawler access; server integrations confirm business outcomes.",
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
  fightTitle: "From a failure to a checked fix.",
  fightDek: "Keep the problem, the change, and the retest together.",
  fight: [{"k": "1. Investigate", "t": "Start with evidence", "d": "Insights highlights measurement gaps, observed failures, and pending retests. Open the supporting data before deciding what to change."}, {"k": "2. Fix", "t": "Document the correction", "d": "Record a finding, assign an owner, and describe the change. Link the correction to its test runs."}, {"k": "3. Retest", "t": "Check the same path again", "d": "Repeat a prepared browser inquiry test on your staging website. Compare the outcome and test conditions."}, {"k": "4. Share", "t": "Show what changed", "d": "Keep checked fixes in your site history and share findings, corrections, and retests in a protected report."}],
  whoTitle: "For teams that can change the website.",
  whoDek: "A practical workspace for investigating and checking improvements.",
  who: [{"k": "Agencies", "t": "Evidence for each client", "d": "Document issues and checked fixes for each client website. Share the evidence with the people responsible."}, {"k": "Website and product teams", "t": "Investigate broken tool calls", "d": "Inspect technical failures and link inquiries to confirmations from your own system."}, {"k": "GEO and AEO teams", "t": "See what reaches your website", "d": "Add observed visits and website activity to your visibility analysis. Crawler requests remain separate from citations and recommendations."}],
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
  valueTitle: "Three questions worth opening a dashboard for.",
  valueDek: "Use the evidence to decide what to investigate next.",
  value: [{"k": "Visitors", "t": "Who brings visitors?", "d": "See attributable visits from AI assistants and their landing pages. Find out where AI traffic reaches your website."}, {"k": "Tool failures", "t": "What breaks on your site?", "d": "Inspect observed tool calls, technical errors, and response times. Insights links observed failures to the relevant evidence and a next step."}, {"k": "Results", "t": "Did the inquiry arrive?", "d": "Your server confirms successfully created inquiries or bookings. Missing confirmation remains unknown, rather than becoming a lost sale."}],
  faqTitle: "Before you connect your website",
  faqDek: "What you can measure, what needs an integration, and what the results mean.",
  faq: [
  {
    "q": "Will Agent Tracking improve my rankings in AI answers?",
    "a": "Agent Tracking shows observed activity on your website. You can use it to investigate technical problems and retest changes. It does not guarantee more mentions, citations, or better placement in AI answers."
  },
  {
    "q": "Can I see what people asked ChatGPT?",
    "a": "Recorded referrals and server logs do not reliably reveal the original question. Closely timed page requests do not identify a specific prompt either."
  },
  {
    "q": "Is one script enough?",
    "a": "The snippet records recognized referrals and supported browser activity. Crawler analysis requires origin logs. Confirmed business outcomes require a server integration."
  },
  {
    "q": "What can I check before agents visit my site?",
    "a": "You can run a prepared browser inquiry test on a test or staging website. This synthetic test is shown separately from real usage."
  },
  {
    "q": "Can I take my data with me?",
    "a": "Statistics are available through API, MCP, and CSV. Protected reports can be exported as JSON. You can also host Agent Tracking yourself."
  }
],
};

const DE: HomeContent = {
  category: "KI-Agenten-Analytics für Websites",
  definitionTitle: "KI-Traffic ist der Anfang. Was passiert danach?",
  definition: "Agent Tracking hilft Website-Teams, KI-Referrals und Tool-Fehler zu untersuchen, Anfragen durch Serverbelege zu bestätigen und Korrekturen mit Browser-Nachtests zu dokumentieren.",
  definitionMore: "Starte mit dem Signal, das du brauchst. Das Snippet beobachtet erkannte Referrals und unterstützte Browser-Tools. Origin-Logs ergänzen Crawler-Zugriffe; Serverintegrationen bestätigen Geschäftsergebnisse.",
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
  fightTitle: "Vom Fehler zum überprüften Fix.",
  fightDek: "Halte Problem, Änderung und Nachtest zusammen.",
  fight: [{"k": "1. Untersuchen", "t": "Mit Belegen anfangen", "d": "Insights zeigt Messlücken, beobachtete Fehler und offene Nachtests. Öffne die zugehörigen Daten, bevor du über eine Änderung entscheidest."}, {"k": "2. Korrigieren", "t": "Die Änderung dokumentieren", "d": "Halte einen Befund fest, ordne eine verantwortliche Person zu und beschreibe die Änderung. Verknüpfe die Korrektur mit ihren Testläufen."}, {"k": "3. Nachtesten", "t": "Denselben Ablauf erneut prüfen", "d": "Wiederhole einen vorbereiteten Anfrage-Test im Browser auf deiner Staging-Website. Vergleiche Ergebnis und Testbedingungen."}, {"k": "4. Belegen", "t": "Zeigen, was sich geändert hat", "d": "Bewahre überprüfte Korrekturen im Verlauf deiner Website auf. Teile Befunde, Änderungen und Nachtests in einem geschützten Bericht."}],
  whoTitle: "Für Teams, die an der Website etwas ändern können.",
  whoDek: "Ein Arbeitsbereich, um Probleme zu untersuchen und Verbesserungen zu überprüfen.",
  who: [{"k": "Agenturen", "t": "Belege für jeden Kunden", "d": "Dokumentiere Probleme und überprüfte Korrekturen pro Kundenwebsite. Teile die Ergebnisse mit den zuständigen Ansprechpartnern."}, {"k": "Website- und Produktteams", "t": "Tool-Fehler untersuchen", "d": "Prüfe technische Fehler und verknüpfe Anfragen mit Bestätigungen aus deinem eigenen System."}, {"k": "GEO- und AEO-Teams", "t": "Sehen, was die Website erreicht", "d": "Ergänze deine Sichtbarkeitsanalyse um beobachtete Besuche und Vorgänge auf deiner Website. Crawler-Abrufe bleiben getrennt von Zitierungen und Empfehlungen."}],
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
  valueTitle: "Drei Fragen, für die sich ein Dashboard lohnt.",
  valueDek: "Nutze die Belege, um den nächsten sinnvollen Schritt zu wählen.",
  value: [{"k": "Besucher", "t": "Wer bringt Besucher?", "d": "Erkenne zuordenbare Besuche aus KI-Assistenten und ihre Einstiegsseiten. So siehst du, wo KI-Traffic auf deiner Website ankommt."}, {"k": "Tool-Fehler", "t": "Was scheitert auf deiner Website?", "d": "Untersuche beobachtete Tool-Aufrufe, technische Fehler und Laufzeiten. Insights verbindet beobachtete Fehler mit den passenden Belegen und einem nächsten Schritt."}, {"k": "Ergebnisse", "t": "Ist die Anfrage angekommen?", "d": "Dein Server bestätigt erfolgreich angelegte Anfragen oder Buchungen. Ohne Bestätigung bleibt der Ausgang unbekannt; daraus wird kein verlorener Auftrag."}],
  faqTitle: "Bevor du deine Website verbindest",
  faqDek: "Was du messen kannst, welche Integration du brauchst und was die Ergebnisse bedeuten.",
  faq: [
  {
    "q": "Verbessert Agent Tracking mein Ranking in KI-Antworten?",
    "a": "Agent Tracking zeigt beobachtete Aktivität auf deiner Website. Du kannst damit technische Probleme untersuchen und Änderungen nachtesten. Daraus folgt keine Garantie für mehr Erwähnungen, Zitierungen oder bessere Platzierungen in KI-Antworten."
  },
  {
    "q": "Sehe ich, was Menschen ChatGPT gefragt haben?",
    "a": "Die erfassten Referrals und Serverlogs enthalten keinen verlässlichen Nachweis der ursprünglichen Frage. Auch zeitlich nahe Seitenabrufe verraten keinen konkreten Prompt."
  },
  {
    "q": "Reicht ein Script?",
    "a": "Das Snippet erfasst erkennbare Referrals und unterstützte Browser-Aktivität. Crawler-Auswertungen benötigen Serverlogs. Bestätigte Geschäftsergebnisse benötigen eine Serverintegration."
  },
  {
    "q": "Was kann ich ohne bisherigen Agentenverkehr prüfen?",
    "a": "Du kannst einen vorbereiteten Anfrageablauf auf einer Test- oder Staging-Website im Browser testen. Dieser synthetische Test wird getrennt von echter Nutzung ausgewiesen."
  },
  {
    "q": "Kann ich meine Daten mitnehmen?",
    "a": "Statistiken sind über API, MCP und CSV verfügbar. Geschützte Berichte lassen sich als JSON exportieren. Du kannst Agent Tracking auch selbst hosten."
  }
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
