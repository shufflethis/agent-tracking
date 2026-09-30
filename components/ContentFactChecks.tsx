"use client";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ContentCapture, ContentCheck } from "@/lib/tracking/content-checks";
import { compareContentCaptures } from "@/lib/tracking/content-comparison";

type Props = { domain: string; lang: "de" | "en"; owner: boolean; checks: ContentCheck[]; captures: ContentCapture[] };

export default function ContentFactChecks({ domain, lang, owner, checks, captures }: Props) {
  const de = lang === "de";
  const router = useRouter();
  const copy = de ? {
    title: "Faktenzugänglichkeit pro Seite", intro: "Prüfe, ob erwartete Textstellen in einer bereitgestellten HTML-Aufnahme vorkommen. Das belegt keine inhaltliche Richtigkeit, KI-Verständnis, Zitate oder Agentenerfolg.",
    path: "Seitenpfad", label: "Name des Fakts", expected: "Erwarteter Text", alternatives: "Textalternativen (eine pro Zeile, optional)", add: "Fakt anlegen", page: "Seite", checkLabel: "Fakt", checksTitle: "Faktenchecks", noChecks: "Lege einen Fakt an, bevor du eine Aufnahme prüfst.",
    captureTitle: "Prüfaufnahme", version: "Content-Version", file: "HTML-Datei (maximal 256 KiB)", run: "Aufnahme prüfen und speichern", sourceNote: "Die HTML-Aufnahme wird privat gespeichert und nach 90 Tagen gelöscht. Hash, Version, Ergebnisse und kurze Textbelege bleiben für den Versionsvergleich erhalten.",
    history: "Gespeicherte Ergebnisse", empty: "Noch keine Aufnahmen.", versionCol: "Content-Version", method: "Prüfmethode", capturedAt: "Aufgenommen", hash: "SHA-256", evidence: "Textbeleg", matched: "Gefunden als", found: "Gefunden", missing: "Nicht gefunden", unknown: "Nicht prüfbar",
    compare: "Versionen derselben Seite vergleichen", before: "Vorher", after: "Nachher", samePage: "Wähle zwei unterschiedliche Content-Versionen derselben Seite.", noShared: "Diese Aufnahmen enthalten keine gemeinsamen unveränderten Faktenchecks.", changed: "Änderung", methodChanged: "Die Prüfmethode hat sich geändert.", verifierChanged: "Die Prüfer-Version hat sich geändert.", checksChanged: "Die Prüfkriterien unterscheiden sich. Verglichen werden nur gemeinsame unveränderte Checks.", uncheckablePair: "Mindestens eine Aufnahme enthält nicht prüfbare Ergebnisse. Das ist kein bestandener Check.", reader: "Leserechte: Faktenchecks und Ergebnisse ansehen. Nur der Site-Owner kann neue Checks oder Aufnahmen speichern.",
    required: "Pfad, Version, Label und Erwartungstext angeben.", select: "HTML-Datei auswählen.", large: "Die Datei überschreitet 256 KiB.", invalidFile: "Die HTML-Datei konnte nicht als UTF-8 gelesen werden.", failed: "Die Anfrage ist fehlgeschlagen.", loading: "Wird gespeichert…", malformed: "Kein prüfbarer sichtbarer Text oder Aufnahme nicht auswertbar",
  } : {
    title: "Page-level fact accessibility", intro: "Check whether expected text appears in a supplied HTML capture. This does not establish factual correctness, AI understanding, citations, or agent success.",
    path: "Page path", label: "Fact label", expected: "Expected text", alternatives: "Alternative text (one per line, optional)", add: "Add fact check", page: "Page", checkLabel: "Fact", checksTitle: "Fact checks", noChecks: "Add a fact before checking a capture.",
    captureTitle: "Test capture", version: "Content version", file: "HTML file (up to 256 KiB)", run: "Check and save capture", sourceNote: "The HTML capture is stored privately and deleted after 90 days. Its hash, version, results, and short text evidence remain for version comparisons.",
    history: "Saved results", empty: "No captures yet.", versionCol: "Content version", method: "Check method", capturedAt: "Captured", hash: "SHA-256", evidence: "Text evidence", matched: "Matched as", found: "Found", missing: "Not found", unknown: "Uncheckable",
    compare: "Compare versions of the same page", before: "Before", after: "After", samePage: "Select two distinct content versions of the same page.", noShared: "These captures contain no shared unchanged fact checks.", changed: "Change", methodChanged: "The check method has changed.", verifierChanged: "The verifier version has changed.", checksChanged: "The check criteria differ. Only shared unchanged checks are compared.", uncheckablePair: "At least one capture contains uncheckable results. This is not a passed check.", reader: "Readers can view checks and results. Only the site owner can save new checks or captures.",
    required: "Enter a page path, version, label, and expected text.", select: "Select an HTML file.", large: "The file exceeds 256 KiB.", invalidFile: "The HTML file could not be read as UTF-8.", failed: "The request failed.", loading: "Saving…", malformed: "No checkable visible text or capture could not be processed",
  };
  const [pagePath, setPagePath] = useState("/");
  const [label, setLabel] = useState("");
  const [expectedText, setExpectedText] = useState("");
  const [alternatives, setAlternatives] = useState("");
  const [contentVersion, setContentVersion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");

  const beforeCapture = captures.find((capture) => capture.runId === beforeId);
  const afterCapture = captures.find((capture) => capture.runId === afterId);
  const comparison = useMemo(() => beforeCapture && afterCapture ? compareContentCaptures(beforeCapture, afterCapture) : null, [beforeCapture, afterCapture]);

  async function submit(action: "create" | "capture", body: Record<string, unknown>) {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/content-checks/${encodeURIComponent(domain)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, ...body }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? copy.failed);
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.failed);
      return false;
    } finally { setBusy(false); }
  }

  async function addCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pagePath.trim() || !label.trim() || !expectedText.trim()) { setError(copy.required); return; }
    if (await submit("create", { pagePath, label, expectedText, alternatives: alternatives.split("\n").map((v) => v.trim()).filter(Boolean) })) {
      setLabel(""); setExpectedText(""); setAlternatives("");
    }
  }

  async function runCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!file) { setError(copy.select); return; }
    if (file.size > 256 * 1024) { setError(copy.large); return; }
    if (!pagePath.trim() || !contentVersion.trim()) { setError(copy.required); return; }
    let html: string;
    try { html = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()); }
    catch { setError(copy.invalidFile); return; }
    if (new TextEncoder().encode(html).byteLength > 256 * 1024) { setError(copy.large); return; }
    if (await submit("capture", { runId: crypto.randomUUID(), pagePath, contentVersion, html })) {
      setFile(null);
      const input = form.elements.namedItem("capture-file");
      if (input instanceof HTMLInputElement) input.value = "";
    }
  }

  const statusText = (value: ContentCapture["results"][number]["status"]) => value === "found" ? copy.found : value === "not_found" ? copy.missing : copy.unknown;
  const capturePathOptions = [...new Set(checks.map((check) => check.pagePath))];
  const validPair = beforeCapture && afterCapture && comparison?.valid;

  return <section className="card" style={{ padding: 28, display: "grid", gap: 22 }} id="content-fact-checks">
    <div><h2>{copy.title}</h2><p>{copy.intro}</p>{!owner && <p>{copy.reader}</p>}</div>
    {owner && <>
      <form onSubmit={addCheck} style={{ display: "grid", gap: 12, maxWidth: 700 }}>
        <h3>{copy.add}</h3>
        <label>{copy.path}<input required maxLength={2048} value={pagePath} onChange={(event) => setPagePath(event.target.value)} placeholder="/pricing" /></label>
        <label>{copy.label}<input required maxLength={100} value={label} onChange={(event) => setLabel(event.target.value)} /></label>
        <label>{copy.expected}<textarea required maxLength={240} value={expectedText} onChange={(event) => setExpectedText(event.target.value)} /></label>
        <label>{copy.alternatives}<textarea maxLength={1204} value={alternatives} onChange={(event) => setAlternatives(event.target.value)} /></label>
        <button className="btn" disabled={busy} type="submit">{copy.add}</button>
      </form>

      <form onSubmit={runCapture} style={{ display: "grid", gap: 12, maxWidth: 700 }}>
        <h3>{copy.captureTitle}</h3>
        <label>{copy.page}<select required value={pagePath} onChange={(event) => setPagePath(event.target.value)}>{capturePathOptions.map((path) => <option key={path} value={path}>{path}</option>)}{!capturePathOptions.length && <option value="/">/</option>}</select></label>
        <label>{copy.version}<input required maxLength={100} value={contentVersion} onChange={(event) => setContentVersion(event.target.value)} placeholder="release-2026-09-30" /></label>
        <label>{copy.file}<input required name="capture-file" type="file" accept=".html,.htm,text/html" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <button className="btn" disabled={busy || checks.length === 0} type="submit">{busy ? copy.loading : copy.run}</button>
        <p style={{ fontSize: 13, color: "var(--muted)" }}>{copy.sourceNote}</p>
      </form>
      {error && <p role="alert" className="formerror">{error}</p>}
    </>}

    <div><h3>{copy.checksTitle}</h3>{checks.length === 0 ? <p>{copy.noChecks}</p> : checks.map((check) => <article key={check.checkId} style={{ borderTop: "1px solid var(--rule)", paddingTop: 12, marginTop: 12 }}>
      <strong>{check.label}</strong><p><code>{check.pagePath}</code> · {check.expectedText}</p>{check.alternatives.length > 0 && <p>{de ? "Alternativen" : "Alternatives"}: {check.alternatives.join(" · ")}</p>}
    </article>)}</div>

    <div><h3>{copy.history}</h3>{captures.length === 0 ? <p>{copy.empty}</p> : captures.map((capture) => <article key={capture.runId} id={`content-capture-${capture.runId}`} style={{ borderTop: "1px solid var(--rule)", paddingTop: 14, marginTop: 14 }}>
      <p><strong>{capture.pagePath}</strong> · {copy.versionCol}: <code>{capture.contentVersion}</code></p>
      <p style={{ fontSize: 13, color: "var(--muted)" }}>{copy.capturedAt}: {new Date(capture.capturedAt).toISOString()} · {copy.method}: <code>{capture.method}/{capture.verifierVersion}</code></p>
      <p style={{ fontSize: 12, color: "var(--muted)", overflowWrap: "anywhere" }}>{copy.hash}: <code>{capture.contentHash}</code></p>
      {capture.results.map((result) => <div key={result.checkId} style={{ margin: "12px 0" }}>
        <strong>{result.label}: {statusText(result.status)}</strong>
        <p>{copy.expected}: {result.expectedText}</p>
        {result.matchedText && <p>{copy.matched}: <code>{result.matchedText}</code></p>}
        {result.evidence && <blockquote style={{ margin: "8px 0", borderLeft: "2px solid var(--line)", paddingLeft: 12 }}><small>{copy.evidence}: {result.evidence}</small></blockquote>}
        {result.status === "uncheckable" && <p>{copy.malformed}.</p>}
      </div>)}
    </article>)}</div>

    {captures.length >= 2 && <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 16 }}>
      <h3>{copy.compare}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
        <label>{copy.before}<select value={beforeId} onChange={(event) => setBeforeId(event.target.value)}><option value="">–</option>{captures.map((capture) => <option key={capture.runId} value={capture.runId}>{capture.pagePath} · {capture.contentVersion}</option>)}</select></label>
        <label>{copy.after}<select value={afterId} onChange={(event) => setAfterId(event.target.value)}><option value="">–</option>{captures.map((capture) => <option key={capture.runId} value={capture.runId}>{capture.pagePath} · {capture.contentVersion}</option>)}</select></label>
      </div>
      {beforeCapture && afterCapture && !validPair && <p>{copy.samePage}</p>}
      {validPair && <>
        <p>{copy.method}: {beforeCapture.method}/{beforeCapture.verifierVersion} → {afterCapture.method}/{afterCapture.verifierVersion}</p>
        {comparison.methodChanged && <p>{copy.methodChanged}</p>}
        {comparison.verifierChanged && <p>{copy.verifierChanged}</p>}
        {comparison.checksChanged && <p>{copy.checksChanged}</p>}
        {comparison.uncheckable && <p>{copy.uncheckablePair}</p>}
        {comparison.rows.length === 0 ? <p>{copy.noShared}</p> : comparison.rows.map(({ old, next }) => <p key={old.checkId}><strong>{old.label}</strong>: {statusText(old.status)} → {statusText(next.status)}{old.status !== next.status ? ` · ${copy.changed}` : ""}</p>)}
      </>}
    </div>}
  </section>;
}
