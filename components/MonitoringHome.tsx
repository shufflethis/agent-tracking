import Link from "next/link";
import Image from "next/image";
import AgentGuardMotion from "@/components/AgentGuardMotion";
import { FeatureIcon, HarnessStrip, type FeatureIconKind } from "@/components/BrandIcons";
import CopyBlock from "@/components/CopyBlock";
import { CONNECT_CLAUDE } from "@/lib/agents/format";
import { AUDIT_COMMAND, AUDIT_ONE_LINER, claudeSetupPrompt, DISCONNECT_CLAUDE, DOCTOR_COMMAND, FIX_COMMAND, GUARD_EXAMPLE, WRAP_CRON } from "@/lib/agents/setup";
import { AGENT_PLANS, AGENT_PRO_PRICE } from "@/lib/agents/plans";
import { AGENT_EVENT_RETENTION_DAYS } from "@/lib/tracking/plans";
import { BUILDER, CONTACT_EMAIL, GITHUB_URL, LEGAL } from "@/lib/site";

type Card = { k: string; t: string; d: string; icon?: FeatureIconKind };
type VisualPillar = { k: string; t: string; d: string; stat: string; img: string; alt: string; href: string; cta: string };
type CompRow = { feature: string; at: string; diy: string; cron: string; llm: string };

function copy(lang: "en" | "de") {
  const freeN = AGENT_PLANS.free.agents;
  const pm = AGENT_PRO_PRICE.month;
  const py = AGENT_PRO_PRICE.year;

  if (lang === "de") {
    return {
      eyebrow: `Zero-Prompt Guardrails & Fleet-Monitoring · Free inkl. Telegram & Slack`,
      h1: "Stoppe Endlosschleifen, Shadow-MCP-Drift & stumme Agent-Hänger.",
      sub: "Die lokale Schutzbremse und Flotten-Überwachung für Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity und Cron-Jobs. Blockt teure Fehler-Loops und destruktive Befehle auf deinem Gerät — ohne jemals Prompts, Code oder Secrets hochzuladen.",
      fit: "Gebaut für Entwickler und Engineering-Teams, die Coding-Agents über Nacht, auf Servern oder teamweit im Einsatz haben.",
      demoCta: "Interaktive Live-Demo (ohne Login)",
      dashboard: "Kostenloses Dashboard starten",
      pick: "In 10 Sekunden starten — erst 100 % offline prüfen oder direkt verbinden.",
      auditLabel: "100 % Offline-Audit & 1-Befehl-Auto-Fix (kein Login)",
      auditHint: "Prüft lokal MCP-Server, Secrets, Permissions & Guardrails — agenttracking fix hebt dich mit automatischen Backups in 3 Sekunden auf Grade A.",
      terminal: "Oder direkt alle Agents verbinden",
      terminalHint: "SHA-256-geprüft. Verbindet Claude Code, Cursor, Codex, Gemini & Antigravity mit Backup bestehender Hooks.",
      claude: "Oder in Claude Code einfügen",
      claudeHint: "Claude führt den Setup-Ablauf aus, wartet auf deine Bestätigung und fragt vor jeder Crontab-Änderung.",
      trust: [
        "Keine Prompts, kein Code, keine Secrets gesendet",
        `Free: ${freeN} Agents inkl. Telegram, Slack & Discord`,
        "Open Source (AGPL-3.0) · Server in Deutschland (EU)",
      ],
      kick: {
        motion: "Live-Architektur",
        pillars: "Die drei Schutzschichten",
        catch: "Was es automatisch abfängt",
        compare: "Ehrlicher Vergleich",
        b2b: "Für Engineering-Teams & Security",
        shots: "Echte Daten",
        steps: "In 3 Minuten scharf",
        today: "Ökosystem",
        guides: "Praxis-Guides",
        plans: "Preise",
        why: "Dahinter",
        faq: "FAQ",
        start: "Jetzt absichern",
      },
      motionTitle: "So stoppt Agent Tracking teure Fehler in unter 2 Millisekunden",
      motionDek: "Wechsle zwischen vier realen Vorfällen. Die Schutzbremse greift lokal im PreToolUse-Hook — die Cloud sieht nur anonymisierte Status-Metadaten.",
      pillarsTitle: "Mehr als ein Dashboard: Lokale Bremse, MCP-Audit & Flotten-Alerts",
      pillarsDek: "Passives Monitoring allein verhindert keinen 100-$-Nachtloop und keinen ungeprüften MCP-Server. Agent Tracking kombiniert drei deterministische Schichten.",
      pillars: [
        {
          k: "01 · Kosten- & Sicherheitsbremse",
          t: "Stoppt Retry-Spiralen & destruktive Befehle lokal",
          d: "Begrenze fehlerhafte Tool-Calls am Stück, Turn-Länge und Laufzeit direkt auf dem Rechner. Destruktive Shell-Befehle (rm -rf, Force-Push, Drop) werden vor der Ausführung blockiert.",
          stat: "< 2 ms lokale Latenz · 0 Extra-Tokens",
          img: "/img/agents/cost-loop-breaker.jpg",
          alt: "Illustration eines lokalen Circuit Breakers, der eine eskalierende Endlosschleife sauber kappt",
          href: "/de/guides/claude-code-kosten-und-endlosschleifen-stoppen",
          cta: "Guide: Loops & Kosten stoppen →",
        },
        {
          k: "02 · MCP-Sicherheit & Config-Drift",
          t: "Erkennt Shadow-MCP-Server & Regeländerungen sofort",
          d: "Prüft lokal auf ungepinnte npx-MCPs, unverschlüsseltes http:// und gefährliche Wildcard-Permissions. Im Betrieb meldet Pro sofort geänderte MCP-Server, CLAUDE.md oder Erst-Tools.",
          stat: "SHA-256 Fingerprints · 0 Secrets gelesen",
          img: "/img/agents/mcp-security-drift.jpg",
          alt: "Illustration einer MCP-Server-Konstellation mit isoliertem Drift-Knoten",
          href: "/de/guides/mcp-server-sicherheit-audit-und-drift",
          cta: "Guide: MCP-Sicherheit & Drift →",
        },
        {
          k: "03 · Zero-Prompt Flotten-Monitoring",
          t: "Hängt, wartet auf Ja oder Cron ausgeblieben",
          d: "Sieh alle Claude-Code-, Cursor-, Codex-, Gemini-, Antigravity- und Cron-Läufe in einer Liste. Sofort-Meldungen per Telegram, Slack, Discord oder Webhook — schon im kostenlosen Plan.",
          stat: "5 Harnesses + Cron + OTLP + MCP",
          img: "/img/agents/guard-architecture.jpg",
          alt: "Zero-Prompt-Architektur: Lokaler Guard trennt Prompts von anonymen Status-Metadaten",
          href: "/de/guides/claude-code-monitoring-und-haengende-sessions",
          cta: "Guide: Hängende Sessions erkennen →",
        },
      ] as VisualPillar[],
      catchTitle: "Sechs Ausfälle, die normales Monitoring übersieht",
      catches: [
        { k: "Fehlerschleife", icon: "loop", t: "Agent dreht sich im Kreis", d: "5 fehlgeschlagene Tool-Calls am Stück oder 8 Fehler desselben Tools: Der lokale Guard stoppt sofort und verhindert Token-Burn." },
        { k: "Shadow MCP", icon: "mcp", t: "Ungepinnte oder neue MCP-Server", d: "audit erkennt unsichere MCP-Configs lokal; fix pinnt alle Versionen automatisch; Pro meldet jeden neuen MCP-Server oder Erst-Tools." },
        { k: "Wartet stumm", icon: "wait", t: "Claude wartet seit Stunden auf dein Ja", d: "Interaktive Freigabe-Prompts werfen keinen Exit-Code. Der Notification-Hook schickt dir sofort eine Telegram- oder Slack-Nachricht." },
        { k: "Hängt fest", icon: "hang", t: "Session liefert keine Events mehr", d: "Stille API- oder Netzwerk-Hänger werden über die Silence-Schwelle als „hängt vermutlich“ markiert." },
        { k: "Cron fehlt", icon: "cron", t: "Geplanter Job startete nie", d: "Mit --every 24h kennt der Watchdog das Zeitfenster. Bleibt der Start aus, kommt der Alert — selbst ohne Absturz." },
        { k: "Destruktiv", icon: "shell", t: "Gefährlicher Shell-Befehl blockiert", d: "Der lokale PreToolUse-Schalter kappt destruktive Shell-Muster auf deiner Maschine, bevor Schaden entsteht." },
      ] as Card[],
      alerts: "Telegram, Slack, Discord, Webhook und E-Mail sind schon im Free-Plan enthalten — plus ein tägliches Morgen-Briefing in deiner lokalen Zeitzone.",
      compareTitle: "Wo Agent Tracking passt — und wo ein anderes Tool besser ist",
      compareDek: "Kein Marketing-Nebel: Wer Prompts debuggen will, braucht Langfuse oder LangSmith. Wer autonome Coding-Agents absichern und überwachen will, braucht deterministische Guardrails + Flotten-Alerts.",
      compareHeaders: ["Anforderung", "Agent Tracking", "DIY Hooks", "Cronitor / Healthchecks", "LangSmith / Langfuse"],
      compareRows: [
        { feature: "Prompts & Code verlassen Gerät nie", at: "Ja (by design)", diy: "Ja", cron: "Ja (kein Agent-Kontext)", llm: "Nein (Prompt-Logging)" },
        { feature: "Lokale Loop- & Destruktiv-Bremse (<2 ms)", at: "Ja (guard)", diy: "Selbst bauen", cron: "Nein", llm: "Nein" },
        { feature: "MCP-Sicherheits-Audit & Config-Drift", at: "Ja (audit + Drift)", diy: "Nein", cron: "Nein", llm: "Nein" },
        { feature: "Claude, Cursor, Codex, Gemini & Agy", at: "Ja (1 Befehl)", diy: "Pro Tool einzeln", cron: "Nein", llm: "SDK im eigenen Code" },
        { feature: "„Wartet auf Ja“ & stille Hänger", at: "Ja", diy: "Teilweise", cron: "Nur fehlende Pings", llm: "Nur fertige Traces" },
        { feature: "Cron-Watchdog (--every & --tail)", at: "Ja", diy: "Nein", cron: "Ja", llm: "Nein" },
        { feature: "Telegram / Slack / Discord gratis", at: "Ja (Free-Plan)", diy: "Selbst pflegen", cron: "Meist limitiert", llm: "Begrenzt" },
        { feature: "EU-Hosting (DE) & AGPL Self-Hosting", at: "Ja, beides", diy: "Lokal", cron: "US / proprietär", llm: "Teilweise" },
      ] as CompRow[],
      b2bTitle: "Für Engineering-Teams, die Claude Code & Cursor ohne Risiko ausrollen",
      b2bDek: "Sobald 10 bis 200 Entwickler lokale Coding-Agents und MCP-Server nutzen, entsteht ein blinder Fleck. Mit Agent Tracking erhalten CTOs, Teamleads und Security volle Kontrolle — ohne Betriebsrat- oder DSGVO-Blocker.",
      b2bCards: [
        { k: "Zero-Prompt Compliance", icon: "gdpr", t: "DSGVO- & Betriebsrat-tauglich ab Tag 1", d: "Keine Prompts, keine Code-Snippets, keine Tool-Outputs verlassen die Entwickler-Laptops. Nur Hashes, Tool-Namen, Status und Drift-Signale auf deutschen Servern." },
        { k: "Shadow-MCP Kontrolle", icon: "radar", t: "Alle MCP-Server & Berechtigungen im Blick", d: "Erkenne ungepinnte npx-Pakete, unverschlüsselte Remote-Endpunkte und Wildcard-Permissions über die gesamte Flotte." },
        { k: "Einheitliche Guardrails", icon: "fuse", t: "Schutzbremse für 5 Harnesses zentral", d: "Ob dein Team Claude Code, Cursor, Codex CLI, Gemini CLI oder Antigravity nutzt — dieselben Loop-, Laufzeit- und Destruktiv-Grenzen greifen überall." },
        { k: "Enterprise-Abrechnung", icon: "team", t: "Team-Flotte, Audit-Export & Rechnung", d: "Ab 99 $/Monat pro Team: geteilte Flotten-Ansicht, zentrales Policy-Rollout, Export-Audit-Log und Kauf auf Rechnung statt Kreditkarte." },
      ] as Card[],
      b2bCta: "Team-Pilot anfragen (ab 99 $/Mo)",
      b2bDemo: "Live-Flotten-Demo testen",
      shotsTitle: "Echte Läufe vom Produktivserver + interaktive Sandbox",
      shotsDek: "Diese Screenshots stammen von unserem eigenen Produktivserver. Du willst erst klicken statt lesen? Öffne die interaktive Live-Demo komplett ohne Login.",
      shot1: "18 Agents auf einer Maschine: Status, Hänger und fehlende Cron-Läufe auf einen Blick.",
      shot1Alt: "Agent-Liste mit Claude-Code-Sessions und Cron-Jobs",
      shot2: "Session-Timeline Event für Event: Tool-Namen und Laufzeiten — null Prompts, null Code.",
      shot2Alt: "Session-Timeline einer Claude-Code-Session ohne Prompts",
      stepsTitle: "In drei Schritten abgesichert",
      steps: [
        { t: "1. Kostenloses Offline-Audit starten (kein Login)", d: "Installiert die SHA-256-geprüfte CLI und prüft sofort lokal deine MCP-Server, Permissions, Crons und Guardrails — ohne ein einziges Byte zu senden.", cmd: AUDIT_ONE_LINER },
        { t: "2. Lokale Kosten- & Sicherheitsbremse aktivieren", d: "Stoppt Fehlerschleifen, zu lange autonome Turns und destruktive Shell-Befehle direkt auf deinem Rechner.", cmd: `${GUARD_EXAMPLE}\n${AUDIT_COMMAND}` },
        { t: "3. Hooks & Cron-Jobs für Telegram/Slack verbinden", d: "Verbindet Claude Code, Cursor, Codex, Gemini & Antigravity in einem Schritt und umschließt kritische Cron-Jobs. disconnect entfernt alles rückstandslos.", cmd: `${CONNECT_CLAUDE}\n${DOCTOR_COMMAND}\n${WRAP_CRON}\n${DISCONNECT_CLAUDE}` },
      ],
      stepsMore: "Vollständige CLI-, Guard-, OTLP- und MCP-Doku",
      todayTitle: "Ein Standard für alle deine Coding-Agents",
      today: [
        { k: "Heute", t: "Claude Code, Cursor, Codex, Gemini & Antigravity", d: "Native Hooks mit Backup bestehender Einstellungen plus lokaler PreToolUse-Schutzbremse." },
        { k: "Heute", t: "Cron-Jobs & GitHub Actions", d: "doctor erkennt bestehende Crontabs; wrap liefert Exit-Code, --every Watchdog und maskiertes --tail." },
        { k: "Heute", t: "OpenTelemetry & MCP-Abfrage", d: "OTLP/HTTP-JSON-Traces einspeisen und den Flottenstatus per MCP (get_fleet_status) direkt in Claude abfragen." },
        { k: "Team & Roadmap", t: "Zentrale Team-Policies & Audit-Export", d: "Team-weite Guardrails, SAML/SSO und exportierbare Compliance-Protokolle entstehen direkt mit Pilot-Teams." },
      ] as Card[],
      changelog: "Zum Changelog",
      guidesTitle: "Tiefgehende Praxis-Guides für Entwickler & Teams",
      guidesDek: "Konkrete Konfigurationen, Benchmarks, Sicherheits-Checklisten und kopierbare Befehle.",
      guidesList: [
        { slug: "/de/guides/claude-code-hooks-anleitung-alerts-guardrails", tag: "Hooks & Alerts", title: "Claude Code Hooks: Telegram-, Slack- & Guardrail-Guide", desc: "PreToolUse, PostToolUseFailure, Notification vs. Stop — alle Events, Fallstricke und fertige Configs." },
        { slug: "/de/guides/claude-code-kosten-und-endlosschleifen-stoppen", tag: "Kostenbremse", title: "Claude Code Kosten & Endlosschleifen über Nacht stoppen", desc: "Wie Retry-Spiralen $50–$180 verbrennen und wie eine lokale Schutzbremse den Turn bei < $2 kappt." },
        { slug: "/de/guides/mcp-server-sicherheit-audit-und-drift", tag: "MCP Security", title: "MCP-Server-Sicherheit: Audit, Shadow-MCPs & Config-Drift", desc: "Ungepinnte npx-Server, Klartext-HTTP, Tool-Poisoning und DSGVO-konformes Zero-Prompt-Auditing." },
        { slug: "/de/guides/claude-code-monitoring-und-haengende-sessions", tag: "Observability", title: "Claude Code Monitoring: Hängende & wartende Sessions erkennen", desc: "Warum Exit-Codes nicht reichen — Vergleich von Hooks, Cronitor, OTLP und Zero-Prompt-Flotten." },
      ],
      allGuides: "Alle Guides ansehen",
      sentTitle: "Zero-Prompt-Garantie: Was gesendet wird — und was niemals",
      sent: "Gesendet werden: Event-Typ, Tool-Name, Erfolg/Fehler, Projektordner-Name, Host-Label, lokal gehashte Session-ID sowie Konfigurations-Hashes & MCP-Anzahl (bei Cron optional Exit-Code, Dauer und maskiertes stderr).",
      never: `Niemals gesendet werden: Prompts, Antworten, Tool-Ein- oder Ausgaben, Dateiinhalte, volle Pfade, Transkripte oder Secret-Werte. Rohevents werden nach ${AGENT_EVENT_RETENTION_DAYS} Tagen automatisch gelöscht.`,
      sentMore: "Alle Felder & Aufbewahrungsfristen",
      plansTitle: `Kostenlos mit Telegram & Slack starten — wachsen für ${pm} $ oder im Team`,
      tiers: [
        {
          id: "free",
          name: "Free",
          price: "0 $",
          per: "für immer",
          note: "Ohne Kreditkarte · inkl. Telegram & Slack",
          cta: "Kostenlos starten",
          features: [
            `Bis ${freeN} Agents`,
            "100 % Offline-Audit & lokale Schutzbremse (guard)",
            "Sofort-Alerts an Telegram, Slack, Discord, Webhook & E-Mail",
            "Tägliches Morgen-Briefing in deiner Zeitzone",
            "Lese-API & MCP (get_fleet_status)",
            `${AGENT_EVENT_RETENTION_DAYS} Tage Verlauf`,
          ],
        },
        {
          id: "pro",
          name: "Pro",
          price: `${pm} $`,
          per: "pro Monat",
          note: `oder ${py} $/Jahr (2 Monate gratis)`,
          cta: "Mit Pro starten",
          features: [
            "Unbegrenzte Agents (bis 500)",
            "Alles aus Free",
            "Server-Alerts bei MCP- & Config-Drift (CLAUDE.md, Permissions)",
            "Alerts bei neuen / erstmaligen Tools & Fehlerschleifen",
            "OpenTelemetry OTLP-Ingest & benannte Task-Checks",
            "Monatlich kündbar im Dashboard",
          ],
        },
        {
          id: "team",
          name: "Team & Governance",
          price: "Ab 99 $",
          per: "pro Monat",
          note: "Für 10–200 Entwickler · Rechnung / SEPA",
          cta: "Team-Pilot anfragen",
          features: [
            "Geteilte Flotten-Ansicht für das gesamte Engineering-Team",
            "Shadow-MCP-Inventar & Drift-Alerts über alle Dev-Maschinen",
            "Zentrale Guardrail-Policies (Loop- & Destruktiv-Schutz)",
            "DSGVO-konform: 0 Prompts verlassen das Gerät · EU-Server (DE)",
            "Exportierbares Compliance-Audit-Log & Onboarding-Support",
            "Auf Wunsch dediziert oder Self-Hosted (AGPL-3.0)",
          ],
        },
      ],
      tierPick: "Für Power-User",
      tierTeamFlag: "B2B & Security",
      selfHostBox: {
        title: "Lieber komplett auf eigener Infrastruktur?",
        text: "Der gesamte Code (CLI, Ingest, Dashboard, Alerts, Guardrails) ist Open Source unter AGPL-3.0. Ein Node-Prozess, eine SQLite-Datei — deine Daten verlassen niemals dein Netz.",
        cta: "Auf GitHub ansehen",
      },
      tierFine: "Preise in US-Dollar zzgl. ggf. anfallender Steuern. Pro ist monatlich kündbar.",
      more: `Fragen oder Enterprise-Anforderungen? Schreib an ${CONTACT_EMAIL}.`,
      whyTitle: "Warum wir das gebaut haben",
      why: "Agent Tracking begann als Website-Analytics-Tool. Am 31. Oktober 2026 kommentierte Boardy: „now point it at their own agents“. Zwei Tage später lief das Monitoring auf unserem Produktivserver — heute schützt es Claude Code, Cursor, Codex, Gemini, Antigravity und Cron-Jobs gegen stille Ausfälle, Loops und MCP-Drift.",
      whyAlt: "Boardy (@boardyai) am 31. Oktober 2026: „now point it at their own agents“",
      whyLink: "Zum Gespräch auf X ↗",
      builtBy: "Gebaut von",
      builtText: "Gorden baut Agent Tracking und geo-tool.com und überwacht damit täglich seine produktiven Claude-Code-Sessions und Cron-Jobs. Feedback, Bug-Reports oder Team-Anfragen direkt auf X oder per Mail.",
      builtCta: "@wuebbe auf X folgen",
      operated: `Betrieben von ${LEGAL.name} (USA) · Server in Deutschland (EU)`,
      faqTitle: "Häufige Fragen",
      faq: [
        { q: "Kann ich Agent Tracking testen, ohne mich anzumelden oder Daten hochzuladen?", a: "Ja, auf zwei Wegen: Im Browser über unsere interaktive Live-Demo (/demo/fleet) komplett ohne Login — und lokal im Terminal mit `agenttracking audit` und `agenttracking guard`. Beides läuft 100 % offline ohne Account." },
        { q: "Liest Agent Tracking meine Prompts, meinen Quellcode oder meine MCP-Secrets?", a: "Nein, niemals. Die Hooks senden ausschließlich Lebenszyklus-Events, Tool-Namen, Erfolg/Fehler, gehashte Session-IDs und SHA-256-Konfigurationsfingerabdrücke. Prompts, Code, Tool-Ein-/Ausgaben und Secret-Werte verlassen dein Gerät technisch nie." },
        { q: "Sind Telegram-, Slack- und Discord-Alerts wirklich kostenlos?", a: "Ja. Im Free-Plan (bis 5 Agents) sind Telegram, Slack, Discord, generische Webhooks, E-Mail-Alerts, das Morgen-Briefing sowie die lokale Schutzbremse (guard) und das Offline-Audit (audit) dauerhaft kostenlos enthalten." },
        { q: "Wie stoppt die lokale Schutzbremse Endlosschleifen und destruktive Befehle?", a: "Der PreToolUse-Hook prüft lokal auf deinem Rechner in unter 2 Millisekunden deine konfigurierten Grenzwerte (z. B. --max-failures 5, --max-calls 80, --max-minutes 45, --block-destructive on). Bei Überschreitung wird der nächste Tool-Aufruf sofort lokal blockiert, noch bevor weitere API-Tokens verbrannt oder Dateien gelöscht werden." },
        { q: "Was prüft das MCP-Sicherheits-Audit?", a: "`agenttracking audit` prüft deine lokalen MCP-Konfigurationen (Claude Code, Cursor, Gemini, Antigravity, .mcp.json) auf ungepinnte npx-Pakete ohne Version, unverschlüsselte http://-Remote-Endpunkte, Klartext-Secret-Keys in JSON-Dateien sowie zu breite Wildcard-Berechtigungen wie Bash(*)." },
        { q: "Welche Coding-Agents werden unterstützt?", a: "Claude Code, Cursor, Codex CLI, Gemini CLI und Google Antigravity (agy) über native Hooks mit einem Befehl (`connect all`), plus beliebige Cron-Jobs und GitHub Actions über `wrap` sowie eigene Agents über OpenTelemetry (OTLP)." },
        { q: "Ist das für DSGVO-strenge EU-Teams und Betriebsräte geeignet?", a: "Ja. Genau dafür wurde die Zero-Prompt-Architektur entworfen: keine Übertragung von Quellcode, Kundendaten oder Prompt-Inhalten, gehostet auf Servern in Deutschland (EU), AVV verfügbar und komplett selbst hostbar unter AGPL-3.0." },
        { q: "Bleiben meine bestehenden Claude-Code- oder Cursor-Hooks erhalten?", a: "Ja. `connect` ergänzt nur seine eigenen Einträge und speichert vorher ein Backup neben der Originaldatei. `disconnect` entfernt ausschließlich unsere Einträge wieder." },
        { q: "Für wen ist Agent Tracking NICHT das richtige Tool?", a: "Wenn du Prompts optimieren, LLM-Antworten bewerten oder Token-Spans innerhalb deiner eigenen App-Chains debuggen willst, nutze Langfuse, LangSmith oder AgentOps. Agent Tracking sieht Prompts absichtlich nie." },
        { q: "Wo finde ich das kostenlose Website-AI-Analytics-Tool?", a: "Unser kostenloses Tool zur Messung von AI-Referrals, verifizierten Crawlern und WebMCP-Tools auf Websites ist weiterhin als kostenloses Zusatz-Tool über den Link im Footer (/de/websites) verfügbar." },
      ],
      finalTitle: "Prüfe deine Agents in 10 Sekunden — 100 % offline",
      finalDek: "Kein Account, kein Upload. Sieh sofort deine MCP-Risiken, offenen Crons und fehlende Guardrails — oder teste zuerst die Live-Demo im Browser.",
    };
  }

  return {
    eyebrow: `Zero-Prompt Guardrails & Fleet Monitoring · Free incl. Telegram & Slack`,
    h1: "Stop runaway agent loops, shadow MCP drift, and silent hangs.",
    sub: "The local circuit breaker and fleet monitor for Claude Code, Cursor, Codex CLI, Gemini CLI, Antigravity, and cron jobs. Block overnight token burn and destructive shell commands on-device — without ever sending prompts, code, or secrets.",
    fit: "Built for developers and engineering teams running coding agents overnight, across servers, or across every laptop.",
    demoCta: "Try interactive live demo (no login)",
    dashboard: "Open free dashboard",
    pick: "Start in 10 seconds — audit 100% offline first, or connect your fleet right away.",
    auditLabel: "100% offline audit & 1-command auto-fix (no login)",
    auditHint: "Scans local MCPs, inline secrets, permissions & guardrails — agenttracking fix jumps you to Grade A in 3 seconds with automatic backups.",
    terminal: "Or connect all harnesses immediately",
    terminalHint: "SHA-256 verified. Safely adds hooks for Claude Code, Cursor, Codex, Gemini & Antigravity with automatic backups.",
    claude: "Or paste into Claude Code",
    claudeHint: "Claude runs setup step-by-step, waits for your browser confirmation, and asks before touching crontab.",
    trust: [
      "Zero prompts, code, or secrets ever leave your machine",
      `Free: ${freeN} agents incl. Telegram, Slack & Discord`,
      "Open source (AGPL-3.0) · EU servers in Germany",
    ],
    kick: {
      motion: "Live architecture",
      pillars: "Three deterministic layers",
      catch: "What it catches automatically",
      compare: "Honest comparison",
      b2b: "For Engineering Teams & Security",
      shots: "Real proof",
      steps: "Live in 3 minutes",
      today: "Ecosystem",
      guides: "Deep-dive guides",
      plans: "Pricing",
      why: "Origin",
      faq: "FAQ",
      start: "Harden your agents",
    },
    motionTitle: "How Agent Tracking stops costly failures in under 2 milliseconds",
    motionDek: "Switch between four real production incidents. The circuit breaker enforces limits locally in PreToolUse — the cloud receives sanitized run metadata only.",
    pillarsTitle: "More than a dashboard: local circuit breaker, MCP audit & fleet alerts",
    pillarsDek: "Passive uptime pings alone will not stop a $120 overnight retry loop or an unpinned MCP server. Agent Tracking combines three deterministic control layers.",
    pillars: [
      {
        k: "01 · Local Spend & Safety Fuse",
        t: "Stop retry spirals & destructive commands on-device",
        d: "Cap consecutive failing tool calls, turn calls, and turn minutes locally in PreToolUse. Dangerous shell patterns (rm -rf, force-push, drops) are blocked before execution.",
        stat: "< 2 ms local latency · 0 extra tokens",
        img: "/img/agents/cost-loop-breaker.jpg",
        alt: "Technical illustration of a local circuit breaker severing a runaway retry spiral",
        href: "/guides/stop-claude-code-runaway-costs-and-loops",
        cta: "Guide: Stop loops & token burn →",
      },
      {
        k: "02 · MCP Security & Config Drift",
        t: "Catch shadow MCP servers & rule changes immediately",
        d: "Audit local configs for unpinned npx MCPs, cleartext http:// endpoints, and wildcard permissions. Pro alerts you the moment MCP servers, CLAUDE.md, or first-time tools change.",
        stat: "SHA-256 fingerprints · 0 secrets read",
        img: "/img/agents/mcp-security-drift.jpg",
        alt: "Technical illustration of an MCP server constellation isolating a drifted node",
        href: "/guides/mcp-server-security-audit-and-drift",
        cta: "Guide: MCP security & drift →",
      },
      {
        k: "03 · Zero-Prompt Fleet Monitoring",
        t: "Stuck, waiting for approval, or missed cron",
        d: "See Claude Code, Cursor, Codex, Gemini, Antigravity, and cron runs in one place. Instant Telegram, Slack, Discord, and webhook alerts are included on the Free plan.",
        stat: "5 harnesses + Cron + OTLP + MCP",
        img: "/img/agents/guard-architecture.jpg",
        alt: "Zero-prompt architecture showing local guard separating prompts from sanitized status metadata",
        href: "/guides/claude-code-monitoring-and-stuck-sessions",
        cta: "Guide: Monitor stuck sessions →",
      },
    ] as VisualPillar[],
    catchTitle: "Six failure modes standard monitoring misses",
    catches: [
      { k: "Runaway loop", icon: "loop", t: "Agent spinning on failing tool calls", d: "5 failing tool calls in a row or 8 failures of the same tool: local guard stops execution immediately before burning your API budget." },
      { k: "Shadow MCP", icon: "mcp", t: "Unpinned or newly added MCP servers", d: "`audit` catches risky MCP configs offline; `fix` auto-pins every version with backups; Pro alerts on added MCPs or first-time tools." },
      { k: "Waiting silently", icon: "wait", t: "Claude waiting hours for your “yes”", d: "Interactive permission prompts never exit non-zero. The Notification hook pings your Telegram or Slack right away." },
      { k: "Silent hang", icon: "hang", t: "Session stops making progress", d: "Network stalls and silent API hangs are caught by the silence floor and flagged as suspected stuck." },
      { k: "Missed cron", icon: "cron", t: "Scheduled agent never started", d: "With --every 24h the monitor expects the next run. If it never starts, you get alerted — even with no exit code." },
      { k: "Destructive", icon: "shell", t: "Dangerous shell command blocked", d: "The local PreToolUse fuse blocks destructive shell patterns on your machine before damage happens." },
    ] as Card[],
    alerts: "Telegram, Slack, Discord, webhooks, and email alerts are all included on the Free plan — plus one morning briefing in your local time zone.",
    compareTitle: "Where Agent Tracking fits — and when to pick something else",
    compareDek: "No hype: if you need prompt debugging and LLM evals, use Langfuse or LangSmith. If you need local safety guardrails, MCP drift control, and stuck-agent alerts without uploading code, use Agent Tracking.",
    compareHeaders: ["Capability", "Agent Tracking", "DIY Hooks", "Cronitor / Healthchecks", "LangSmith / Langfuse"],
    compareRows: [
      { feature: "Prompts & code never leave device", at: "Yes (by design)", diy: "Yes", cron: "Yes (no agent context)", llm: "No (prompt logging)" },
      { feature: "Local loop & destructive fuse (<2 ms)", at: "Yes (`guard`)", diy: "Roll your own", cron: "No", llm: "No" },
      { feature: "MCP security audit & config drift", at: "Yes (`audit` + drift)", diy: "No", cron: "No", llm: "No" },
      { feature: "Claude, Cursor, Codex, Gemini & Agy", at: "Yes (1 command)", diy: "Per tool manually", cron: "No", llm: "In-app SDK only" },
      { feature: "“Waiting on approval” & silent hangs", at: "Yes", diy: "Partial", cron: "Missed pings only", llm: "Post-hoc traces" },
      { feature: "Cron watchdog (--every & --tail)", at: "Yes", diy: "No", cron: "Yes", llm: "No" },
      { feature: "Telegram / Slack / Discord free", at: "Yes (Free plan)", diy: "Self-maintained", cron: "Often paid/capped", llm: "Limited" },
      { feature: "EU hosting (DE) & AGPL self-host", at: "Yes, both", diy: "Local", cron: "US / proprietary", llm: "Partial" },
    ] as CompRow[],
    b2bTitle: "Built for engineering teams scaling Claude Code, Cursor & MCP safely",
    b2bDek: "Once 10 to 200 engineers run local coding agents and custom MCP servers, security and leadership lose visibility. Agent Tracking gives CTOs and security leads hard guardrails and auditability — without touching a single prompt or line of source code.",
    b2bCards: [
      { k: "Zero-Prompt Compliance", icon: "gdpr", t: "Security & GDPR approval on day one", d: "Zero prompts, source code, or tool outputs leave developer laptops. Only hashes, tool names, lifecycle status, and drift signals touch EU servers in Germany." },
      { k: "Shadow MCP Governance", icon: "radar", t: "Inventory every MCP server & permission drift", d: "Flag unpinned npx MCP packages, cleartext http:// endpoints, and blanket Bash(*) permissions across every developer machine." },
      { k: "Unified Multi-Harness Fuse", icon: "fuse", t: "One guardrail policy across 5 coding tools", d: "Whether engineers use Claude Code, Cursor, Codex CLI, Gemini CLI, or Antigravity — the same loop caps and destructive fuses protect them all." },
      { k: "Team & Enterprise Ready", icon: "team", t: "Shared fleet, audit exports & invoicing", d: "Starting at $99/month per team: shared fleet console, centralized guardrail policies, exportable audit trail, and invoice billing." },
    ] as Card[],
    b2bCta: "Book Team pilot (from $99/mo)",
    b2bDemo: "Explore interactive live demo",
    shotsTitle: "Real production server runs + interactive browser sandbox",
    shotsDek: "These screenshots come from our own production server — not invented numbers. Want to click around before installing anything? Open the live interactive demo with zero login.",
    shot1: "18 live agents on one server: problems, suspected stalls, and missed crons on one screen.",
    shot1Alt: "Agent list showing Claude Code sessions and cron jobs with real statuses",
    shot2: "Event-by-event session timeline: tool names and durations only — zero prompts, zero code.",
    shot2Alt: "Session timeline of a six-minute Claude Code session without prompts",
    stepsTitle: "Hardened and monitored in three steps",
    steps: [
      { t: "1. Run the 100% offline audit (no login)", d: "Installs the SHA-256 verified CLI and inspects local MCP configs, wildcard permissions, unwrapped crons, and guardrails without sending a single byte.", cmd: AUDIT_ONE_LINER },
      { t: "2. Enable the local spend & safety fuse", d: "Stops failing tool loops, runaway autonomous turns, and destructive shell commands right on your machine in under 2 ms.", cmd: `${GUARD_EXAMPLE}\n${AUDIT_COMMAND}` },
      { t: "3. Connect hooks & cron jobs for instant alerts", d: "Hooks Claude Code, Cursor, Codex, Gemini & Antigravity in one command and wraps critical cron jobs. `disconnect` removes our hooks cleanly.", cmd: `${CONNECT_CLAUDE}\n${DOCTOR_COMMAND}\n${WRAP_CRON}\n${DISCONNECT_CLAUDE}` },
    ],
    stepsMore: "Full CLI, guard, OTLP and MCP documentation",
    todayTitle: "One control plane for every coding agent you run",
    today: [
      { k: "Today", t: "Claude Code, Cursor, Codex, Gemini & Antigravity", d: "Native non-destructive hooks with automatic backups plus local PreToolUse safety fuse." },
      { k: "Today", t: "Cron jobs & GitHub Actions", d: "`doctor` discovers existing crontab entries; `wrap` reports exit codes, `--every` missed runs, and masked `--tail`." },
      { k: "Today", t: "OpenTelemetry & Fleet MCP", d: "Ingest OTLP/HTTP JSON traces and query fleet health directly inside Claude or Cursor via MCP (`get_fleet_status`)." },
      { k: "Team Roadmap", t: "Central team policies & compliance export", d: "Shared fleet views, centrally pushed guardrails, and exportable audit trails built with design-partner teams." },
    ] as Card[],
    changelog: "Read the changelog",
    guidesTitle: "In-depth engineering playbooks & benchmarks",
    guidesDek: "Production hook configs, cost-cap math, MCP security checklists, and primary-source references.",
    guidesList: [
      { slug: "/guides/claude-code-hooks-guide-alerts-guardrails", tag: "Hooks & Alerts", title: "Claude Code hooks guide: Telegram, Slack & guardrails", desc: "PreToolUse, PostToolUseFailure, Notification vs Stop — every event, silent-hang trap, and copy-paste config." },
      { slug: "/guides/stop-claude-code-runaway-costs-and-loops", tag: "Cost Control", title: "How to stop Claude Code runaway costs & infinite loops", desc: "Why overnight retry spirals burn $50–$180 and how a local PreToolUse circuit breaker caps spend under $2." },
      { slug: "/guides/mcp-server-security-audit-and-drift", tag: "MCP Security", title: "MCP server security: auditing shadow MCPs & config drift", desc: "Unpinned npx packages, cleartext http:// endpoints, tool poisoning, and zero-prompt governance for teams." },
      { slug: "/guides/claude-code-monitoring-and-stuck-sessions", tag: "Observability", title: "Claude Code monitoring: catching stuck & waiting sessions", desc: "Why exit codes miss silent hangs — comparing DIY hooks, Cronitor, OTLP, Langfuse, and zero-prompt fleets." },
    ],
    allGuides: "Browse all engineering guides",
    sentTitle: "Zero-prompt guarantee: what is sent, and what never is",
    sent: "Sent: event type, tool name, pass/fail outcome, project folder name, host label, locally hashed session ID, plus config SHA-256 fingerprints & MCP counts (for cron, exit code, duration, and optional masked stderr).",
    never: `Never sent: prompts, responses, tool input or output, file contents, full paths, transcripts, or secret values. Raw events are deleted automatically after ${AGENT_EVENT_RETENTION_DAYS} days.`,
    sentMore: "Every field and retention period",
    plansTitle: `Start free with Telegram & Slack — scale for $${pm}/mo or as a Team`,
    tiers: [
      {
        id: "free",
        name: "Free",
        price: "$0",
        per: "forever",
        note: "No card · Telegram & Slack included",
        cta: "Start free",
        features: [
          `Up to ${freeN} agents`,
          "100% offline audit & local circuit breaker (`guard`)",
          "Instant Telegram, Slack, Discord, webhook & email alerts",
          "Daily morning briefing in your local time zone",
          "Read-only API & MCP (`get_fleet_status`)",
          `${AGENT_EVENT_RETENTION_DAYS} days of history`,
        ],
      },
      {
        id: "pro",
        name: "Pro",
        price: `$${pm}`,
        per: "per month",
        note: `or $${py}/year (2 months free)`,
        cta: "Start with Pro",
        features: [
          "Unlimited agents (up to 500)",
          "Everything in Free",
          "Server alerts on MCP & config drift (`CLAUDE.md`, permissions)",
          "First-time tool alerts & runaway error-loop signals",
          "OpenTelemetry OTLP ingest & named task checks",
          "Cancel anytime in the dashboard",
        ],
      },
      {
        id: "team",
        name: "Team & Governance",
        price: "From $99",
        per: "per month",
        note: "For 10–200 engineers · Invoice billing",
        cta: "Request Team pilot",
        features: [
          "Shared fleet console for your entire engineering org",
          "Shadow MCP inventory & drift alerts across all laptops",
          "Centralized guardrail policies (loop & destructive fuse)",
          "GDPR-ready: zero prompts leave devices · EU servers (DE)",
          "Exportable compliance audit log & dedicated onboarding",
          "Dedicated cloud or self-hosted option (AGPL-3.0)",
        ],
      },
    ],
    tierPick: "For power users",
    tierTeamFlag: "B2B & Security",
    selfHostBox: {
      title: "Prefer running 100% on your own infrastructure?",
      text: "The complete codebase (CLI, ingest, dashboard, alerts, guardrails) is open source under AGPL-3.0. One Node process, one SQLite file — your metadata never leaves your network.",
      cta: "View source on GitHub",
    },
    tierFine: "Prices in US dollars, plus tax where due. Pro cancels anytime at period end.",
    more: `Questions or custom team requirements? Write to ${CONTACT_EMAIL}.`,
    whyTitle: "Why this exists",
    why: "Agent Tracking started as a website analytics tool. On October 31, 2026, Boardy replied: “now point it at their own agents”. Two days later our own server was monitored — today it protects Claude Code, Cursor, Codex, Gemini, Antigravity, and cron jobs against runaway loops, silent hangs, and MCP drift.",
    whyAlt: "Boardy (@boardyai) on October 31, 2026: “now point it at their own agents”",
    whyLink: "Read the conversation on X ↗",
    builtBy: "Built by",
    builtText: "Gorden builds Agent Tracking and geo-tool.com, using it daily to guard and monitor production Claude Code sessions and cron jobs. Reach out on X or email for feedback or team pilots.",
    builtCta: "Follow @wuebbe on X",
    operated: `Operated by ${LEGAL.name} (USA) · Servers in Germany (EU)`,
    faqTitle: "Frequently asked questions",
    faq: [
      { q: "Can I try Agent Tracking without signing up or uploading any data?", a: "Yes, two ways: explore the live interactive dashboard sandbox (/demo/fleet) right in your browser with zero login, or run `agenttracking audit` and `agenttracking guard` locally in your terminal — both work 100% offline with zero network calls." },
      { q: "Does Agent Tracking read my prompts, source code, or MCP secrets?", a: "No, never. Hooks only transmit lifecycle events, tool names, pass/fail status, locally hashed session IDs, and SHA-256 config fingerprints. Prompts, source code, tool arguments/outputs, and secret values technically never leave your machine." },
      { q: "Are Telegram, Slack, and Discord alerts really included on Free?", a: "Yes. The Free plan (up to 5 agents) includes instant Telegram, Slack, Discord, generic webhook, and email alerts, the daily local-timezone briefing, plus unlimited offline `audit` and local `guard` protection." },
      { q: "How does the local circuit breaker stop runaway loops and destructive commands?", a: "The PreToolUse hook evaluates your configured limits locally on-device in under 2 milliseconds (e.g., --max-failures 5, --max-calls 80, --max-minutes 45, --block-destructive on). When tripped, the next tool call is blocked locally before more API tokens are burned or files are harmed." },
      { q: "What does the MCP security audit check?", a: "`agenttracking audit` inspects local MCP configs (Claude Code, Cursor, Gemini, Antigravity, .mcp.json) for unpinned npx packages without explicit versions, cleartext http:// remote servers, inline plaintext secret env keys, and blanket wildcard permission rules such as Bash(*)." },
      { q: "Which coding agents and runners are supported?", a: "Claude Code, Cursor, Codex CLI, Gemini CLI, and Google Antigravity (agy) via native non-destructive hooks (`connect all`), plus any cron job or GitHub Actions workflow via `wrap`, and custom agents via OpenTelemetry (OTLP)." },
      { q: "Is Agent Tracking suitable for GDPR-strict EU engineering teams?", a: "Yes. The zero-prompt architecture was designed for strict security reviews: no source code, customer data, or prompts ever leave developer laptops, hosted infrastructure runs in Germany (EU), DPA is available, and the entire stack is AGPL-3.0 self-hostable." },
      { q: "What happens to my existing Claude Code or Cursor hooks?", a: "They stay intact. `connect` merges only its own entries and writes a timestamped backup next to your original file. `disconnect` removes only Agent Tracking entries cleanly." },
      { q: "Who is Agent Tracking NOT built for?", a: "If you want to debug prompt wording, evaluate model outputs, or inspect full token spans inside an LLM app you build, use Langfuse, LangSmith, or AgentOps. Agent Tracking deliberately never sees prompts." },
      { q: "Where did the free Website AI Analytics tool go?", a: "Our free cookieless tool for measuring AI referrals, verified crawlers, and WebMCP tools on websites remains live and free via the footer link (/websites)." },
    ],
    finalTitle: "Audit your coding agents in 10 seconds — 100% offline",
    finalDek: "No account, no upload. Spot unpinned MCPs, wildcard permissions, unwrapped crons, and missing loop fuses right away — or click through the live demo first.",
  };
}

function inlineCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    const m = /^`([^`]+)`$/.exec(part);
    return m ? <code key={i}>{m[1]}</code> : part;
  });
}

export function monitoringFaqSchema(lang: "en" | "de") {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: copy(lang).faq.map((f) => ({
      "@type": "Question",
      name: f.q.replace(/`/g, ""),
      acceptedAnswer: { "@type": "Answer", text: f.a.replace(/`/g, "") },
    })),
  };
}

function Cards({ rows, cols }: { rows: Card[]; cols: 2 | 3 | 4 }) {
  return (
    <div className={`grid${cols} hcards`}>
      {rows.map((r) => (
        <article className="card hcard" key={r.t}>
          <div className="hcard-top">
            {r.icon ? (
              <span className="hcard-ico">
                <FeatureIcon kind={r.icon} />
              </span>
            ) : null}
            <p className="smallcaps">{r.k}</p>
          </div>
          <h3>{r.t}</h3>
          <p>{inlineCode(r.d)}</p>
        </article>
      ))}
    </div>
  );
}

function Head({ kick, title, dek }: { kick: string; title: string; dek?: string }) {
  return (
    <header className="hhead">
      <p className="hkick">{kick}</p>
      <h2>{title}</h2>
      {dek ? <p className="hdek">{inlineCode(dek)}</p> : null}
    </header>
  );
}

export default function MonitoringHome({ lang }: { lang: "en" | "de" }) {
  const c = copy(lang);
  const de = lang === "de";
  const L = (p: string) => (de ? `/de${p === "/" ? "" : p}` : p);
  const demoHref = de ? "/de/demo/fleet" : "/demo/fleet";
  const login = de ? "/login?lang=de&next=/app/fleet" : "/login?next=/app/fleet";
  const loginPro = de ? "/login?lang=de&next=/app/fleet/settings" : "/login?next=/app/fleet/settings";
  const teamMail = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Agent Tracking Team & Governance Pilot")}`;
  const prompt = claudeSetupPrompt(lang);
  const tierHref = (id: string) => (id === "team" ? teamMail : id === "pro" ? loginPro : login);

  return (
    <div className="home">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(monitoringFaqSchema(lang)) }} />

      <section className="shell hhero">
        <p className="eyebrow">{c.eyebrow}</p>
        <h1>{c.h1}</h1>
        <p className="hhero-sub">{c.sub}</p>
        <p className="hhero-fit">{c.fit}</p>
        <div className="hctas" style={{ marginTop: 26 }}>
          <Link className="btn" href={demoHref}>{c.demoCta}</Link>
          <Link className="btn ghost" href={login}>{c.dashboard}</Link>
        </div>
      </section>

      <section className="shell hconnect" id="connect">
        <p className="hpick">{c.pick}</p>
        <div className="hconnect-stack">
          <CopyBlock kind="terminal" label={c.auditLabel} text={AUDIT_ONE_LINER} lang={lang} hint={c.auditHint} />
          <p className="hor" aria-hidden="true"><span>{de ? "oder" : "or"}</span></p>
          <CopyBlock kind="terminal" label={c.terminal} text={CONNECT_CLAUDE} lang={lang} hint={c.terminalHint} />
          <p className="hor" aria-hidden="true"><span>{de ? "oder" : "or"}</span></p>
          <CopyBlock kind="prompt" label={c.claude} text={prompt} lang={lang} hint={c.claudeHint} />
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

      <HarnessStrip lang={lang} />

      <section className="shell hsec" id="icp">
        <Head
          kick={de ? "Für wen genau? (ICP)" : "Who this is built for"}
          title={de ? "Drei Gruppen, für die Agent Tracking sofort Geld & Nerven spart" : "Three teams that get immediate value on day one"}
          dek={de
            ? "Klar abgegrenzt: Was wir exakt lösen, für wen es gebaut ist — und wann ein anderes Tool besser passt."
            : "Zero fluff: exactly who this is built for, what concrete problem it kills, and when to pick another tool."}
        />
        <div className="grid3 hcards">
          {(de
            ? [
                {
                  k: "01 · Solo-Dev & Power-User",
                  icon: "fuse" as FeatureIconKind,
                  t: "Claude Code, Cursor & Cron über Nacht",
                  d: "Nie wieder morgens bei einer 120-$-Retry-Schleife oder einer seit 5 Stunden auf „Ja“ wartenden Session aufwachen. Lokale Bremse + Telegram/Slack gratis (bis 5 Agents).",
                },
                {
                  k: "02 · CTO, VP Eng & Security (10–200 Devs)",
                  icon: "gdpr" as FeatureIconKind,
                  t: "Shadow-MCP-Kontrolle ohne DSGVO-Blocker",
                  d: "Ungepinnte npx-MCPs, Klartext-API-Keys & Bash(*)-Regeln über alle Entwickler-Laptops erkennen und absichern — 0 Prompts verlassen das Gerät, EU-Server in Deutschland.",
                },
                {
                  k: "03 · DevOps, Agentur & Multi-Server",
                  icon: "team" as FeatureIconKind,
                  t: "Alle Runner, Server & Crons auf einem Schirm",
                  d: "Claude Code, Cursor, Codex, Gemini, Antigravity, GitHub Actions & Crontabs (`--every 24h`, maskiertes `--tail`) gebündelt plus MCP-Abfrage (`get_fleet_status`).",
                },
              ]
            : [
                {
                  k: "01 · Solo Builder & Power User",
                  icon: "fuse" as FeatureIconKind,
                  t: "Running Claude Code, Cursor & cron overnight",
                  d: "Never wake up to a $120 retry spiral or a session stuck on “Allow?” for 5 hours. Local <2 ms circuit breaker + instant Telegram & Slack alerts free for 5 agents.",
                },
                {
                  k: "02 · CTO, VP Eng & Security (10–200 Devs)",
                  icon: "gdpr" as FeatureIconKind,
                  t: "Shadow MCP governance with zero prompt leakage",
                  d: "Catch unpinned npx MCP servers, inline JSON secrets, and wildcard permissions across every laptop — zero prompts or code leave devices, EU servers in Germany.",
                },
                {
                  k: "03 · DevOps, Agencies & Multi-Server Ops",
                  icon: "team" as FeatureIconKind,
                  t: "Every coding harness, CI runner & cron in one list",
                  d: "Unify Claude Code, Cursor, Codex, Gemini, Antigravity, GitHub Actions, and cron (`--every 24h`, masked `--tail`) with one morning briefing and MCP fleet queries.",
                },
              ]
          ).map((item) => (
            <article className="card hcard" key={item.t}>
              <div className="hcard-top">
                <span className="hcard-ico"><FeatureIcon kind={item.icon} /></span>
                <p className="smallcaps">{item.k}</p>
              </div>
              <h3>{item.t}</h3>
              <p>{inlineCode(item.d)}</p>
            </article>
          ))}
        </div>
        <div className="callout mid hicp-not">
          <span className="tag">{de ? "Nicht für dich, wenn…" : "Not for you if…"}</span>
          <p style={{ margin: 0 }}>
            {de
              ? "Du Prompt-Texte, LLM-Antworten oder Token-Spans innerhalb deiner eigenen KI-App debuggen willst → dafür sind Langfuse oder LangSmith gebaut. Agent Tracking sieht Prompts absichtlich nie."
              : "You want to debug prompt wording, evaluate model answers, or trace tokens inside an AI app you sell → use Langfuse or LangSmith. Agent Tracking deliberately never sees prompts."}
          </p>
        </div>
      </section>

      <div className="hband">
        <section className="shell hsec" id="autofix">
          <Head
            kick={de ? "Echter MacBook-Lauf · Vorher → Nachher" : "Real MacBook run · Before → After"}
            title={de ? "Von 40/100 (Grade D) auf 100/100 (Grade A) in 2 Minuten" : "From 40/100 (Grade D) to 100/100 (Grade A) in 2 minutes"}
            dek={de
              ? "Echte Terminal-Screenshots ohne Fake-Mockup: Erst 100 % offline prüfen (`audit`), dann mit `agenttracking fix` Schutzbremse, MCP-Version-Pinning & chmod-600-Secrets vollautomatisch mit Backup härten."
              : "Unedited macOS terminal screenshots — no fake mockup. Audit 100% offline first, then run `agenttracking fix` to arm guardrails, pin every npx MCP version, and move inline secrets safely with automatic backups."}
          />
          <div className="hreal-grid">
            <figure className="card hreal-card">
              <div className="hreal-head">
                <span className="chip fail">1 · BEFORE · 40/100 GRADE D</span>
                <span>{de ? "Typischer Entwickler-Mac: 9 ungepinnte MCPs, 3 Klartext-Keys, keine Loop-Bremse" : "Typical dev MacBook: 9 unpinned MCPs, 3 inline secret keys, no loop fuse"}</span>
              </div>
              <Image src="/img/agents/real-audit-40.webp" alt={de ? "Echter Terminal-Screenshot: 40/100 Grade D vor der Härtung" : "Real terminal screenshot: 40/100 Grade D before hardening"} width={1400} height={1160} unoptimized />
            </figure>
            <figure className="card hreal-card">
              <div className="hreal-head">
                <span className="chip warn">2 · AFTER GUARD · 80/100 GRADE B</span>
                <span>{inlineCode(de ? "1 Sekunde nach `guard` + `connect all`: 4 Harnesses + Schutzbremse aktiv" : "1 second after `guard` + `connect all`: 4 harnesses + local fuse active")}</span>
              </div>
              <Image src="/img/agents/real-audit-80.webp" alt={de ? "Echter Terminal-Screenshot: 80/100 Grade B nach lokalem Guard" : "Real terminal screenshot: 80/100 Grade B after enabling local guard"} width={1400} height={1120} unoptimized />
            </figure>
          </div>
          <figure className="card hreal-win">
            <div className="hreal-head">
              <span className="chip pass">3 · AFTER agenttracking fix · 100/100 GRADE A</span>
              <span>{de ? "Alle 9 npx-MCP-Server exakt gepinnt, 3 Keys sicher in chmod-600 secrets.env ausgelagert" : "All 9 npx MCP servers version-pinned, 3 secret keys safely moved to chmod-600 secrets.env"}</span>
            </div>
            <Image src="/img/agents/real-fix-100.webp" alt={de ? "Echter Terminal-Screenshot: Already hardened! Score 100/100 Grade A" : "Real terminal screenshot: Already hardened! Score 100/100 Grade A"} width={1320} height={212} unoptimized />
          </figure>
          <div className="hba-cmd">
            <CopyBlock
              kind="terminal"
              label={de ? "Welchen Score hat dein Rechner? (100 % offline · teilbare Scorecard)" : "What's your laptop's Agent Safety Score? (100% offline · shareable)"}
              text={`brew install shufflethis/tap/agenttracking\n${AUDIT_COMMAND} --share\n${FIX_COMMAND}`}
              lang={lang}
            />
          </div>
        </section>
      </div>

      <section className="shell hsec" id="architecture">
        <Head kick={c.kick.motion} title={c.motionTitle} dek={c.motionDek} />
        <AgentGuardMotion lang={lang} />
      </section>

      <div className="hband">
        <section className="shell hsec" id="pillars">
          <Head kick={c.kick.pillars} title={c.pillarsTitle} dek={c.pillarsDek} />
          <div className="grid3 hvisuals">
            {c.pillars.map((p) => (
              <article className="card hvisual-card" key={p.t}>
                <div className="hvisual-media">
                  <Image src={p.img} alt={p.alt} width={960} height={540} unoptimized />
                </div>
                <div className="hvisual-body">
                  <p className="smallcaps">{p.k}</p>
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                  <p className="hvisual-stat">{p.stat}</p>
                  <Link href={p.href} className="hvisual-link">{p.cta}</Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <section className="shell hsec" id="catches">
        <Head kick={c.kick.catch} title={c.catchTitle} />
        <Cards rows={c.catches} cols={3} />
        <p className="hafter">{c.alerts}</p>
      </section>

      <div className="hband">
        <section className="shell hsec" id="compare">
          <Head kick={c.kick.compare} title={c.compareTitle} dek={c.compareDek} />
          <div className="tablewrap hcomp">
            <table>
              <thead>
                <tr>
                  {c.compareHeaders.map((h, i) => (
                    <th key={h} className={i === 1 ? "is-hl" : undefined}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.compareRows.map((row) => (
                  <tr key={row.feature}>
                    <td><strong>{row.feature}</strong></td>
                    <td className="is-hl">{inlineCode(row.at)}</td>
                    <td>{row.diy}</td>
                    <td>{row.cron}</td>
                    <td>{row.llm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="shell hsec" id="teams">
        <Head kick={c.kick.b2b} title={c.b2bTitle} dek={c.b2bDek} />
        <Cards rows={c.b2bCards} cols={2} />
        <div className="hctas" style={{ marginTop: 26 }}>
          <a className="btn" href={teamMail}>{c.b2bCta}</a>
          <Link className="btn ghost" href={demoHref}>{c.b2bDemo}</Link>
        </div>
      </section>

      <div className="hband">
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
          <div className="hctas" style={{ marginTop: 24 }}>
            <Link className="btn" href={demoHref}>{c.demoCta}</Link>
          </div>
        </section>
      </div>

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

      <section className="shell hsec" id="guides">
        <Head kick={c.kick.guides} title={c.guidesTitle} dek={c.guidesDek} />
        <div className="grid2 hcards">
          {c.guidesList.map((g) => (
            <Link key={g.slug} href={g.slug} className="card hcard hguide-link">
              <p className="smallcaps">{g.tag}</p>
              <h3>{g.title}</h3>
              <p>{g.desc}</p>
            </Link>
          ))}
        </div>
        <p className="hafter"><Link href={L("/guides")}>{c.allGuides} →</Link></p>
      </section>

      <section className="shell hsec" id="privacy">
        <div className="callout mid hprivacy">
          <span className="tag">{c.sentTitle}</span>
          <p>{c.sent}</p>
          <p>{c.never} <Link href={`${L("/docs")}#agent-monitoring`}>{c.sentMore}</Link>.</p>
        </div>
      </section>

      <div className="hband">
        <section className="shell hsec" id="plans">
          <Head kick={c.kick.plans} title={c.plansTitle} />
          <div className="htiers">
            {c.tiers.map((t) => (
              <article key={t.id} className={`htier${t.id === "pro" || t.id === "team" ? " is-pro" : ""}`}>
                {t.id === "pro" ? <span className="htier-flag">{c.tierPick}</span> : null}
                {t.id === "team" ? <span className="htier-flag is-team">{c.tierTeamFlag}</span> : null}
                <h3>{t.name}</h3>
                <p className="htier-price"><strong>{t.price}</strong> <span>{t.per}</span></p>
                <p className="htier-note">{t.note}</p>
                <ul>{t.features.map((f) => <li key={f}>{inlineCode(f)}</li>)}</ul>
                {t.id === "team"
                  ? <a className="btn" href={tierHref(t.id)}>{t.cta}</a>
                  : <Link className={t.id === "pro" ? "btn" : "btn ghost"} href={tierHref(t.id)}>{t.cta}</Link>}
              </article>
            ))}
          </div>
          <aside className="hteam">
            <div>
              <h3>{c.selfHostBox.title} <span>AGPL-3.0 · $0</span></h3>
              <p>{c.selfHostBox.text}</p>
            </div>
            <a className="btn ghost" href={GITHUB_URL} target="_blank" rel="noopener">{c.selfHostBox.cta}</a>
          </aside>
          <p className="hfine">{c.tierFine} {c.more}</p>
        </section>
      </div>

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

      <section className="shell hsec" id="faq">
        <Head kick={c.kick.faq} title={c.faqTitle} />
        <div className="faq hfaq">
          {c.faq.map((f) => (
            <details key={f.q}>
              <summary><h3>{inlineCode(f.q)}</h3></summary>
              <p>{inlineCode(f.a)}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="hfinal" id="start">
        <div className="shell">
          <Head kick={c.kick.start} title={c.finalTitle} dek={c.finalDek} />
          <div className="hfinal-box">
            <CopyBlock kind="terminal" label={c.auditLabel} text={AUDIT_ONE_LINER} lang={lang} />
          </div>
          <div className="hctas">
            <Link className="btn" href={demoHref}>{c.demoCta}</Link>
            <Link className="btn ghost" href={login}>{c.dashboard}</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
