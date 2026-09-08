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
  definitionTitle: string;
  definition: string;
  definitionMore: string;
  seesTitle: string;
  seesDek: string;
  sees: Row[];
  seesScore: string;
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
  definitionTitle: "What Agent Tracking does",
  definition:
    "Agent Tracking is analytics for AI agents on a website: it records which AI assistants send visitors, which AI crawlers and live fetchers read pages, which MCP and WebMCP tools an agent calls inside the browser, and whether the agent reaches a goal.",
  definitionMore:
    "Web analytics counts people. Bot managers count crawlers at the edge. Neither sees the agent that is already inside the site, calling a tool or finishing a booking on someone's behalf. Agent Tracking measures that third kind of visitor, from the referral to the completed action, with one line of script, without cookies and without personal data.",
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
    { q: "What is Agent Tracking?", a: "Agent Tracking is an open-source analytics service that measures what AI agents do on a website: AI referrals, AI crawler fetches verified against published IP ranges, MCP and WebMCP tool calls with their outcome, and conversions reached by agents. It is installed with one script tag and stores no cookies and no personal data." },
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
  definitionTitle: "Was Agent Tracking macht",
  definition:
    "Agent Tracking ist Analytics für KI-Agenten auf einer Website: Es erfasst, welche KI-Assistenten Besucher schicken, welche KI-Crawler und Live-Abrufer Seiten lesen, welche MCP- und WebMCP-Tools ein Agent im Browser aufruft und ob der Agent ein Ziel erreicht.",
  definitionMore:
    "Web-Analytics zählt Menschen. Bot-Manager zählen Crawler am Rand des Netzes. Keiner sieht den Agenten, der schon in der Site ist, ein Tool aufruft oder für jemanden eine Buchung abschließt. Agent Tracking misst diese dritte Besucherart, von der Empfehlung bis zur erledigten Aufgabe, mit einer Zeile Script, ohne Cookies und ohne personenbezogene Daten.",
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
    { q: "Was ist Agent Tracking?", a: "Agent Tracking ist ein Open-Source-Analytics-Dienst, der misst, was KI-Agenten auf einer Website tun: KI-Referrals, gegen veröffentlichte IP-Bereiche verifizierte Crawler-Abrufe, MCP- und WebMCP-Tool-Aufrufe mit Ergebnis und von Agenten erreichte Conversions. Installiert wird ein Script-Tag; es gibt keine Cookies und keine personenbezogenen Daten." },
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
