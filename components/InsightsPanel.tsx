import Link from "next/link";
import type { Insight } from "@/lib/tracking/insights";

export default function InsightsPanel({ items, lang, domain, days, compact = false }: { items: Insight[]; lang: "en" | "de"; domain: string; days: number; compact?: boolean }) {
  const de = lang === "de", base = `/app/${encodeURIComponent(domain)}`;
  const labels = de ? { check_first: "Zuerst prüfen", investigate: "Untersuchen", setup: "Messung ergänzen" } : { check_first: "Check first", investigate: "Investigate", setup: "Complete measurement" };
  return <section aria-labelledby="insights-title" className="card" style={{ padding: 28 }}>
    <p className="eyebrow">Insights · {days} {de ? "Tage" : "days"}</p>
    <h2 id="insights-title">{de ? "Was braucht deine Aufmerksamkeit?" : "What needs your attention?"}</h2>
    <p style={{ color: "var(--ink-2)" }}>{de ? "Messlücken zuerst, dann beobachtete Fehler und offene Nachtests. Die Reihenfolge schätzt keinen Umsatzverlust." : "Measurement gaps first, then observed failures and pending retests. This order does not estimate lost revenue."}</p>
    {items.length ? <div style={{ display: "grid", gap: 16 }}>{(compact ? items.slice(0, 3) : items).map(item => <article key={item.id} style={{ borderTop: "1px solid var(--rule)", paddingTop: 16 }}>
      <p className="smallcaps">{labels[item.priority]}</p><h3 style={{ fontSize: 18 }}>{item.title}</h3>
      <p>{item.evidence}</p><p><Link href={item.href}>{item.action} →</Link></p>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>{item.boundary}</p>
    </article>)}</div> : <p>{de ? "Für die geprüften Quellen liegen keine passenden Hinweise vor. Das ist keine Bestätigung, dass alle Abläufe funktionieren. Starte einen vorbereiteten Test, um einen konkreten Anfrageweg zu prüfen." : "No matching issues were found in the checked sources. This does not confirm that every flow works. Run a prepared test to check a specific inquiry path."} <Link href={`${base}/tests`}>{de ? "Anfrage-Test öffnen" : "Open inquiry test"} →</Link></p>}
    {compact && <p style={{ marginBottom: 0 }}><Link href={`${base}/insights`}>{de ? `Alle Hinweise (${items.length}) und Erkenntnisse` : `All issues (${items.length}) and checked fixes`} →</Link></p>}
  </section>;
}
