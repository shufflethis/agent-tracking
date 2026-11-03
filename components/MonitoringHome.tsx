import Link from "next/link";
import Image from "next/image";
import CopyBlock from "@/components/CopyBlock";
import { CONNECT_CLAUDE } from "@/lib/agents/format";
import { claudeSetupPrompt, DISCONNECT_CLAUDE, WRAP_CRON } from "@/lib/agents/setup";
import { AGENT_EVENTS_PER_MONTH, AGENT_LIMIT } from "@/lib/agents/types";
import { AGENT_EVENT_RETENTION_DAYS } from "@/lib/tracking/plans";
import { CONTACT_EMAIL, GITHUB_URL } from "@/lib/site";

/**
 * The home page: monitoring your own agents. The website analytics moved to
 * /websites and are linked from here, not mixed in.
 *
 * Screenshots are from the operator's own server with real runs (see the
 * captions); nothing on this page describes something that is not built.
 * Codex, Hermes and OpenClaw are listed as next, not as supported.
 */

type Card = { k: string; t: string; d: string };

function copy(lang: "en" | "de") {
  const n = (v: number) => v.toLocaleString(lang === "de" ? "de-DE" : "en-GB");
  if (lang === "de")
    return {
      eyebrow: "Agent-Monitoring · Kostenlose Beta",
      h1: "Was macht dein Agent gerade?",
      sub: "Claude-Code-Sessions, Cron-Jobs und eigene Agents in einer Liste. Sieh, welcher Lauf hängt, welcher nie gestartet ist und welches Tool gescheitert ist. Ein Briefing jeden Morgen, eine Meldung, wenn etwas kaputtgeht.",
      pick: "Such dir einen Weg aus. Beide machen dasselbe.",
      terminal: "Ins Terminal einfügen",
      terminalHint: "Zeigt einen Code, den du im Browser bestätigst. Ab der nächsten Claude-Code-Session wird getrackt.",
      claude: "Oder in Claude Code einfügen",
      claudeHint: "Claude führt die Befehle aus, wartet auf deine Bestätigung und fragt, bevor es die Crontab ändert.",
      trust: `Open Source. In Deutschland gehostet. Ohne Kreditkarte. Keine Prompts, keine Tool-Ausgaben.`,
      dashboard: "Zum Agent-Dashboard",
      how: "So funktioniert es",
      shotsTitle: "Echte Läufe, kein Demo-Datensatz",
      shotsDek: "Das ist unser eigener Server. Wir überwachen damit jeden Tag unsere Claude-Code-Projekte und Cron-Jobs.",
      shot1: "Alle Agents einer Maschine. Sieben brauchen Aufmerksamkeit, der Rest ist ruhig. Aufnahme vom 3. November 2026; ältere Doppel-Einträge aus temporären Ordnern sind ausgeblendet.",
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
      alerts: "Jeden Morgen, standardmäßig um 07:00 (Europe/Berlin), kommt ein Briefing. Sofort-Meldungen gehen per Mail raus und optional an Telegram, Slack, Discord oder einen Webhook.",
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
      why: "Agent Tracking hat damit angefangen, KI-Agenten auf Websites zu messen. Am 31. Oktober antwortete Boardy darauf: „now point it at their own agents“. Zwei Tage später lief das Monitoring auf unserem eigenen Server.",
      whyAlt: "Boardy (@boardyai), als Antwort an @Wuebbe am 31. Oktober 2026: „now point it at their own agents“. Screenshot des Originalposts auf X.",
      whyLink: "Zum Gespräch auf X ↗",
      plansTitle: "Kostenlos in der Beta, selbst hostbar für immer",
      plans: [
        { k: "Cloud · Beta", t: "Kostenlos", d: `Bis ${AGENT_LIMIT} Agents und ${n(AGENT_EVENTS_PER_MONTH)} Events im Monat. Ohne Kreditkarte. Bezahlpläne kommen erst, wenn das Produkt sie verdient hat, und nichts ändert sich ohne 30 Tage Vorankündigung per Mail.` },
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
        { q: "Was kostet es?", a: `Während der Beta nichts: bis ${AGENT_LIMIT} Agents und ${n(AGENT_EVENTS_PER_MONTH)} Events im Monat. Selbst gehostet ist es dauerhaft kostenlos.` },
        { q: "Wie aktualisiere ich die CLI?", a: "Führ den Verbindungsbefehl mit der neuen Version noch einmal aus. Die Hooks zeigen danach auf die neue Version." },
      ],
      finalTitle: "Verbinde deinen ersten Agent",
      finalDek: "Ein Befehl, eine Bestätigung im Browser. Ab der nächsten Session siehst du, was er tut.",
    };
  return {
    eyebrow: "Agent monitoring · Free beta",
    h1: "What's your agent doing right now?",
    sub: "Claude Code sessions, cron jobs and your own agents on one list. See which run is stuck, which one never started and which tool failed. One briefing every morning, an alert when something breaks.",
    pick: "Pick one way. Both do the same thing.",
    terminal: "Paste into your terminal",
    terminalHint: "Shows a code you confirm in the browser. Tracking starts with your next Claude Code session.",
    claude: "Or paste into Claude Code",
    claudeHint: "Claude runs the commands, waits for your confirmation and asks before it changes your crontab.",
    trust: "Open source. Hosted in Germany. No credit card. No prompts, no tool output.",
    dashboard: "Open the agent dashboard",
    how: "How it works",
    shotsTitle: "Real runs, not a demo data set",
    shotsDek: "This is our own server. We use it every day to watch our Claude Code projects and cron jobs.",
    shot1: "Every agent on one machine. Seven need attention, the rest are quiet. Captured on 3 November 2026; older duplicate entries from temporary folders are hidden.",
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
    alerts: "Every morning, at 07:00 Europe/Berlin by default, you get one briefing. Immediate alerts go out by email, and optionally to Telegram, Slack, Discord or a webhook.",
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
    why: "Agent Tracking started by measuring AI agents on websites. On 31 October Boardy replied: “now point it at their own agents”. Two days later the monitoring was running on our own server.",
    whyAlt: "Boardy (@boardyai), replying to @Wuebbe on October 31, 2026: “now point it at their own agents”. Screenshot of the original X post.",
    whyLink: "Read the conversation on X ↗",
    plansTitle: "Free during the beta, self-hostable for good",
    plans: [
      { k: "Cloud · Beta", t: "Free", d: `Up to ${AGENT_LIMIT} agents and ${n(AGENT_EVENTS_PER_MONTH)} events a month. No card. Paid plans come when the product has earned them, and nothing changes without 30 days' notice by email.` },
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
      { q: "What does it cost?", a: `Nothing during the beta: up to ${AGENT_LIMIT} agents and ${n(AGENT_EVENTS_PER_MONTH)} events a month. Self-hosted it is free for good.` },
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
    <div className={`grid${cols}`} style={{ marginTop: 22, gap: 18 }}>
      {rows.map((r) => (
        <article className="card" style={{ padding: 24 }} key={r.t}>
          <p className="smallcaps">{r.k}</p>
          <h3 style={{ fontSize: 19 }}>{r.t}</h3>
          <p style={{ color: "var(--ink-2)", marginBottom: 0 }}>{r.d}</p>
        </article>
      ))}
    </div>
  );
}

export default function MonitoringHome({ lang }: { lang: "en" | "de" }) {
  const c = copy(lang);
  const de = lang === "de";
  const L = (p: string) => (de ? `/de${p === "/" ? "" : p}` : p);
  const login = de ? "/login?lang=de&next=/app/fleet" : "/login?next=/app/fleet";
  const prompt = claudeSetupPrompt(lang);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(monitoringFaqSchema(lang)) }} />

      <section className="shell pagehead" style={{ paddingTop: 64, paddingBottom: 12 }}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 style={{ fontSize: "clamp(32px,5.4vw,60px)", lineHeight: 1.05, maxWidth: "16ch", marginBottom: 20 }}>{c.h1}</h1>
        <p style={{ fontSize: "clamp(17px,2.1vw,21px)", lineHeight: 1.55, color: "var(--ink)", maxWidth: "56ch", marginTop: 0, marginBottom: 26 }}>{c.sub}</p>
      </section>

      <section className="shell" id="connect" style={{ paddingBottom: 8 }}>
        <p className="formnote" style={{ textAlign: "center", marginBottom: 14 }}>{c.pick}</p>
        <div className="grid2 connectgrid" style={{ gap: 18 }}>
          <CopyBlock label={c.terminal} text={CONNECT_CLAUDE} lang={lang} hint={c.terminalHint} />
          <CopyBlock label={c.claude} text={prompt} lang={lang} hint={c.claudeHint} />
        </div>
        <p style={{ display: "flex", gap: 18, justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
          <Link className="btn" href={login}>{c.dashboard}</Link>
          <Link href={`${L("/docs")}#agent-monitoring`}>{c.how}</Link>
        </p>
        <p className="formnote" style={{ textAlign: "center" }}>{c.trust}</p>
      </section>

      <section className="shell section centered" id="screens">
        <h2>{c.shotsTitle}</h2>
        <p className="dek" style={{ maxWidth: "62ch" }}>{c.shotsDek}</p>
        <div className="grid2" style={{ gap: 18, marginTop: 22, textAlign: "left" }}>
          {[["/img/agents/fleet.webp", c.shot1Alt, c.shot1, 820], ["/img/agents/timeline.webp", c.shot2Alt, c.shot2, 980]].map(([src, alt, cap, h]) => (
            <figure key={src} style={{ margin: 0 }}>
              <Image src={src as string} alt={alt as string} width={1160} height={h as number} unoptimized style={{ display: "block", width: "100%", height: "auto", aspectRatio: "1160 / 820", objectFit: "cover", objectPosition: "top left", borderRadius: 12, border: "1px solid var(--rule)" }} />
              <figcaption style={{ fontSize: 13, color: "var(--muted)", marginTop: 8 }}>{cap}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="shell section centered" id="catches">
        <h2>{c.catchTitle}</h2>
        <Cards rows={c.catches} cols={4} />
        <p className="dek" style={{ maxWidth: "62ch", marginTop: 22 }}>{c.alerts}</p>
      </section>

      <section className="shell section" id="steps">
        <h2 style={{ textAlign: "center" }}>{c.stepsTitle}</h2>
        <div style={{ maxWidth: "var(--measure)", margin: "22px auto 0" }}>
          {c.steps.map((s) => (
            <div key={s.t} style={{ marginTop: 18 }}>
              <h3 style={{ fontSize: 18, marginBottom: 6 }}>{s.t}</h3>
              <p style={{ marginTop: 0, color: "var(--ink-2)" }}>{s.d}</p>
              <CopyBlock label="Terminal" text={s.cmd} lang={lang} />
            </div>
          ))}
          <p><Link href={`${L("/docs")}#agent-monitoring`}>{c.stepsMore} →</Link></p>
        </div>
      </section>

      <section className="shell section centered" id="integrations">
        <h2>{c.todayTitle}</h2>
        <Cards rows={c.today} cols={4} />
        <p style={{ marginTop: 20 }}><Link href={L("/changelog")}>{c.changelog} →</Link></p>
      </section>

      <section className="shell section centered" id="privacy">
        <div className="callout mid" style={{ maxWidth: "var(--measure)", marginLeft: "auto", marginRight: "auto", textAlign: "left" }}>
          <span className="tag">{c.sentTitle}</span>
          <p>{c.sent}</p>
          <p>{c.never} <Link href={`${L("/docs")}#agent-monitoring`}>{c.sentMore}</Link>.</p>
        </div>
      </section>

      <section className="shell section centered" id="why">
        <h2>{c.whyTitle}</h2>
        <p className="dek" style={{ maxWidth: "58ch" }}>{c.why}</p>
        <figure style={{ margin: "18px auto 0", maxWidth: 440 }}>
          <a href="https://x.com/boardyai/status/2116435532163195363" target="_blank" rel="noopener noreferrer" style={{ display: "block" }}>
            <Image src="/images/boardy-own-agents.png" width={1100} height={498} alt={c.whyAlt} unoptimized style={{ display: "block", width: "100%", height: "auto", borderRadius: 12 }} />
            <span style={{ display: "block", fontSize: 13, marginTop: 8 }}>{c.whyLink}</span>
          </a>
        </figure>
      </section>

      <section className="shell section centered" id="plans">
        <h2>{c.plansTitle}</h2>
        <Cards rows={c.plans} cols={2} />
        <p className="formnote" style={{ marginTop: 16 }}>
          <a href={GITHUB_URL} rel="noopener">{c.source}</a> · {c.more}
        </p>
      </section>

      <section className="shell section centered" id="faq">
        <h2>{c.faqTitle}</h2>
        <div className="faq" style={{ marginTop: 18, textAlign: "left" }}>
          {c.faq.map((f) => (
            <details key={f.q}>
              <summary><h3>{f.q}</h3></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="shell section centered" id="websites">
        <div className="card" style={{ padding: 28, maxWidth: "var(--measure)", margin: "0 auto", textAlign: "left" }}>
          <h2 style={{ fontSize: 22, marginTop: 0 }}>{c.websitesTitle}</h2>
          <p style={{ color: "var(--ink-2)" }}>{c.websites}</p>
          <p style={{ marginBottom: 0 }}><Link href={L("/websites")}>{c.websitesLink}</Link></p>
        </div>
      </section>

      <section className="shell section centered" id="start">
        <h2>{c.finalTitle}</h2>
        <p className="dek" style={{ maxWidth: "56ch" }}>{c.finalDek}</p>
        <div style={{ maxWidth: "var(--measure)", margin: "18px auto 0", textAlign: "left" }}>
          <CopyBlock label={c.terminal} text={CONNECT_CLAUDE} lang={lang} />
        </div>
        <p><Link className="btn" href={login}>{c.dashboard}</Link></p>
      </section>
    </>
  );
}
