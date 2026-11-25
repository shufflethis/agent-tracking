import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n";

/**
 * Crisp custom monochrome/accent SVG emblems & icons for coding-agent harnesses,
 * alert channels, failure modes, and security governance cards. Zero external
 * hotlinks, crisp on dark obsidian ground.
 */

export type FeatureIconKind =
  | "loop"
  | "mcp"
  | "wait"
  | "hang"
  | "cron"
  | "shell"
  | "gdpr"
  | "radar"
  | "fuse"
  | "team";

export function FeatureIcon({ kind }: { kind: FeatureIconKind }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  switch (kind) {
    case "loop":
      return (
        <svg {...common}>
          <path d="M17 2l4 4-4 4" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <path d="M7 22l-4-4 4-4" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          <line x1="10" y1="10" x2="14" y2="14" stroke="#ff6b6b" />
        </svg>
      );
    case "mcp":
      return (
        <svg {...common}>
          <polygon points="12 2 20 7 20 17 12 22 4 17 4 7 12 2" />
          <circle cx="12" cy="12" r="2.5" />
          <line x1="12" y1="2" x2="12" y2="9.5" />
          <line x1="20" y1="17" x2="14.2" y2="13.2" />
          <line x1="4" y1="17" x2="9.8" y2="13.2" />
        </svg>
      );
    case "wait":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15.5 14" />
          <circle cx="19" cy="5" r="2.2" fill="#f0c14b" stroke="none" />
        </svg>
      );
    case "hang":
      return (
        <svg {...common}>
          <polyline points="2 12 6 12 9 5 12 19 15 12 22 12" />
        </svg>
      );
    case "cron":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="3" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="M9 15l2 2 4-4" />
        </svg>
      );
    case "shell":
      return (
        <svg {...common}>
          <path d="M12 2l8 4v6c0 5-3.4 9.4-8 10-4.6-.6-8-5-8-10V6l8-4z" />
          <polyline points="8.5 11.5 10.5 13.5 8.5 15.5" />
          <line x1="12.5" y1="15.5" x2="15.5" y2="15.5" />
        </svg>
      );
    case "gdpr":
      return (
        <svg {...common}>
          <rect x="4" y="11" width="16" height="10" rx="2.5" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          <circle cx="12" cy="16" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case "radar":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" strokeOpacity="0.6" />
          <path d="M12 12l6.5-4.5" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "fuse":
      return (
        <svg {...common}>
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case "team":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3.5" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a3.5 3.5 0 0 1 0 6.75" />
        </svg>
      );
  }
}

type LogoItem = { name: string; tag?: string; icon: ReactNode };

const HARNESSES: LogoItem[] = [
  {
    name: "Claude Code",
    tag: "Hooks + Guard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f0c14b" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
        <line x1="12" y1="2.5" x2="12" y2="21.5" />
        <line x1="2.5" y1="12" x2="21.5" y2="12" />
        <line x1="5.2" y1="5.2" x2="18.8" y2="18.8" />
        <line x1="18.8" y1="5.2" x2="5.2" y2="18.8" />
      </svg>
    ),
  },
  {
    name: "Cursor",
    tag: "Hooks + MCP",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3fd8ca" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <polygon points="4 3 20 10.5 13 13 10.5 20 4 3" />
      </svg>
    ),
  },
  {
    name: "Codex CLI",
    tag: "Notify + Wrap",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6ee7a8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="5 8 10 12 5 16" />
        <line x1="12" y1="16" x2="19" y2="16" />
      </svg>
    ),
  },
  {
    name: "Gemini CLI",
    tag: "Hooks + MCP",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a870e0" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2.5C13.2 8.2 15.8 10.8 21.5 12C15.8 13.2 13.2 15.8 12 21.5C10.8 15.8 8.2 13.2 2.5 12C8.2 10.8 10.8 8.2 12 2.5Z" />
      </svg>
    ),
  },
  {
    name: "Antigravity (agy)",
    tag: "Native Hooks",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3fd8ca" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3L20.5 19.5H3.5L12 3Z" />
        <circle cx="12" cy="14" r="2" fill="#a870e0" stroke="none" />
      </svg>
    ),
  },
  {
    name: "Cron & GitHub Actions",
    tag: "--every + --tail",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4c4c8" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 16 14" />
      </svg>
    ),
  },
  {
    name: "OpenTelemetry",
    tag: "OTLP/HTTP",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9aeee4" strokeWidth="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <circle cx="5" cy="6" r="2" />
        <circle cx="19" cy="6" r="2" />
        <circle cx="19" cy="18" r="2" />
        <line x1="6.7" y1="7.3" x2="9.8" y2="10" />
        <line x1="17.3" y1="7.3" x2="14.2" y2="10" />
        <line x1="17.3" y1="16.7" x2="14.2" y2="14" />
      </svg>
    ),
  },
  {
    name: "MCP Protocol",
    tag: "Audit + Drift",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b484f0" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
        <polygon points="12 2.5 20 7.2 20 16.8 12 21.5 4 16.8 4 7.2 12 2.5" />
        <circle cx="12" cy="12" r="2.2" fill="#3fd8ca" stroke="none" />
      </svg>
    ),
  },
];

const CHANNELS: LogoItem[] = [
  {
    name: "Telegram",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3fd8ca" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 3L2.8 10.2l6.7 2.4L18 7l-6.4 7.6 5.9 4.4L21 3z" />
      </svg>
    ),
  },
  {
    name: "Slack",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0c14b" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
        <line x1="9" y1="4" x2="9" y2="20" />
        <line x1="15" y1="4" x2="15" y2="20" />
        <line x1="4" y1="9" x2="20" y2="9" />
        <line x1="4" y1="15" x2="20" y2="15" />
      </svg>
    ),
  },
  {
    name: "Discord",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a870e0" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="4" />
        <circle cx="9.2" cy="12" r="1.2" fill="#a870e0" />
        <circle cx="14.8" cy="12" r="1.2" fill="#a870e0" />
      </svg>
    ),
  },
  {
    name: "Webhooks",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6ee7a8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polygon points="13 2 4 14 12 14 11 22 20 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    name: "Homebrew",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0c14b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 8h10v9a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V8z" />
        <path d="M16 10h2a2 2 0 0 1 0 4h-2" />
        <path d="M7 8c0-2 2-3 4-3s4 1 4 3" />
      </svg>
    ),
  },
];

const STRIP_COPY: Record<Locale, { aria: string; label: string; chLabel: string }> = {
  en: { aria: "Supported coding agents and alert channels", label: "Works out of the box with your entire agent stack", chLabel: "Free instant alerts & install:" },
  de: { aria: "Unterstützte Coding-Agents und Alert-Kanäle", label: "Funktioniert direkt mit deinem gesamten Agent-Stack", chLabel: "Kostenlose Sofort-Alerts & Install:" },
  es: { aria: "Agentes de código y canales de alerta compatibles", label: "Funciona al instante con todo tu stack de agentes", chLabel: "Alertas instantáneas gratis e instalación:" },
  pt: { aria: "Agentes de código e canais de alerta suportados", label: "Funciona imediatamente com toda a sua stack de agentes", chLabel: "Alertas instantâneos grátis e instalação:" },
  fr: { aria: "Agents de code et canaux d’alerte pris en charge", label: "Fonctionne immédiatement avec toute votre stack d’agents", chLabel: "Alertes instantanées gratuites & install :" },
  pl: { aria: "Obsługiwane agenty kodujące i kanały alertów", label: "Działa od ręki z całym Twoim stackiem agentów", chLabel: "Darmowe alerty na żywo i instalacja:" },
  ja: { aria: "対応コーディングエージェントと通知チャネル", label: "お使いのエージェント環境全体にそのまま対応", chLabel: "無料即時通知 & インストール:" },
};

export function HarnessStrip({ lang }: { lang: Locale }) {
  const s = STRIP_COPY[lang] ?? STRIP_COPY.en;
  return (
    <section className="shell hstrip" aria-label={s.aria}>
      <p className="hstrip-label">{s.label}</p>
      <ul className="hstrip-grid">
        {HARNESSES.map((item) => (
          <li key={item.name} className="hstrip-pill">
            <span className="hstrip-ico">{item.icon}</span>
            <span className="hstrip-name">{item.name}</span>
            {item.tag ? <span className="hstrip-tag">{item.tag}</span> : null}
          </li>
        ))}
      </ul>
      <div className="hstrip-channels">
        <span className="hstrip-ch-label">{s.chLabel}</span>
        {CHANNELS.map((ch) => (
          <span key={ch.name} className="hstrip-ch">
            {ch.icon}
            {ch.name}
          </span>
        ))}
      </div>
    </section>
  );
}
