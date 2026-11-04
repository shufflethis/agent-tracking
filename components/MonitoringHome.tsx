import Link from "next/link";
import Image from "next/image";
import CopyBlock from "@/components/CopyBlock";
import { CONNECT_CLAUDE } from "@/lib/agents/format";
import { claudeSetupPrompt, DISCONNECT_CLAUDE, WRAP_CRON } from "@/lib/agents/setup";
import { AGENT_EVENTS_PER_MONTH, AGENT_LIMIT } from "@/lib/agents/types";
import { AGENT_PLANS, AGENT_PRO_PRICE, pricingActive } from "@/lib/agents/plans";
import { AGENT_EVENT_RETENTION_DAYS } from "@/lib/tracking/plans";
import { BUILDER, CONTACT_EMAIL, GITHUB_URL, LEGAL } from "@/lib/site";

/**
 * The home page: monitoring your own agents. The website analytics moved to
 * /websites and are linked from here, not mixed in.
 *
 * Screenshots are from the operator's own server with real runs (see the
 * captions); nothing on this page describes something that is not built.
 * Codex, Hermes and OpenClaw are listed as next, not as supported.
 *
 * Structure follows April Dunford's pitch: insight (hero), alternatives,
 * criteria for a good solution, introduction and differentiated value,
 * proof (our own server, one operator, said plainly), objections (FAQ) and
 * the ask (connect one machine). Alternatives are compared fairly, with when
 * each one fits; no competitor list beyond what the comparison needs.
 */

type Card = { k: string; t: string; d: string };

function copy(lang: "en" | "de") {
  const n = (v: number) => v.toLocaleString(lang === "de" ? "de-DE" : "en-US");
  // Before AGENT_PRICING_STARTS the beta terms apply and the paid plans are announced; after it they are the plans.
  const live = pricingActive();
  const freeN = AGENT_PLANS.free.agents, proN = AGENT_PLANS.pro.agents, pm = AGENT_PRO_PRICE.month, py = AGENT_PRO_PRICE.year;
  if (lang === "de")
    return {
      eyebrow: live ? `Agent-Monitoring · Kostenlos für ${freeN} Agents` : "Agent-Monitoring · Kostenlose Beta",
      h1: "Was macht dein Agent gerade?",
      sub: "Ein Agent kann scheitern, ohne abzustürzen: Er hängt, wartet auf dein „Ja“ oder startet gar nicht erst. Agent Tracking bringt deine Claude-Code-Sessions, Cron-Jobs und eigenen Agents in eine Liste und sagt dir, welcher dich gerade braucht.",
      pick: "Such dir einen Weg aus. Beide machen dasselbe.",
      terminal: "Ins Terminal einfügen",
      terminalHint: "Zeigt einen Code, den du im Browser bestätigst. Ab der nächsten Claude-Code-Session wird getrackt.",
      claude: "In Claude Code einfügen",
      claudeHint: "Claude führt die Befehle aus, wartet auf deine Bestätigung und fragt, bevor es die Crontab ändert.",
      trust: ["Open Source, AGPL-3.0", live ? `Kostenlos für ${freeN} Agents, ohne Karte` : "Ohne Kreditkarte", "Keine Prompts verlassen deine Maschine"],
      kick: { alt: "Heute", crit: "Der Maßstab", catch: "Was gemeldet wird", shots: "Beweis", steps: "Einrichtung", today: "Anbindungen", why: "Dahinter", plans: "Preise", faq: "FAQ", start: "Los geht's" },
      builtBy: "Gebaut von",
      builtText: "Gorden baut Agent Tracking und geo-tool.com und überwacht damit jeden Tag die Claude-Code-Sessions und Cron-Jobs auf dem Server, auf dem auch diese Seite läuft. Fragen, Bugs oder Wünsche für Anbindungen: schreib auf X.",
      builtCta: "@wuebbe auf X folgen",
      operated: `Betrieben von ${LEGAL.name} (USA), Server in Deutschland (EU)`,
      altTitle: "Wie du heute wahrscheinlich nachschaust",
      altDek: "Alle drei Wege sind sinnvoll, für das jeweils Richtige.",
      alts: [
        { k: "Von Hand", t: "Terminal öffnen und nachsehen", d: "Reicht für ein, zwei Sessions, die du selbst gestartet hast. Über Nacht, über mehrere Maschinen oder bei einer Session, die seit einer Stunde auf dich wartet, reicht es nicht mehr." },
        { k: "Exit-Codes", t: "Cron-Mails und Fehler-Exit-Codes", d: "Gut für Skripte, die enden. Ein Agent, der hängt oder wartet, ist noch nicht zu Ende, also gibt es auch nichts zu melden." },
        { k: "LLM-Tracing", t: "AgentOps, LangSmith, Langfuse", d: "Das richtige Werkzeug für Prompts, Spans und Token-Kosten in Agents, die du selbst baust. Dafür braucht es Instrumentierung im Code, und Prompts werden meist mit aufgezeichnet. Wer beides braucht, nutzt beides." },
      ] as Card[],
      critTitle: "Was das Beobachten eines Agents kosten sollte",
      crit: ["Keine Änderung an deinem Code oder deinem Agent", "Unterscheidet hängt, wartet und fehlt, nicht nur Erfolg oder Fehler", "Keine Prompts, kein Code, keine Tool-Ausgaben verlassen deine Maschine", "Eine Nachricht am Morgen, Meldungen nur, wenn es zählt"],
      intro: "Genau dafür ist Agent Tracking gebaut: ein Monitor für Agent-Läufe. Claude-Code-Sessions über Hooks, Cron-Jobs über einen Wrapper, eigene Agents über OpenTelemetry.",
      dashboard: "Zum Agent-Dashboard",
      how: "So funktioniert es",
      shotsTitle: "Echte Läufe, kein Demo-Datensatz",
      shotsDek: "Das ist der eigene Server des Entwicklers, kein Kunde. Wir überwachen damit jeden Tag unsere Claude-Code-Projekte und Cron-Jobs. Kundenlogos haben wir noch keine; verbinde eine Maschine und urteile selbst.",
      shot1: "18 Agents auf einer Maschine. Sieben brauchen Aufmerksamkeit, der Rest ist ruhig. Aufnahme vom 3. November 2026; ältere Doppel-Einträge aus temporären Ordnern sind ausgeblendet.",
      shot1Alt: "Agent-Liste: Claude-Code-Sessions und Cron-Jobs mit Status wie Problem, hängt vermutlich, erwarteter Lauf fehlt und kein aktiver Alarm",
      shot2: "Eine Claude-Code-Session, Event für Event. Tool-Namen und Ergebnisse, keine Prompts, keine Ausgaben.",
      shot2Alt: "Session-Timeline: Zeitstempel, Event, Tool und Ergebnis einer sechsminütigen Claude-Code-Session",
      catchTitle: "Was es für dich bemerkt",
      catches: [
        { k: "Hängt", t: "Eine Session, die nicht mehr weiterkommt", d: "Kommen von einer laufenden Session keine Events mehr, wird sie als vermutlich hängend markiert." },
        { k: "Fehlt", t: "Ein Cron-Job, der nie gestartet ist", d: "Mit --every weiß das Monitoring, wann der nächste Lauf fällig ist. Bleibt er aus, gibt es eine Meldung." },
        { k: "Fehlgeschlagen", t: "Exit-Code und Tool-Fehler", d: "Fehlgeschlagene Läufe und Tool-Aufrufe, bei Cron optional mit den letzten stderr-Zeilen, Tokens maskiert." },
        { k: "Wartet", t: "Claude wartet auf dich", d: "Sessions, die auf eine Eingabe warten, sind markiert, statt stundenlang unbemerkt zu bleiben." },
      ] as Card[],
      alerts: "Einmal am Tag kommt ein Briefing zur Stunde deiner Wahl (Zeiten vorerst in mitteleuropäischer Zeit). Sofort-Meldungen gehen per Mail raus und optional an Telegram, Slack, Discord oder einen Webhook.",
      stepsTitle: "In drei Schritten eingerichtet",
      steps: [
        { t: "1. Claude Code verbinden", d: "Meldet die Maschine an und trägt Hooks in ~/.claude/settings.json ein. Daneben entsteht ein Backup, deine eigenen Hooks bleiben. Mit --project gilt es nur für den aktuellen Ordner.", cmd: CONNECT_CLAUDE },
        { t: "2. Cron-Jobs umschließen", d: "Ausgabe und Exit-Code deines Jobs bleiben genau gleich. --every meldet fehlende Läufe, --tail schickt maskierte Fehlerzeilen mit.", cmd: WRAP_CRON },
        { t: "3. Abschalten, wenn du willst", d: "Entfernt nur unsere Hooks, sonst nichts.", cmd: DISCONNECT_CLAUDE },
      ],
      stepsMore: "Konfigurations-Snapshots, OpenTelemetry und die optionale Linux-Beobachtung stehen in der Doku.",
      todayTitle: "Heute verbunden, als Nächstes geplant",
      today: [
        { k: "Heute", t: "Claude Code", d: "Über Hooks, mit einem Befehl." },
        { k: "Heute", t: "Cron-Jobs und Skripte", d: "Jeder Befehl lässt sich mit wrap umschließen, also auch ein Agent, den du per Skript startest." },
        { k: "Heute", t: "OpenTelemetry", d: "Alles, was OTLP/HTTP-JSON-Traces sendet, landet mit Trace-Struktur im Dashboard." },
        { k: "Als Nächstes", t: "Codex, Hermes, OpenClaw", d: "Eigene Anbindungen sind geplant. Den Stand findest du im Changelog." },
      ] as Card[],
      changelog: "Zum Changelog",
      sentTitle: "Was gesendet wird, und was nie",
      sent: "Gesendet werden Event-Typ, Tool-Name und ob er geklappt hat, der Projektordner-Name, ein Host-Label und eine auf deiner Maschine gehashte Session-ID. Bei Cron kommen Exit-Code und Dauer dazu.",
      never: `Nie gesendet werden Prompts, Antworten, Tool-Eingaben oder -Ausgaben, Dateiinhalte, volle Pfade und Transkripte. Events werden nach ${AGENT_EVENT_RETENTION_DAYS} Tagen gelöscht.`,
      sentMore: "Alle Felder und Aufbewahrungsfristen",
      whyTitle: "Warum es das gibt",
      why: "Agent Tracking hat damit angefangen, KI-Agenten auf Websites zu messen. Am 31. Oktober 2026 antwortete Boardy darauf: „now point it at their own agents“. Zwei Tage später lief das Monitoring auf unserem eigenen Server.",
      whyAlt: "Boardy (@boardyai), als Antwort an @Wuebbe am 31. Oktober 2026: „now point it at their own agents“. Screenshot des Originalposts auf X.",
      whyLink: "Zum Gespräch auf X ↗",
      plansTitle: live ? `Kostenlos starten, ${pm} $ wenn du mehr brauchst` : "Kostenlos in der Beta, selbst hostbar für immer",
      tiers: [
        { id: "free", name: "Free", price: "0 $", per: "für immer", note: "Ohne Kreditkarte", cta: "Kostenlos starten", features: [`${freeN} Agents`, "Claude Code, Cron-Jobs und Skripte", "Tägliches Briefing per E-Mail", "Sofort-Meldungen per E-Mail", `${AGENT_EVENT_RETENTION_DAYS} Tage Verlauf`] },
        { id: "pro", name: "Pro", price: `${pm} $`, per: "pro Monat", note: `oder ${py} $ im Jahr, zwei Monate geschenkt`, cta: "Mit Pro starten", features: [`${proN} Agents`, "Alles aus Free", "Meldungen an Telegram, Slack, Discord und Webhooks", "OpenTelemetry für eigene Agents", "Task-Checks für Cron-Jobs"] },
        { id: "self", name: "Selbst gehostet", price: "0 $", per: "auf deinem Server", note: "Open Source unter AGPL-3.0", cta: "Auf GitHub ansehen", features: ["Der komplette Code: CLI, Ingest, Dashboard, Meldungen", "Ein Node-Prozess, eine SQLite-Datei", "Deine Daten verlassen deinen Server nie"] },
      ],
      tierPick: "Empfohlen ab 6 Agents",
      tierFine: "Preise in US-Dollar, zzgl. Steuern, wo fällig. Monatlich kündbar, wirksam zum Ende des Zeitraums. Upgrade und Kündigung im Dashboard.",
      plans: [
        ...(live
          ? [
              { k: "Cloud · Free", t: "Kostenlos", d: `Bis ${freeN} Agents, tägliches Briefing und E-Mail-Meldungen. Ohne Kreditkarte.` },
              { k: "Cloud · Pro", t: `${pm} $/Monat oder ${py} $/Jahr`, d: `Bis ${proN} Agents, Meldungen an Telegram, Slack, Discord und Webhooks, OpenTelemetry und Task-Checks. Jederzeit zum Periodenende kündbar.` },
            ]
          : [
              { k: "Cloud · Beta", t: "Kostenlos", d: `Bis ${AGENT_LIMIT} Agents und ${n(AGENT_EVENTS_PER_MONTH)} Events im Monat, alle Funktionen. Ohne Kreditkarte.` },
              { k: "Nach der Beta", t: `Free oder Pro für ${pm} $/Monat`, d: `Free: ${freeN} Agents mit E-Mail-Meldungen. Pro: ${proN} Agents, alle Kanäle, OpenTelemetry und Task-Checks, ${pm} $/Monat oder ${py} $/Jahr. Vorher bekommst du 30 Tage Vorankündigung per Mail; deine bestehenden Agents laufen weiter.` },
            ]),
        { k: "Selbst gehostet", t: "Dein Server, deine Daten", d: "Alles ist Open Source unter AGPL-3.0: CLI, Ingest, Dashboard, Alerts. Ein Node-Prozess, eine SQLite-Datei." },
      ] as Card[],
      source: "Quellcode und Anleitung auf GitHub",
      more: `Mehr Agents oder Events nötig? Schreib an ${CONTACT_EMAIL}.`,
      websitesTitle: "Und auf deiner Website?",
      websites: "Agent Tracking misst auch, welche KI-Assistenten Besucher schicken, welche Tool-Aufrufe auf deiner Site scheitern und welche Anfragen dein Server bestätigt.",
      websitesLink: "KI-Agenten auf deiner Website messen →",
      faqTitle: "Häufige Fragen",
      faq: [
        { q: "Liest Agent Tracking meine Prompts oder meinen Code?", a: "Nein. Die Claude-Code-Anbindung sendet nur Lebenszyklus-Events, Tool-Namen und Erfolg oder Fehler. Prompts, Antworten, Tool-Ein- und -Ausgaben, Dateiinhalte und volle Pfade verlassen die Maschine nicht." },
        { q: "Was passiert mit meinen bestehenden Claude-Code-Hooks?", a: "Sie bleiben. connect claude ergänzt nur eigene Einträge und legt neben ~/.claude/settings.json ein Backup an. disconnect claude entfernt genau diese Einträge wieder." },
        { q: "Funktioniert das mit Codex, Hermes oder OpenClaw?", a: "Noch nicht mit einer eigenen Anbindung. Bis dahin kannst du jeden Agent-Lauf, den du per Skript oder Cron startest, mit wrap umschließen, und Agents mit OpenTelemetry-Export können Traces direkt senden. Neue Anbindungen stehen im Changelog." },
        { q: "Für wen ist es nicht gedacht?", a: "Wenn du Prompts debuggen, Modellantworten vergleichen oder Token-Kosten messen willst, nimm eine LLM-Tracing-Plattform. Agent Tracking sieht Prompts absichtlich nie." },
        { q: "Wo liegen meine Daten, und wer steht dahinter?", a: `Die gehostete Version läuft auf Servern in ${LEGAL.hostingCountry === "Germany" ? "Deutschland" : LEGAL.hostingCountry} und wird von ${LEGAL.name} betrieben. Gespeichert werden nur Lauf-Metadaten. Lieber auf eigener Infrastruktur? Selbst hosten geht überall, wo Node läuft.` },
        { q: "Was kostet es?", a: live ? `Free kostet nichts (${freeN} Agents). Pro kostet ${pm} $ im Monat oder ${py} $ im Jahr (${proN} Agents, alle Kanäle). Selbst gehostet ist es dauerhaft kostenlos.` : `Während der Beta nichts: bis ${AGENT_LIMIT} Agents und ${n(AGENT_EVENTS_PER_MONTH)} Events im Monat. Danach gibt es Free (${freeN} Agents) und Pro für ${pm} $ im Monat, mit 30 Tagen Vorankündigung. Selbst gehostet ist es dauerhaft kostenlos.` },
        { q: "Wie aktualisiere ich die CLI?", a: "Führ den Verbindungsbefehl mit der neuen Version noch einmal aus. Die Hooks zeigen danach auf die neue Version." },
      ],
      finalTitle: "Verbinde deinen ersten Agent",
      finalDek: "Ein Befehl, eine Bestätigung im Browser. Ab der nächsten Session siehst du, was er tut.",
    };
  return {
    eyebrow: live ? `Agent monitoring · Free for ${freeN} agents` : "Agent monitoring · Free beta",
    h1: "What's your agent doing right now?",
    sub: "An agent can fail without crashing: it stalls, waits for your “yes”, or never starts. Agent Tracking puts your Claude Code sessions, cron jobs and own agents on one list and tells you which one needs you.",
    pick: "Pick one way. Both do the same thing.",
    terminal: "Paste into your terminal",
    terminalHint: "Shows a code you confirm in the browser. Tracking starts with your next Claude Code session.",
    claude: "Paste into Claude Code",
    claudeHint: "Claude runs the commands, waits for your confirmation and asks before it changes your crontab.",
    trust: ["Open source, AGPL-3.0", live ? `Free for ${freeN} agents, no card` : "No credit card", "No prompts leave your machine"],
    kick: { alt: "Today", crit: "The bar", catch: "What it flags", shots: "Proof", steps: "Setup", today: "Integrations", why: "Behind it", plans: "Pricing", faq: "FAQ", start: "Get started" },
    builtBy: "Built by",
    builtText: "Gorden builds Agent Tracking and geo-tool.com, and uses it every day to watch the Claude Code sessions and cron jobs on the server this site runs on. Questions, bugs or an integration you need: ask on X.",
    builtCta: "Follow @wuebbe on X",
    operated: `Operated by ${LEGAL.name} (USA), servers in Germany (EU)`,
    altTitle: "How you probably check today",
    altDek: "All three are reasonable, each for the right job.",
    alts: [
      { k: "By hand", t: "Open the terminal and look", d: "Works for one or two sessions you started yourself. It stops working overnight, across machines, or when a session has been waiting on you for an hour." },
      { k: "Exit codes", t: "Cron mail and failing exit codes", d: "Good for scripts that end. An agent that is stalled or waiting has not ended yet, so there is nothing to report." },
      { k: "LLM tracing", t: "AgentOps, LangSmith, Langfuse", d: "The right tool for prompts, spans and token cost inside agents you build. They need instrumentation in your code and usually record prompts. If you need both, use both." },
    ] as Card[],
    critTitle: "What watching an agent should take",
    crit: ["No changes to your code or your agent", "Tells stuck, waiting and missing apart, not just pass or fail", "No prompts, code or tool output leave your machine", "One message in the morning, alerts only when it matters"],
    intro: "That is what Agent Tracking is built for: a monitor for agent runs. Claude Code sessions through hooks, cron jobs through a wrapper, your own agents through OpenTelemetry.",
    dashboard: "Open the agent dashboard",
    how: "How it works",
    shotsTitle: "Real runs, not a demo data set",
    shotsDek: "This is the developer's own server, not a customer. We use it every day to watch our Claude Code projects and cron jobs. No customer logos yet; connect one machine and judge for yourself.",
    shot1: "18 agents on one machine. Seven need attention, the rest are quiet. Captured on November 3, 2026; older duplicate entries from temporary folders are hidden.",
    shot1Alt: "Agent list: Claude Code sessions and cron jobs with statuses such as problem, suspected stuck, expected run missing and no active alert",
    shot2: "One Claude Code session, event by event. Tool names and results; no prompts, no output.",
    shot2Alt: "Session timeline: time, event, tool and result of a six-minute Claude Code session",
    catchTitle: "What it notices for you",
    catches: [
      { k: "Stuck", t: "A session that stopped moving", d: "When a running session stops sending events, it is marked as suspected stuck." },
      { k: "Missing", t: "A cron job that never started", d: "With --every the monitor knows when the next run is due. If it does not come, you hear about it." },
      { k: "Failed", t: "Exit codes and tool errors", d: "Failed runs and tool calls; for cron, optionally with the last stderr lines, tokens masked." },
      { k: "Waiting", t: "Claude is waiting on you", d: "Sessions waiting for input are marked instead of sitting unnoticed for hours." },
    ] as Card[],
    alerts: "Once a day you get one briefing, at the hour you pick (times are in Central European Time for now; US time zones are next). Immediate alerts go out by email, and optionally to Telegram, Slack, Discord or a webhook.",
    stepsTitle: "Set up in three steps",
    steps: [
      { t: "1. Connect Claude Code", d: "Signs this machine in and adds hooks to ~/.claude/settings.json. A backup is written next to it and your own hooks stay. Use --project for the current folder only.", cmd: CONNECT_CLAUDE },
      { t: "2. Wrap your cron jobs", d: "Your job's output and exit code stay exactly the same. --every reports missing runs, --tail sends masked error lines.", cmd: WRAP_CRON },
      { t: "3. Switch it off whenever you like", d: "Removes our hooks and nothing else.", cmd: DISCONNECT_CLAUDE },
    ],
    stepsMore: "Configuration snapshots, OpenTelemetry and the optional Linux observation are in the docs.",
    todayTitle: "Connected today, planned next",
    today: [
      { k: "Today", t: "Claude Code", d: "Through hooks, with one command." },
      { k: "Today", t: "Cron jobs and scripts", d: "Any command can be wrapped, including an agent you start from a script." },
      { k: "Today", t: "OpenTelemetry", d: "Anything that sends OTLP/HTTP JSON traces shows up with its trace structure." },
      { k: "Next", t: "Codex, Hermes, OpenClaw", d: "Dedicated integrations are planned. Follow them in the changelog." },
    ] as Card[],
    changelog: "Read the changelog",
    sentTitle: "What is sent, and what never is",
    sent: "Sent: event type, tool name and whether it succeeded, the project folder name, a host label and a session ID hashed on your machine. For cron, also exit code and duration.",
    never: `Never sent: prompts, answers, tool input or output, file contents, full paths or transcripts. Events are deleted after ${AGENT_EVENT_RETENTION_DAYS} days.`,
    sentMore: "Every field and retention period",
    whyTitle: "Why this exists",
    why: "Agent Tracking started by measuring AI agents on websites. On October 31, 2026, Boardy replied: “now point it at their own agents”. Two days later the monitoring was running on our own server.",
    whyAlt: "Boardy (@boardyai), replying to @Wuebbe on October 31, 2026: “now point it at their own agents”. Screenshot of the original X post.",
    whyLink: "Read the conversation on X ↗",
    plansTitle: live ? `Free to start, $${pm} when you need more` : "Free during the beta, self-hostable for good",
    tiers: [
      { id: "free", name: "Free", price: "$0", per: "forever", note: "No credit card", cta: "Start free", features: [`${freeN} agents`, "Claude Code, cron jobs and scripts", "Daily briefing by email", "Instant alerts by email", `${AGENT_EVENT_RETENTION_DAYS} days of history`] },
      { id: "pro", name: "Pro", price: `$${pm}`, per: "per month", note: `or $${py} a year, two months free`, cta: "Start with Pro", features: [`${proN} agents`, "Everything in Free", "Telegram, Slack, Discord and webhook alerts", "OpenTelemetry for your own agents", "Task checks for cron jobs"] },
      { id: "self", name: "Self-hosted", price: "$0", per: "on your server", note: "Open source under AGPL-3.0", cta: "View on GitHub", features: ["All of the code: CLI, ingest, dashboard, alerts", "One Node process, one SQLite file", "Your data never leaves your server"] },
    ],
    tierPick: "Recommended from 6 agents",
    tierFine: "Prices in US dollars, plus tax where due. Cancel any time, effective at the end of the period. Upgrade and cancel in the dashboard.",
    plans: [
      ...(live
        ? [
            { k: "Cloud · Free", t: "Free", d: `Up to ${freeN} agents, daily briefing and email alerts. No card.` },
            { k: "Cloud · Pro", t: `$${pm}/month or $${py}/year`, d: `Up to ${proN} agents, Telegram, Slack, Discord and webhook alerts, OpenTelemetry and task checks. Cancel any time, effective at the end of the period.` },
          ]
        : [
            { k: "Cloud · Beta", t: "Free", d: `Up to ${AGENT_LIMIT} agents and ${n(AGENT_EVENTS_PER_MONTH)} events a month, every feature. No card.` },
            { k: "After the beta", t: `Free, or Pro for $${pm}/month`, d: `Free: ${freeN} agents with email alerts. Pro: ${proN} agents, every channel, OpenTelemetry and task checks, $${pm}/month or $${py}/year. You get 30 days' notice by email first, and your existing agents keep running.` },
          ]),
      { k: "Self-hosted", t: "Your server, your data", d: "Everything is open source under AGPL-3.0: CLI, ingest, dashboard, alerts. One Node process, one SQLite file." },
    ] as Card[],
    source: "Source and instructions on GitHub",
    more: `Need more agents or events? Write to ${CONTACT_EMAIL}.`,
    websitesTitle: "And on your website?",
    websites: "Agent Tracking also measures which AI assistants send visitors, which tool calls fail on your site and which inquiries your server confirms.",
    websitesLink: "Measure AI agents on your website →",
    faqTitle: "Questions",
    faq: [
      { q: "Does Agent Tracking read my prompts or code?", a: "No. The Claude Code integration sends lifecycle events, tool names and success or failure only. Prompts, answers, tool input and output, file contents and full paths stay on your machine." },
      { q: "What happens to my existing Claude Code hooks?", a: "They stay. connect claude only adds its own entries and writes a backup next to ~/.claude/settings.json. disconnect claude removes exactly those entries again." },
      { q: "Does it work with Codex, Hermes or OpenClaw?", a: "Not with a dedicated integration yet. Until then, wrap any agent run you start from a script or cron, and agents with an OpenTelemetry exporter can send traces directly. New integrations are announced in the changelog." },
      { q: "Who is it not for?", a: "If you need to debug prompts, compare model output or track token cost, use an LLM tracing platform. Agent Tracking deliberately never sees prompts." },
      { q: "Where is my data, and who is behind this?", a: `The hosted version runs on servers in ${LEGAL.hostingCountry}, operated by ${LEGAL.name}. Only run metadata is stored. Prefer your own infrastructure? Self-host it anywhere Node runs.` },
      { q: "What does it cost?", a: live ? `Free costs nothing (${freeN} agents). Pro is $${pm} a month or $${py} a year (${proN} agents, every channel). Self-hosted it is free for good.` : `Nothing during the beta: up to ${AGENT_LIMIT} agents and ${n(AGENT_EVENTS_PER_MONTH)} events a month. After that there is Free (${freeN} agents) and Pro for $${pm} a month, with 30 days' notice. Self-hosted it is free for good.` },
      { q: "How do I update the CLI?", a: "Run the connect command with the new version again. The hooks then point at the new version." },
    ],
    finalTitle: "Connect your first agent",
    finalDek: "One command, one confirmation in the browser. From your next session on you can see what it does.",
  };
}

export function monitoringFaqSchema(lang: "en" | "de") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: copy(lang).faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

function Cards({ rows, cols }: { rows: Card[]; cols: 2 | 3 | 4 }) {
  return (
    <div className={`grid${cols} hcards`}>
      {rows.map((r) => (
        <article className="card hcard" key={r.t}>
          <p className="smallcaps">{r.k}</p>
          <h3>{r.t}</h3>
          <p>{r.d}</p>
        </article>
      ))}
    </div>
  );
}

/** Section header: a small label, the headline, an optional lead. One rhythm for every section. */
function Head({ kick, title, dek }: { kick: string; title: string; dek?: string }) {
  return (
    <header className="hhead">
      <p className="hkick">{kick}</p>
      <h2>{title}</h2>
      {dek ? <p className="hdek">{dek}</p> : null}
    </header>
  );
}

export default function MonitoringHome({ lang }: { lang: "en" | "de" }) {
  const c = copy(lang);
  const de = lang === "de";
  const L = (p: string) => (de ? `/de${p === "/" ? "" : p}` : p);
  const login = de ? "/login?lang=de&next=/app/fleet" : "/login?next=/app/fleet";
  const loginPro = de ? "/login?lang=de&next=/app/fleet/settings" : "/login?next=/app/fleet/settings";
  const prompt = claudeSetupPrompt(lang);
  const live = pricingActive();
  const tierHref = (id: string) => (id === "self" ? GITHUB_URL : id === "pro" ? loginPro : login);

  return (
    <div className="home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(monitoringFaqSchema(lang)) }} />

      <section className="shell hhero">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1>{c.h1}</h1>
        <p className="hhero-sub">{c.sub}</p>
      </section>

      <section className="shell hconnect" id="connect">
        <p className="hpick">{c.pick}</p>
        <div className="hconnect-stack">
          <CopyBlock kind="terminal" label={c.terminal} text={CONNECT_CLAUDE} lang={lang} hint={c.terminalHint} />
          <p className="hor" aria-hidden="true"><span>{de ? "oder" : "or"}</span></p>
          <CopyBlock kind="prompt" label={c.claude} text={prompt} lang={lang} hint={c.claudeHint} />
        </div>
        <div className="hctas">
          <Link className="btn" href={login}>{c.dashboard}</Link>
          <Link className="btn ghost" href={`${L("/docs")}#agent-monitoring`}>{c.how}</Link>
        </div>
        <ul className="htrust">
          {c.trust.map((t) => <li key={t}>{t}</li>)}
          <li className="htrust-by">
            <a href={BUILDER.url} target="_blank" rel="noopener">
              <Image src={BUILDER.avatar} alt="" width={22} height={22} unoptimized />
              {c.builtBy} @{BUILDER.handle}
            </a>
          </li>
        </ul>
      </section>

      <section className="shell hsec" id="alternatives">
        <Head kick={c.kick.alt} title={c.altTitle} dek={c.altDek} />
        <Cards rows={c.alts} cols={3} />
      </section>

      <section className="shell hsec" id="criteria">
        <Head kick={c.kick.crit} title={c.critTitle} />
        <ul className="critlist">
          {c.crit.map((x) => <li key={x}>{x}</li>)}
        </ul>
        <p className="hafter">{c.intro}</p>
      </section>

      <div className="hband">
        <section className="shell hsec" id="catches">
          <Head kick={c.kick.catch} title={c.catchTitle} />
          <Cards rows={c.catches} cols={4} />
          <p className="hafter">{c.alerts}</p>
        </section>
      </div>

      <section className="shell hsec" id="screens">
        <Head kick={c.kick.shots} title={c.shotsTitle} dek={c.shotsDek} />
        <div className="grid2 hshots">
          {[["/img/agents/fleet.webp", c.shot1Alt, c.shot1, 820], ["/img/agents/timeline.webp", c.shot2Alt, c.shot2, 980]].map(([src, alt, cap, h]) => (
            <figure key={src as string}>
              <Image src={src as string} alt={alt as string} width={1160} height={h as number} unoptimized />
              <figcaption>{cap}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="shell hsec" id="steps">
        <Head kick={c.kick.steps} title={c.stepsTitle} />
        <ol className="hsteps">
          {c.steps.map((s, i) => (
            <li key={s.t}>
              <span className="hstep-n" aria-hidden="true">{i + 1}</span>
              <div className="hstep-body">
                <h3>{s.t.replace(/^\d+\.\s*/, "")}</h3>
                <p>{s.d}</p>
                <CopyBlock kind="terminal" label="Terminal" text={s.cmd} lang={lang} />
              </div>
            </li>
          ))}
        </ol>
        <p className="hafter"><Link href={`${L("/docs")}#agent-monitoring`}>{c.stepsMore} →</Link></p>
      </section>

      <div className="hband">
        <section className="shell hsec" id="integrations">
          <Head kick={c.kick.today} title={c.todayTitle} />
          <Cards rows={c.today} cols={4} />
          <p className="hafter"><Link href={L("/changelog")}>{c.changelog} →</Link></p>
        </section>
      </div>

      <section className="shell hsec" id="privacy">
        <div className="callout mid hprivacy">
          <span className="tag">{c.sentTitle}</span>
          <p>{c.sent}</p>
          <p>{c.never} <Link href={`${L("/docs")}#agent-monitoring`}>{c.sentMore}</Link>.</p>
        </div>
      </section>

      <section className="shell hsec" id="why">
        <Head kick={c.kick.why} title={c.whyTitle} dek={c.why} />
        <div className="hwhy">
          <figure className="hwhy-tweet">
            <a href="https://x.com/boardyai/status/2116435532163195363" target="_blank" rel="noopener noreferrer">
              <Image src="/images/boardy-own-agents.png" width={1100} height={498} alt={c.whyAlt} unoptimized />
              <span>{c.whyLink}</span>
            </a>
          </figure>
          <aside className="card hbuilder">
            <Image src={BUILDER.avatar} alt={BUILDER.name} width={64} height={64} unoptimized className="hbuilder-img" />
            <div>
              <p className="smallcaps">{c.builtBy}</p>
              <p className="hbuilder-name">{BUILDER.name} <span>@{BUILDER.handle}</span></p>
              <p className="hbuilder-text">{c.builtText}</p>
              <a className="btn ghost" href={BUILDER.url} target="_blank" rel="noopener">{c.builtCta}</a>
              <p className="hbuilder-op">{c.operated}</p>
            </div>
          </aside>
        </div>
      </section>

      <div className="hband">
        <section className="shell hsec" id="plans">
          <Head kick={c.kick.plans} title={c.plansTitle} />
          {live ? (
            <>
              <div className="htiers">
                {c.tiers.map((t) => (
                  <article key={t.id} className={`htier${t.id === "pro" ? " is-pro" : ""}`}>
                    {t.id === "pro" ? <span className="htier-flag">{c.tierPick}</span> : null}
                    <h3>{t.name}</h3>
                    <p className="htier-price"><strong>{t.price}</strong> <span>{t.per}</span></p>
                    <p className="htier-note">{t.note}</p>
                    <ul>{t.features.map((f) => <li key={f}>{f}</li>)}</ul>
                    {t.id === "self"
                      ? <a className="btn ghost" href={tierHref(t.id)} rel="noopener">{t.cta}</a>
                      : <Link className={t.id === "pro" ? "btn" : "btn ghost"} href={tierHref(t.id)}>{t.cta}</Link>}
                  </article>
                ))}
              </div>
              <p className="hfine">{c.tierFine} {c.more}</p>
            </>
          ) : (
            <>
              <Cards rows={c.plans} cols={3} />
              <p className="hfine"><a href={GITHUB_URL} rel="noopener">{c.source}</a> · {c.more}</p>
            </>
          )}
        </section>
      </div>

      <section className="shell hsec" id="faq">
        <Head kick={c.kick.faq} title={c.faqTitle} />
        <div className="faq hfaq">
          {c.faq.map((f) => (
            <details key={f.q}>
              <summary><h3>{f.q}</h3></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="shell hsec" id="websites">
        <div className="card hwebsites">
          <div>
            <h2>{c.websitesTitle}</h2>
            <p>{c.websites}</p>
          </div>
          <Link className="btn ghost" href={L("/websites")}>{c.websitesLink}</Link>
        </div>
      </section>

      <section className="hfinal" id="start">
        <div className="shell">
          <Head kick={c.kick.start} title={c.finalTitle} dek={c.finalDek} />
          <div className="hfinal-box">
            <CopyBlock kind="terminal" label={c.terminal} text={CONNECT_CLAUDE} lang={lang} />
          </div>
          <div className="hctas"><Link className="btn" href={login}>{c.dashboard}</Link></div>
        </div>
      </section>
    </div>
  );
}
