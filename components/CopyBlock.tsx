import CopyButton from "@/components/CopyButton";

/**
 * A labelled block of text with a copy button: a terminal command or a prompt
 * to paste into Claude Code. The text is rendered on the server, so what is on
 * screen is exactly what gets copied, and it stays selectable without script.
 */
export default function CopyBlock({ label, text, lang, hint }: { label: string; text: string; lang: "en" | "de"; hint?: string }) {
  const de = lang === "de";
  return (
    <div className="copyblock">
      <div className="copyblock-head">
        <span className="smallcaps">{label}</span>
        <CopyButton text={text} label={de ? "Kopieren" : "Copy"} copiedLabel={de ? "Kopiert" : "Copied"} />
      </div>
      <pre className="code">{text}</pre>
      {hint ? <p className="formnote" style={{ marginTop: -12 }}>{hint}</p> : null}
    </div>
  );
}
