"use client";

import { useState } from "react";

/**
 * Copies a string. The text is rendered on the server and passed in, so what
 * is on screen is what gets copied even if this never hydrates. Nothing is
 * recorded: a copy is not an event anyone needs to count.
 */
export default function CopyButton({ text, label, copiedLabel, ghost = true }: { text: string; label: string; copiedLabel: string; ghost?: boolean }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (insecure context, permission policy).
      // The text is on screen and selectable, so there is nothing to recover.
    }
  };

  return (
    <button type="button" className={ghost ? "btn ghost" : "btn"} onClick={copy} aria-live="polite" style={{ fontSize: 14, padding: "10px 16px" }}>
      {copied ? copiedLabel : label}
    </button>
  );
}
