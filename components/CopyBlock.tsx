import CopyButton from "@/components/CopyButton";
import { t, type Locale } from "@/lib/i18n";

/**
 * A terminal command or a prompt to paste into Claude Code, drawn as a small
 * window: label and copy button in the title bar, the text below. The text is
 * rendered on the server, so what is on screen is exactly what gets copied,
 * and it stays selectable without script. The "$" in front of a command is a
 * pseudo-element, so it is never copied.
 */
export default function CopyBlock({ label, text, lang, hint, kind }: { label: string; text: string; lang: Locale; hint?: string; kind?: "terminal" | "prompt" }) {
  const d = t(lang);
  const k = kind ?? (/claude/i.test(label) ? "prompt" : "terminal");
  const oneCommand = k === "terminal" && !text.includes("\n");
  return (
    <div className={`copyblock copyblock--${k}`}>
      <div className="copyblock-win">
        <div className="copyblock-bar">
          <span className="copyblock-label">
            <span className="copyblock-icon" aria-hidden="true">{k === "terminal" ? ">_" : "✳"}</span>
            {label}
          </span>
          <CopyButton className="copyblock-btn" text={text} label={d.copy} copiedLabel={d.copied} />
        </div>
        <pre className={`copyblock-body${oneCommand ? " is-cmd" : ""}`}>{text}</pre>
      </div>
      {hint ? <p className="copyblock-hint">{hint}</p> : null}
    </div>
  );
}
