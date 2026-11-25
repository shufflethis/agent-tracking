"use client";

import { useState } from "react";
import CopyButton from "@/components/CopyButton";

export type QuickstartTab = {
  id: string;
  tabLabel: string;
  badge?: string;
  kind: "terminal" | "prompt";
  text: string;
  hint: string;
};

/**
 * Compact tabbed quickstart window for the hero section: keeps Offline Audit,
 * Connect All, and the Claude Code setup prompt one click away without stacking
 * three tall terminal blocks above the fold.
 */
export default function HeroQuickstart({ tabs, lang }: { tabs: QuickstartTab[]; lang: "en" | "de" }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id ?? "audit");
  const de = lang === "de";
  const current = tabs.find((t) => t.id === activeId) ?? tabs[0];
  if (!current) return null;

  const oneCommand = current.kind === "terminal" && !current.text.includes("\n");

  return (
    <div className={`hq copyblock copyblock--${current.kind}`}>
      <div className="copyblock-win hq-win">
        <div className="hq-bar">
          <div className="hq-tabs" role="tablist" aria-label={de ? "Schnellstart-Optionen" : "Quickstart options"}>
            {tabs.map((tab) => {
              const selected = tab.id === current.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={`hq-tab${selected ? " is-active" : ""}`}
                  onClick={() => setActiveId(tab.id)}
                >
                  <span className="hq-tab-ico" aria-hidden="true">
                    {tab.kind === "terminal" ? ">_" : "✳"}
                  </span>
                  <span>{tab.tabLabel}</span>
                  {tab.badge ? <span className="hq-tab-badge">{tab.badge}</span> : null}
                </button>
              );
            })}
          </div>
          <CopyButton
            className="copyblock-btn"
            text={current.text}
            label={de ? "Kopieren" : "Copy"}
            copiedLabel={de ? "Kopiert ✓" : "Copied ✓"}
          />
        </div>
        <pre className={`copyblock-body hq-body${oneCommand ? " is-cmd" : ""}`}>{current.text}</pre>
      </div>
      <p className="copyblock-hint hq-hint">{current.hint}</p>
    </div>
  );
}
