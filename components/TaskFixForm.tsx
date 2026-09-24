"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function TaskFixForm({ domain, lang, runIds }: { domain: string; lang: "de" | "en"; runIds: string[] }) {
  const router = useRouter();
  const [before, setBefore] = useState("");
  const [after, setAfter] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/task-fixes/${encodeURIComponent(domain)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ fixId: crypto.randomUUID(), beforeRunId: before, afterRunId: after, description }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.detail ?? "Invalid comparison");
      setBefore(""); setAfter(""); setDescription(""); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid comparison"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} style={{ display: "grid", gap: 12, maxWidth: 650 }}>
    <label>{lang === "de" ? "Fehlerlauf" : "Before run"}<select required value={before} onChange={(event) => setBefore(event.target.value)}><option value="">–</option>{runIds.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
    <label>{lang === "de" ? "Nachtest" : "After run"}<select required value={after} onChange={(event) => setAfter(event.target.value)}><option value="">–</option>{runIds.map((id) => <option key={id} value={id}>{id}</option>)}</select></label>
    <label>{lang === "de" ? "Dokumentierte Korrektur" : "Documented fix"}<textarea required maxLength={1000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <button className="btn" type="submit" disabled={busy}>{lang === "de" ? "Korrektur verknüpfen" : "Link fix"}</button>
    {error && <p role="alert" className="formerror">{error}</p>}
  </form>;
}
