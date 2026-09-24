"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TaskRunForm({ domain, lang }: { domain: string; lang: "de" | "en" }) {
  const router = useRouter();
  const [target, setTarget] = useState(`https://staging.${domain}/contact`);
  const [release, setRelease] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setResult(null);
    try {
      const response = await fetch(`/api/task-runs/${encodeURIComponent(domain)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ runId: crypto.randomUUID(), targetUrl: target, mode: "deterministic_browser", releaseId: release || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Run failed");
      setResult(`${data.run.runId}: ${data.run.result ?? data.run.status}`);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Run failed"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 650 }}>
    <label>{lang === "de" ? "Test-/Staging-URL" : "Test/staging URL"}<input required type="url" value={target} onChange={(event) => setTarget(event.target.value)} /></label>
    <label>{lang === "de" ? "Release-ID (optional, 16–64 Zeichen)" : "Release ID (optional, 16–64 characters)"}<input value={release} onChange={(event) => setRelease(event.target.value)} /></label>
    <button className="btn" disabled={busy} type="submit">{busy ? (lang === "de" ? "Läuft…" : "Running…") : (lang === "de" ? "Browserprüfung starten" : "Run browser check")}</button>
    {error && <p role="alert" className="formerror">{error}</p>}
    {result && <p role="status">{result}</p>}
  </form>;
}
