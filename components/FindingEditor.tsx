"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Finding } from "@/lib/tracking/findings";
import { DIAGNOSTIC_RECIPES } from "@/lib/tracking/diagnostic-recipes";

const categories = ["form_discovery", "tool_schema", "tool_execution", "navigation", "verification", "outcome_linkage", "other"];
const statuses = ["open", "in_progress", "fixed", "retest_confirmed"];
export default function FindingEditor({ domain, runs, fixes, initial, lang }: { domain: string; runs: string[]; fixes: string[]; initial?: Finding; lang: "de" | "en" }) {
  const router = useRouter();
  const [taskRunId, setTaskRunId] = useState(initial?.taskRunId ?? "");
  const [fixId, setFixId] = useState(initial?.fixId ?? "");
  const [category, setCategory] = useState<string>(initial?.category ?? "form_discovery");
  const [recipeId, setRecipeId] = useState(initial?.recipeId ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [assignee, setAssignee] = useState(initial?.assignee ?? "");
  const [status, setStatus] = useState<string>(initial?.status ?? "open");
  const [correction, setCorrection] = useState(initial?.correction ?? "");
  const [retestRunId, setRetestRunId] = useState(initial?.retestRunId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/findings/${encodeURIComponent(domain)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ findingId: initial?.findingId ?? crypto.randomUUID(), taskRunId, fixId: fixId || null, recipeId: recipeId || null, evidenceRefs: initial?.evidenceRefs ?? [`run:${taskRunId}`], category, description, assignee: assignee || null, status, correction: correction || null, retestRunId: retestRunId || null }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Save failed");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Save failed"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={save} style={{ display: "grid", gap: 10, maxWidth: 700 }}>
    <label>{lang === "de" ? "Aufgabenlauf / Evidenz" : "Task run / evidence"}<select required value={taskRunId} onChange={(event) => setTaskRunId(event.target.value)}><option value="">–</option>{runs.map((id) => <option key={id}>{id}</option>)}</select></label>
    <label>{lang === "de" ? "Kategorie" : "Category"}<select value={category} onChange={(event) => { setCategory(event.target.value); setRecipeId(""); }}>{categories.map((c) => <option key={c}>{c}</option>)}</select></label>
    <label>{lang === "de" ? "Rezeptvorschlag (optional)" : "Suggested recipe (optional)"}<select value={recipeId} onChange={(event) => setRecipeId(event.target.value)}><option value="">–</option>{DIAGNOSTIC_RECIPES.filter((r) => r.category === category).map((r) => <option key={r.id} value={r.id}>{r.title} · v{r.version}</option>)}</select></label>
    <label>{lang === "de" ? "Befund" : "Finding"}<textarea required maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} /></label>
    <label>{lang === "de" ? "Verantwortliche E-Mail (optional)" : "Assignee email (optional)"}<input type="email" value={assignee} onChange={(event) => setAssignee(event.target.value)} /></label>
    <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}>{statuses.map((s) => <option key={s}>{s}</option>)}</select></label>
    <label>{lang === "de" ? "Korrektur" : "Correction"}<textarea maxLength={2000} value={correction} onChange={(event) => setCorrection(event.target.value)} /></label>
    <label>Fix ID<select value={fixId ?? ""} onChange={(event) => setFixId(event.target.value)}><option value="">–</option>{fixes.map((id) => <option key={id}>{id}</option>)}</select></label>
    <label>{lang === "de" ? "Nachtest-Run" : "Retest run"}<select value={retestRunId ?? ""} onChange={(event) => setRetestRunId(event.target.value)}><option value="">–</option>{runs.map((id) => <option key={id}>{id}</option>)}</select></label>
    <button type="submit" className="btn" disabled={busy}>{lang === "de" ? "Befund speichern" : "Save finding"}</button>
    {error && <p role="alert" className="formerror">{error}</p>}
  </form>;
}
