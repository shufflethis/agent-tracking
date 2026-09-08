"use client";

import { useState } from "react";

/**
 * Share links for a public stats page. Plain anchors to the intent URLs, so
 * they work without JavaScript; no SDK, no widget, no third-party script.
 */
export default function ShareBar({ url, text, labels }: { url: string; text: string; labels: { x: string; linkedin: string; copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  const x = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Nothing to recover: the address is in the location bar.
    }
  };

  return (
    <p style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: 0 }}>
      <a className="btn" href={x} target="_blank" rel="noopener">
        {labels.x}
      </a>
      <a className="btn ghost" href={linkedin} target="_blank" rel="noopener">
        {labels.linkedin}
      </a>
      <button type="button" className="btn ghost" onClick={copyLink} aria-live="polite">
        {copied ? labels.copied : labels.copy}
      </button>
    </p>
  );
}
