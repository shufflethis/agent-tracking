"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";

type ScenarioId = "loop" | "mcp" | "wait" | "cron";

type Scenario = {
  id: ScenarioId;
  tab: string;
  agent: string;
  signal: string;
  shieldStatus: string;
  shieldAction: string;
  tone: "crit" | "warn" | "violet";
  cloudNote: string;
  terminalLine: string;
  alertTitle: string;
  alertBody: string;
  metric: string;
};

type MotionChrome = {
  aria: string;
  localZone: string;
  cloudZone: string;
  freeLine: string;
};

const CHROME: Record<Locale, MotionChrome> = {
  en: {
    aria: "Interactive architecture motion graphic",
    localZone: "YOUR MACHINE (PROMPTS, CODE & SECRETS NEVER LEAVE)",
    cloudZone: "EU CLOUD (DE) · FLEET & ALERTS",
    freeLine: "Free plan includes Telegram, Slack & Discord",
  },
  de: {
    aria: "Interaktive Architektur-Animation",
    localZone: "DEINE MASCHINE (PROMPTS & CODE BLEIBEN HIER)",
    cloudZone: "EU-CLOUD (DE) · ALERTS & FLOTTE",
    freeLine: "Free-Plan inkl. Telegram/Slack/Discord",
  },
  es: {
    aria: "Animación interactiva de arquitectura",
    localZone: "TU MÁQUINA (PROMPTS Y CÓDIGO NUNCA SALEN)",
    cloudZone: "NUBE UE (DE) · FLOTA Y ALERTAS",
    freeLine: "Plan Free incluye Telegram, Slack y Discord",
  },
  pt: {
    aria: "Animação interativa de arquitetura",
    localZone: "SUA MÁQUINA (PROMPTS E CÓDIGO NUNCA SAEM)",
    cloudZone: "NUVEM UE (DE) · FROTA E ALERTAS",
    freeLine: "Plano Free inclui Telegram, Slack e Discord",
  },
  fr: {
    aria: "Animation interactive d’architecture",
    localZone: "VOTRE MACHINE (PROMPTS ET CODE RESTENT ICI)",
    cloudZone: "CLOUD UE (DE) · FLOTTE & ALERTES",
    freeLine: "Offre Free : Telegram, Slack & Discord inclus",
  },
  pl: {
    aria: "Interaktywna animacja architektury",
    localZone: "TWOJA MASZYNA (PROMPTY I KOD ZOSTAJA TU)",
    cloudZone: "CHMURA UE (DE) · FLOTA I ALERTY",
    freeLine: "Plan Free zawiera Telegram, Slack i Discord",
  },
  ja: {
    aria: "インタラクティブ構成アニメーション",
    localZone: "あなたの端末（プロンプト・コードは送信0）",
    cloudZone: "EUクラウド(DE) · フリート & 通知",
    freeLine: "FreeプランでTelegram/Slack/Discord対応",
  },
};

const SCENARIOS: Record<Locale, Scenario[]> = {
  en: [
    {
      id: "loop",
      tab: "Runaway Loop",
      agent: "Claude Code · checkout-api",
      signal: "5× Bash exit 1 in 84s",
      shieldStatus: "CIRCUIT BREAKER TRIPPED",
      shieldAction: "Blocked locally on-device (<2 ms)",
      tone: "crit",
      cloudNote: "Metadata only: loop_signal + hashed session ID",
      terminalLine: "[agenttracking guard] STOP: 5 consecutive Bash failures. PreToolUse blocked locally. Zero extra tokens spent.",
      alertTitle: "Telegram · Runaway loop stopped",
      alertBody: "checkout-api hit 5× failing Bash calls on dev-eu-01. Local guard paused the turn. Prompts stayed on-device.",
      metric: "~$40–$120 overnight token burn prevented",
    },
    {
      id: "mcp",
      tab: "Shadow MCP Drift",
      agent: "Cursor + Claude · billing-repo",
      signal: "New unpinned MCP + CLAUDE.md hash changed",
      shieldStatus: "CONFIG DRIFT FLAGGED",
      shieldAction: "SHA-256 fingerprint diff captured",
      tone: "violet",
      cloudNote: "Hashes & counts only — env secrets & tokens never read",
      terminalLine: "[agenttracking audit] HIGH: +1 unpinned npx MCP server added in .mcp.json · permission hash changed",
      alertTitle: "Slack #sec-agents · MCP & config drift",
      alertBody: "billing-repo added 1 unpinned MCP server and modified permission rules on laptop-sarah. Zero code or secrets transmitted.",
      metric: "Zero-prompt compliance (EU / GDPR ready)",
    },
    {
      id: "wait",
      tab: "Silent Permission Hang",
      agent: "Claude Code · nightly-refactor",
      signal: "Waiting on user input (18m idle)",
      shieldStatus: "WAITING STATE DETECTED",
      shieldAction: "Notification hook routed instantly",
      tone: "warn",
      cloudNote: "Lifecycle state: waiting_input (no prompt text)",
      terminalLine: "[agenttracking hook] session=7a91f3 state=waiting_input tool=Bash elapsed=18m -> alert dispatched",
      alertTitle: "Telegram · Claude is waiting on you",
      alertBody: "nightly-refactor on prod-worker-2 has been waiting for tool approval for 18 min. Open terminal or run `agenttracking pause`.",
      metric: "Zero dead overnight sessions",
    },
    {
      id: "cron",
      tab: "Missed Cron Run",
      agent: "Cron · db-backup-eu (--every 24h)",
      signal: "Expected 03:00 UTC · No heartbeat",
      shieldStatus: "MISSED SCHEDULE",
      shieldAction: "Watchdog fired without needing an exit code",
      tone: "crit",
      cloudNote: "Expected window exceeded + optional masked stderr",
      terminalLine: "[agenttracking wrap] schedule=24h last_ok=2026-11-24T03:00Z status=missed -> alert sent to Slack & email",
      alertTitle: "Discord · Expected cron never started",
      alertBody: "db-backup-eu missed its 03:00 UTC window on prod-eu-1. Standard cron sent no mail because the job never ran.",
      metric: "Catches silent skips & hung jobs",
    },
  ],
  de: [
    {
      id: "loop",
      tab: "Endlosschleife",
      agent: "Claude Code · checkout-api",
      signal: "5× Bash Exit 1 in 84 Sek.",
      shieldStatus: "SCHUTZBREMSE AUSGELÖST",
      shieldAction: "Lokal auf dem Gerät gestoppt (<2 ms)",
      tone: "crit",
      cloudNote: "Nur Metadaten: loop_signal + gehashte Session-ID",
      terminalLine: "[agenttracking guard] STOP: 5 Bash-Fehler am Stück. PreToolUse lokal blockiert. Keine weiteren Tokens verbrannt.",
      alertTitle: "Telegram · Fehlerschleife gestoppt",
      alertBody: "checkout-api hatte 5× fehlgeschlagene Bash-Calls auf dev-eu-01. Lokaler Guard hat pausiert. Prompts blieben lokal.",
      metric: "~40–120 $ nächtlicher Token-Burn verhindert",
    },
    {
      id: "mcp",
      tab: "Shadow-MCP-Drift",
      agent: "Cursor + Claude · billing-repo",
      signal: "Neuer ungepinnter MCP + CLAUDE.md geändert",
      shieldStatus: "CONFIG-DRIFT ERKANNT",
      shieldAction: "SHA-256-Fingerabdruck-Diff gemeldet",
      tone: "violet",
      cloudNote: "Nur Hashes & Zähler — Secrets & Keys bleiben lokal",
      terminalLine: "[agenttracking audit] HIGH: +1 ungepinnter npx-MCP-Server in .mcp.json · Berechtigungs-Hash geändert",
      alertTitle: "Slack #sec-agents · MCP- & Config-Drift",
      alertBody: "billing-repo hat 1 ungepinnten MCP-Server ergänzt und Regeln auf laptop-sarah geändert. Kein Code/Secret übertragen.",
      metric: "Zero-Prompt-Compliance (EU / DSGVO)",
    },
    {
      id: "wait",
      tab: "Wartet stumm auf Ja",
      agent: "Claude Code · nightly-refactor",
      signal: "Wartet auf Eingabe (18 Min. still)",
      shieldStatus: "WARTESTATUS ERKANNT",
      shieldAction: "Notification-Hook sofort weitergeleitet",
      tone: "warn",
      cloudNote: "Lebenszyklus-Status: waiting_input (kein Prompt)",
      terminalLine: "[agenttracking hook] session=7a91f3 state=waiting_input tool=Bash elapsed=18m -> Alert gesendet",
      alertTitle: "Telegram · Claude wartet auf dich",
      alertBody: "nightly-refactor auf prod-worker-2 wartet seit 18 Min. auf deine Freigabe. Terminal öffnen oder lokal pausieren.",
      metric: "Keine toten Nachtläufe mehr",
    },
    {
      id: "cron",
      tab: "Fehlender Cron-Job",
      agent: "Cron · db-backup-eu (--every 24h)",
      signal: "Erwartet 03:00 UTC · Kein Heartbeat",
      shieldStatus: "LAUF AUSGEBLIEBEN",
      shieldAction: "Watchdog meldet ganz ohne Exit-Code",
      tone: "crit",
      cloudNote: "Zeitfenster überschritten + optional maskiertes stderr",
      terminalLine: "[agenttracking wrap] schedule=24h last_ok=2026-11-24T03:00Z status=missed -> Alert an Slack & Mail",
      alertTitle: "Discord · Erwarteter Cron nie gestartet",
      alertBody: "db-backup-eu hat sein 03:00-Fenster auf prod-eu-1 verpasst. Normales Cron schwieg, weil der Job nie lief.",
      metric: "Erkennt stumme Ausfälle & Hänger",
    },
  ],
  es: [
    {
      id: "loop",
      tab: "Bucle infinito",
      agent: "Claude Code · checkout-api",
      signal: "5× Bash exit 1 en 84 s",
      shieldStatus: "FRENO ACTIVADO",
      shieldAction: "Bloqueado localmente (<2 ms)",
      tone: "crit",
      cloudNote: "Solo metadatos: loop_signal + ID hasheado",
      terminalLine: "[agenttracking guard] STOP: 5 fallos seguidos de Bash. PreToolUse bloqueado en local. 0 tokens extra gastados.",
      alertTitle: "Telegram · Bucle infinito detenido",
      alertBody: "checkout-api acumuló 5 fallos de Bash en dev-eu-01. El freno local pausó el turno. Los prompts nunca salieron del equipo.",
      metric: "~40–120 $ de gasto nocturno evitados",
    },
    {
      id: "mcp",
      tab: "Drift Shadow MCP",
      agent: "Cursor + Claude · billing-repo",
      signal: "Nuevo MCP sin fijar + CLAUDE.md modificado",
      shieldStatus: "DRIFT DETECTADO",
      shieldAction: "Diff de huella SHA-256 capturado",
      tone: "violet",
      cloudNote: "Solo hashes y conteos — secretos nunca leídos",
      terminalLine: "[agenttracking audit] HIGH: +1 servidor npx MCP sin fijar en .mcp.json · hash de permisos cambiado",
      alertTitle: "Slack #sec-agents · Drift de MCP y config",
      alertBody: "billing-repo añadió 1 MCP sin versión fija y cambió permisos en laptop-sarah. Cero código o secretos enviados.",
      metric: "Cumplimiento Zero-Prompt (UE / RGPD)",
    },
    {
      id: "wait",
      tab: "Espera silenciosa",
      agent: "Claude Code · nightly-refactor",
      signal: "Esperando aprobación (18 min)",
      shieldStatus: "ESPERA DETECTADA",
      shieldAction: "Hook Notification enviado al instante",
      tone: "warn",
      cloudNote: "Estado: waiting_input (sin texto de prompt)",
      terminalLine: "[agenttracking hook] session=7a91f3 state=waiting_input tool=Bash elapsed=18m -> alerta enviada",
      alertTitle: "Telegram · Claude espera tu confirmación",
      alertBody: "nightly-refactor en prod-worker-2 lleva 18 min esperando aprobación de herramienta. Abre la terminal o ejecuta `agenttracking pause`.",
      metric: "Cero sesiones nocturnas muertas",
    },
    {
      id: "cron",
      tab: "Cron ausente",
      agent: "Cron · db-backup-eu (--every 24h)",
      signal: "Esperado 03:00 UTC · Sin latido",
      shieldStatus: "TAREA OMITIDA",
      shieldAction: "Watchdog avisa sin exit code",
      tone: "crit",
      cloudNote: "Ventana superada + stderr enmascarado opcional",
      terminalLine: "[agenttracking wrap] schedule=24h last_ok=2026-11-24T03:00Z status=missed -> alerta a Slack y correo",
      alertTitle: "Discord · El cron esperado nunca arrancó",
      alertBody: "db-backup-eu no se ejecutó en su ventana de las 03:00 UTC en prod-eu-1. Cron no avisó porque el job nunca corrió.",
      metric: "Detecta omisiones y bloqueos mudos",
    },
  ],
  pt: [
    {
      id: "loop",
      tab: "Loop infinito",
      agent: "Claude Code · checkout-api",
      signal: "5× Bash exit 1 em 84 s",
      shieldStatus: "DISJUNTOR ACIONADO",
      shieldAction: "Bloqueado localmente (<2 ms)",
      tone: "crit",
      cloudNote: "Só metadados: loop_signal + ID com hash",
      terminalLine: "[agenttracking guard] STOP: 5 falhas seguidas no Bash. PreToolUse bloqueado localmente. Zero tokens extras gastos.",
      alertTitle: "Telegram · Loop infinito parado",
      alertBody: "checkout-api falhou 5× no Bash em dev-eu-01. O guard local pausou o turno. Os prompts permaneceram na máquina.",
      metric: "~US$ 40–120 de queima noturna evitados",
    },
    {
      id: "mcp",
      tab: "Drift Shadow MCP",
      agent: "Cursor + Claude · billing-repo",
      signal: "Novo MCP sem versão + CLAUDE.md alterado",
      shieldStatus: "DRIFT DETECTADO",
      shieldAction: "Diff SHA-256 capturado localmente",
      tone: "violet",
      cloudNote: "Apenas hashes e contagens — segredos intocados",
      terminalLine: "[agenttracking audit] HIGH: +1 servidor npx MCP sem versão em .mcp.json · hash de permissões alterado",
      alertTitle: "Slack #sec-agents · Drift de MCP e config",
      alertBody: "billing-repo adicionou 1 MCP sem versão fixa e alterou regras em laptop-sarah. Zero código ou segredos transmitidos.",
      metric: "Conformidade Zero-Prompt (UE / GDPR)",
    },
    {
      id: "wait",
      tab: "Espera silenciosa",
      agent: "Claude Code · nightly-refactor",
      signal: "Aguardando aprovação (18 min)",
      shieldStatus: "ESPERA DETECTADA",
      shieldAction: "Hook Notification roteado na hora",
      tone: "warn",
      cloudNote: "Estado: waiting_input (sem texto do prompt)",
      terminalLine: "[agenttracking hook] session=7a91f3 state=waiting_input tool=Bash elapsed=18m -> alerta enviado",
      alertTitle: "Telegram · Claude aguardando você",
      alertBody: "nightly-refactor em prod-worker-2 aguarda aprovação de ferramenta há 18 min. Abra o terminal ou rode `agenttracking pause`.",
      metric: "Zero sessões noturnas paradas",
    },
    {
      id: "cron",
      tab: "Cron ausente",
      agent: "Cron · db-backup-eu (--every 24h)",
      signal: "Esperado 03:00 UTC · Sem sinal",
      shieldStatus: "EXECUÇÃO PERDIDA",
      shieldAction: "Watchdog dispara sem precisar de erro",
      tone: "crit",
      cloudNote: "Janela excedida + stderr mascarado opcional",
      terminalLine: "[agenttracking wrap] schedule=24h last_ok=2026-11-24T03:00Z status=missed -> alerta para Slack e e-mail",
      alertTitle: "Discord · Cron esperado nunca iniciou",
      alertBody: "db-backup-eu perdeu a janela das 03:00 UTC em prod-eu-1. O cron padrão não avisou porque o job nunca executou.",
      metric: "Detecta pulos silenciosos e travas",
    },
  ],
  fr: [
    {
      id: "loop",
      tab: "Boucle infinie",
      agent: "Claude Code · checkout-api",
      signal: "5× Bash exit 1 en 84 s",
      shieldStatus: "COUPE-CIRCUIT ACTIVÉ",
      shieldAction: "Bloqué localement (<2 ms)",
      tone: "crit",
      cloudNote: "Métadonnées seules : loop_signal + ID haché",
      terminalLine: "[agenttracking guard] STOP: 5 échecs Bash consécutifs. PreToolUse bloqué en local. Zéro token supplémentaire dépensé.",
      alertTitle: "Telegram · Boucle infinie stoppée",
      alertBody: "checkout-api a enchaîné 5 échecs Bash sur dev-eu-01. Le guard local a mis le tour en pause. Aucun prompt n’a quitté le poste.",
      metric: "~40–120 $ de dérive nocturne évités",
    },
    {
      id: "mcp",
      tab: "Dérive Shadow MCP",
      agent: "Cursor + Claude · billing-repo",
      signal: "Nouveau MCP non épinglé + CLAUDE.md modifié",
      shieldStatus: "DÉRIVE DÉTECTÉE",
      shieldAction: "Diff d’empreinte SHA-256 capturé",
      tone: "violet",
      cloudNote: "Empreintes & compteurs seuls — 0 secret lu",
      terminalLine: "[agenttracking audit] HIGH: +1 serveur npx MCP non épinglé dans .mcp.json · hash des permissions modifié",
      alertTitle: "Slack #sec-agents · Dérive MCP & config",
      alertBody: "billing-repo a ajouté 1 MCP non épinglé et modifié les permissions sur laptop-sarah. Zéro code ou secret transmis.",
      metric: "Conformité Zéro-Prompt (UE / RGPD)",
    },
    {
      id: "wait",
      tab: "Attente silencieuse",
      agent: "Claude Code · nightly-refactor",
      signal: "En attente de validation (18 min)",
      shieldStatus: "ATTENTE DÉTECTÉE",
      shieldAction: "Hook Notification envoyé aussitôt",
      tone: "warn",
      cloudNote: "État : waiting_input (aucun texte de prompt)",
      terminalLine: "[agenttracking hook] session=7a91f3 state=waiting_input tool=Bash elapsed=18m -> alerte envoyée",
      alertTitle: "Telegram · Claude vous attend",
      alertBody: "nightly-refactor sur prod-worker-2 attend votre validation depuis 18 min. Ouvrez le terminal ou lancez `agenttracking pause`.",
      metric: "Zéro session nocturne figée",
    },
    {
      id: "cron",
      tab: "Cron manqué",
      agent: "Cron · db-backup-eu (--every 24h)",
      signal: "Attendu 03:00 UTC · Aucun signal",
      shieldStatus: "TÂCHE MANQUÉE",
      shieldAction: "Watchdog déclenché sans code retour",
      tone: "crit",
      cloudNote: "Fenêtre dépassée + stderr masqué optionnel",
      terminalLine: "[agenttracking wrap] schedule=24h last_ok=2026-11-24T03:00Z status=missed -> alerte Slack & e-mail",
      alertTitle: "Discord · Le cron attendu n’a pas démarré",
      alertBody: "db-backup-eu a manqué sa fenêtre de 03:00 UTC sur prod-eu-1. Cron n’a rien envoyé car la tâche n’a jamais tourné.",
      metric: "Détecte les oublis et blocages muets",
    },
  ],
  pl: [
    {
      id: "loop",
      tab: "Pętla błędów",
      agent: "Claude Code · checkout-api",
      signal: "5× Bash exit 1 w 84 s",
      shieldStatus: "BEZPIECZNIK ZADZIAŁAŁ",
      shieldAction: "Zablokowane lokalnie (<2 ms)",
      tone: "crit",
      cloudNote: "Tylko metadane: loop_signal + hash sesji",
      terminalLine: "[agenttracking guard] STOP: 5 kolejnych błędów Bash. PreToolUse zablokowany lokalnie. Zero spalonych tokenów.",
      alertTitle: "Telegram · Pętla błędów zatrzymana",
      alertBody: "checkout-api zaliczył 5 błędów Bash na dev-eu-01. Lokalny guard wstrzymał turę. Prompty zostały na urządzeniu.",
      metric: "~40–120 $ nocnego spalania uniknięte",
    },
    {
      id: "mcp",
      tab: "Dryft Shadow MCP",
      agent: "Cursor + Claude · billing-repo",
      signal: "Nowy nieprzypięty MCP + zmiana CLAUDE.md",
      shieldStatus: "WYKRYTO DRYFT",
      shieldAction: "Przechwycono diff SHA-256",
      tone: "violet",
      cloudNote: "Tylko hashe i liczby — sekrety nietknięte",
      terminalLine: "[agenttracking audit] HIGH: +1 nieprzypięty serwer npx MCP w .mcp.json · zmieniony hash uprawnień",
      alertTitle: "Slack #sec-agents · Dryft MCP i configu",
      alertBody: "billing-repo dodał 1 nieprzypięty MCP i zmienił uprawnienia na laptop-sarah. Zero kodu i sekretów w sieci.",
      metric: "Zgodność Zero-Prompt (UE / RODO)",
    },
    {
      id: "wait",
      tab: "Ciche czekanie",
      agent: "Claude Code · nightly-refactor",
      signal: "Czeka na akceptację (18 min)",
      shieldStatus: "WYKRYTO OCZEKIWANIE",
      shieldAction: "Hook Notification wysłany natychmiast",
      tone: "warn",
      cloudNote: "Stan: waiting_input (bez treści promptu)",
      terminalLine: "[agenttracking hook] session=7a91f3 state=waiting_input tool=Bash elapsed=18m -> alert wysłany",
      alertTitle: "Telegram · Claude czeka na Ciebie",
      alertBody: "nightly-refactor na prod-worker-2 czeka 18 min na zgodę narzędzia. Otwórz terminal lub uruchom `agenttracking pause`.",
      metric: "Zero martwych nocnych sesji",
    },
    {
      id: "cron",
      tab: "Pominięty Cron",
      agent: "Cron · db-backup-eu (--every 24h)",
      signal: "Oczekiwano 03:00 UTC · Brak sygnału",
      shieldStatus: "BRAK URUCHOMIENIA",
      shieldAction: "Watchdog alarmuje bez kodu błędu",
      tone: "crit",
      cloudNote: "Przekroczone okno + maskowany stderr",
      terminalLine: "[agenttracking wrap] schedule=24h last_ok=2026-11-24T03:00Z status=missed -> alert na Slack i e-mail",
      alertTitle: "Discord · Oczekiwany cron nie ruszył",
      alertBody: "db-backup-eu pominął okno 03:00 UTC na prod-eu-1. Zwykły cron milczał, bo zadanie w ogóle nie wystartowało.",
      metric: "Wykrywa ciche pominięcia i zwisy",
    },
  ],
  ja: [
    {
      id: "loop",
      tab: "暴走ループ",
      agent: "Claude Code · checkout-api",
      signal: "84秒で Bash 連続5回失敗",
      shieldStatus: "保護ブレーカー作動",
      shieldAction: "端末上でローカル遮断 (<2 ms)",
      tone: "crit",
      cloudNote: "メタデータのみ: loop_signal + ハッシュID",
      terminalLine: "[agenttracking guard] STOP: Bash連続5回失敗。PreToolUseをローカル遮断。追加トークン消費0。",
      alertTitle: "Telegram · 暴走ループを自動停止",
      alertBody: "dev-eu-01 の checkout-api でBash失敗が5連続発生。ローカルガードがターンを一時停止。プロンプトは端末外へ送信0。",
      metric: "夜間トークン暴走 $40–$120 を防止",
    },
    {
      id: "mcp",
      tab: "Shadow MCP検知",
      agent: "Cursor + Claude · billing-repo",
      signal: "未固定MCP追加 + CLAUDE.md変更",
      shieldStatus: "設定ドリフト検知",
      shieldAction: "SHA-256ハッシュ差分を記録",
      tone: "violet",
      cloudNote: "ハッシュと件数のみ — シークレット読取0",
      terminalLine: "[agenttracking audit] HIGH: .mcp.jsonに未固定npx MCPが1件追加 · 権限ハッシュ変更",
      alertTitle: "Slack #sec-agents · MCP & 設定ドリフト",
      alertBody: "laptop-sarah の billing-repo で未固定MCP追加と権限変更を検知。コードやシークレットは一切送信せず。",
      metric: "ゼロプロンプト準拠 (EU / GDPR)",
    },
    {
      id: "wait",
      tab: "無言の承認待ち",
      agent: "Claude Code · nightly-refactor",
      signal: "ユーザー入力待ち (18分停止)",
      shieldStatus: "承認待ちを検知",
      shieldAction: "Notificationフックで即時通知",
      tone: "warn",
      cloudNote: "状態: waiting_input (プロンプト本文なし)",
      terminalLine: "[agenttracking hook] session=7a91f3 state=waiting_input tool=Bash elapsed=18m -> 通知送信",
      alertTitle: "Telegram · Claudeが承認待ちです",
      alertBody: "prod-worker-2 の nightly-refactor が18分間ツール承認待ちです。端末を確認するか `agenttracking pause` を実行。",
      metric: "夜間の放置セッションをゼロに",
    },
    {
      id: "cron",
      tab: "Cron未起動",
      agent: "Cron · db-backup-eu (--every 24h)",
      signal: "03:00 UTC予定 · 応答なし",
      shieldStatus: "定期実行の欠落",
      shieldAction: "終了コード不要でウォッチドッグ検知",
      tone: "crit",
      cloudNote: "予定枠超過 + 任意のマスク済みstderr",
      terminalLine: "[agenttracking wrap] schedule=24h last_ok=2026-11-24T03:00Z status=missed -> Slack & メール通知",
      alertTitle: "Discord · 予定Cronが起動せず",
      alertBody: "prod-eu-1 の db-backup-eu が03:00 UTC枠で未起動。ジョブ自体が走らないため標準cronは沈黙していました。",
      metric: "無言スキップとハングを確実に検知",
    },
  ],
};

export default function AgentGuardMotion({ lang }: { lang: Locale }) {
  const list = SCENARIOS[lang] ?? SCENARIOS.en;
  const chrome = CHROME[lang] ?? CHROME.en;
  const [activeId, setActiveId] = useState<ScenarioId>("loop");
  const active = list.find((s) => s.id === activeId) ?? list[0];

  const toneColor = active.tone === "crit" ? "#ff6b6b" : active.tone === "warn" ? "#f0c14b" : "#a870e0";

  return (
    <div className="agm-wrap" role="region" aria-label={chrome.aria}>
      <div className="agm-tabs" role="tablist">
        {list.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={s.id === activeId}
            className={`agm-tab${s.id === activeId ? " is-active" : ""}`}
            onClick={() => setActiveId(s.id)}
          >
            <span className={`agm-dot tone-${s.tone}`} aria-hidden="true" />
            {s.tab}
          </button>
        ))}
      </div>

      <div className="agm-stage">
        <svg viewBox="0 0 960 280" className="agm-svg" role="img" aria-label={`${active.tab}: ${active.shieldAction}`}>
          <defs>
            <linearGradient id="agmCyanViolet" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3fd8ca" />
              <stop offset="100%" stopColor="#8b3fca" />
            </linearGradient>
            <linearGradient id="agmZoneBg" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(63,216,202,0.08)" />
              <stop offset="100%" stopColor="rgba(139,63,202,0.05)" />
            </linearGradient>
            <filter id="agmGlow">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Subtle grid */}
          <g stroke="rgba(255,255,255,0.04)" strokeWidth="1">
            <line x1="0" y1="70" x2="960" y2="70" />
            <line x1="0" y1="140" x2="960" y2="140" />
            <line x1="0" y1="210" x2="960" y2="210" />
            <line x1="320" y1="0" x2="320" y2="280" />
            <line x1="640" y1="0" x2="640" y2="280" />
          </g>

          {/* Left Zone: Local Machine */}
          <rect x="16" y="18" width="584" height="244" rx="14" fill="rgba(17,17,17,0.75)" stroke="#262629" strokeDasharray="5 5" />
          <text x="34" y="42" fill="#9a9aa4" fontSize="11" fontFamily="var(--mono)" letterSpacing="1.2">
            {chrome.localZone}
          </text>

          {/* Agent nodes on left */}
          {[
            { y: 66, label: "Claude Code", sub: "PreToolUse / Stop", hit: activeId === "loop" || activeId === "wait" },
            { y: 122, label: "Cursor / Codex / Gemini", sub: "Hooks & MCP configs", hit: activeId === "mcp" },
            { y: 178, label: "Cron / CI / Antigravity", sub: "wrap --every · agy", hit: activeId === "cron" },
          ].map((node) => (
            <g key={node.label}>
              <rect
                x="34"
                y={node.y}
                width="210"
                height="44"
                rx="9"
                fill={node.hit ? "rgba(255,255,255,0.05)" : "#151517"}
                stroke={node.hit ? toneColor : "#2d2d32"}
                strokeWidth={node.hit ? "1.6" : "1"}
              />
              <circle cx="52" cy={node.y + 22} r="4.5" fill={node.hit ? toneColor : "#3fd8ca"} className={node.hit ? "agm-pulse" : undefined} />
              <text x="66" y={node.y + 19} fill="#f0f0f0" fontSize="12.5" fontWeight="600" fontFamily="var(--display)">{node.label}</text>
              <text x="66" y={node.y + 34} fill="#9a9aa4" fontSize="10.5" fontFamily="var(--mono)">{node.sub}</text>
            </g>
          ))}

          {/* Animated tracks: Agents -> Local Shield */}
          <path d="M 244 88 C 296 88, 296 140, 344 140" fill="none" stroke={activeId === "loop" || activeId === "wait" ? toneColor : "#2e2e34"} strokeWidth="2" className="agm-flow" />
          <path d="M 244 144 L 344 144" fill="none" stroke={activeId === "mcp" ? toneColor : "#2e2e34"} strokeWidth="2" className="agm-flow" />
          <path d="M 244 200 C 296 200, 296 148, 344 148" fill="none" stroke={activeId === "cron" ? toneColor : "#2e2e34"} strokeWidth="2" className="agm-flow" />

          {/* Moving pulse dot into shield */}
          <circle r="4.5" fill={toneColor} filter="url(#agmGlow)">
            <animateMotion
              dur="1.8s"
              repeatCount="indefinite"
              path={activeId === "cron" ? "M 244 200 C 296 200, 296 148, 344 148" : activeId === "mcp" ? "M 244 144 L 344 144" : "M 244 88 C 296 88, 296 140, 344 140"}
            />
          </circle>

          {/* Center Local Zero-Prompt Guardrail Gate */}
          <rect x="344" y="64" width="236" height="156" rx="14" fill="url(#agmZoneBg)" stroke="url(#agmCyanViolet)" strokeWidth="1.8" />
          <text x="364" y="90" fill="#3fd8ca" fontSize="11" fontFamily="var(--mono)" letterSpacing="1.2">
            LOCAL GUARD &amp; AUDIT
          </text>
          <text x="364" y="114" fill="#f0f0f0" fontSize="14.5" fontWeight="700" fontFamily="var(--display)">
            {active.shieldStatus}
          </text>
          <text x="364" y="135" fill="#c4c4c8" fontSize="11.5" fontFamily="var(--body)">
            {active.shieldAction}
          </text>

          {/* Status pill inside shield */}
          <rect x="364" y="152" width="196" height="26" rx="6" fill="rgba(6,6,6,0.65)" stroke={toneColor} strokeOpacity="0.65" />
          <text x="376" y="169" fill={toneColor} fontSize="10.5" fontFamily="var(--mono)">
            {active.signal.slice(0, 30)}
          </text>
          <text x="364" y="201" fill="#6ee7a8" fontSize="10.5" fontFamily="var(--mono)">
            ✓ 0 prompts · 0 code · 0 secrets sent
          </text>

          {/* Track: Local Shield -> EU Cloud Monitor */}
          <path d="M 580 142 L 664 142" fill="none" stroke="#3fd8ca" strokeWidth="2" strokeDasharray="6 6" className="agm-flow-slow" />
          <circle r="3.5" fill="#3fd8ca" filter="url(#agmGlow)">
            <animateMotion dur="2.2s" repeatCount="indefinite" path="M 580 142 L 664 142" />
          </circle>

          {/* Privacy boundary divider label */}
          <rect x="594" y="110" width="56" height="20" rx="5" fill="#060606" stroke="#3a3a40" />
          <text x="622" y="123" textAnchor="middle" fill="#9a9aa4" fontSize="9.5" fontFamily="var(--mono)">
            META
          </text>

          {/* Right Zone: EU Fleet & Instant Alerts */}
          <rect x="664" y="18" width="280" height="244" rx="14" fill="#111111" stroke="#2d2d32" />
          <text x="682" y="42" fill="#3fd8ca" fontSize="11" fontFamily="var(--mono)" letterSpacing="1.1">
            {chrome.cloudZone}
          </text>

          {/* Alert Card inside SVG */}
          <rect x="682" y="62" width="244" height="96" rx="10" fill="#18181b" stroke={toneColor} strokeWidth="1.2" />
          <circle cx="698" cy="82" r="4" fill={toneColor} className="agm-pulse" />
          <text x="710" y="86" fill="#f0f0f0" fontSize="11.5" fontWeight="600" fontFamily="var(--display)">
            {active.alertTitle.slice(0, 32)}
          </text>
          <text x="694" y="108" fill="#c4c4c8" fontSize="10.5" fontFamily="var(--body)">
            {active.agent}
          </text>
          <text x="694" y="126" fill="#9a9aa4" fontSize="10" fontFamily="var(--mono)">
            {active.cloudNote.slice(0, 36)}
          </text>
          <text x="694" y="146" fill="#6ee7a8" fontSize="10" fontWeight="600" fontFamily="var(--mono)">
            {active.metric.slice(0, 34)}
          </text>

          {/* Alert channel pills */}
          {["Telegram", "Slack", "Discord", "MCP"].map((ch, idx) => (
            <g key={ch} transform={`translate(${682 + idx * 62}, 174)`}>
              <rect width="56" height="24" rx="6" fill="rgba(63,216,202,0.1)" stroke="rgba(63,216,202,0.3)" />
              <text x="28" y="15.5" textAnchor="middle" fill="#9aeee4" fontSize="10" fontFamily="var(--mono)">{ch}</text>
            </g>
          ))}

          <text x="682" y="226" fill="#9a9aa4" fontSize="10.5" fontFamily="var(--mono)">
            {chrome.freeLine}
          </text>
          <text x="682" y="244" fill="#c4c4c8" fontSize="10.5" fontFamily="var(--mono)">
            GET /api/agents/fleet · MCP get_fleet_status
          </text>
        </svg>

        <div className="agm-footer">
          <code className="agm-term">{active.terminalLine}</code>
          <p className="agm-alert-copy">
            <strong>{active.alertTitle}:</strong> {active.alertBody}
          </p>
        </div>
      </div>
    </div>
  );
}
