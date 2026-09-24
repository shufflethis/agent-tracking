"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SiteAccessPanel({ domain, lang, initial }: { domain: string; lang: "de" | "en"; initial: { readers: { email: string }[]; invites: { inviteId: string; email: string; expiresAt: number }[] } }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function invite(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(null); setLink(null);
    try {
      const response = await fetch(`/api/site-access/${encodeURIComponent(domain)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail ?? "Invitation failed");
      setLink(`${location.origin}/app/invite/${encodeURIComponent(data.invite.token)}`); setEmail(""); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invitation failed"); }
    finally { setBusy(false); }
  }
  async function revoke(body: Record<string, string>) {
    setBusy(true); setError(null);
    try {
      const response = await fetch(`/api/site-access/${encodeURIComponent(domain)}`, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error("Revocation failed");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Revocation failed"); }
    finally { setBusy(false); }
  }
  return <div style={{ display: "grid", gap: 12 }}>
    <form onSubmit={invite} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="reader@example.com" /><button className="btn" type="submit" disabled={busy}>{lang === "de" ? "Leselink erstellen" : "Create read link"}</button></form>
    {link && <div><p>{lang === "de" ? "Link jetzt kopieren; er wird nur einmal angezeigt und läuft nach sieben Tagen ab. Keine E-Mail wurde versendet." : "Copy this link now; it is shown once and expires in seven days. No email was sent."}</p><pre className="code" style={{ overflowWrap: "anywhere" }}>{link}</pre><button type="button" className="btn ghost" onClick={() => navigator.clipboard.writeText(link)}>{lang === "de" ? "Kopieren" : "Copy"}</button></div>}
    {initial.readers.map((reader) => <div key={reader.email}>{reader.email} · {lang === "de" ? "Leserecht" : "Reader"} <button type="button" className="btn ghost" disabled={busy} onClick={() => revoke({ email: reader.email })}>{lang === "de" ? "Widerrufen" : "Revoke"}</button></div>)}
    {initial.invites.map((invite) => <div key={invite.inviteId}>{invite.email} · {lang === "de" ? "Link gültig bis" : "Link expires"} {new Date(invite.expiresAt).toISOString().slice(0, 10)} <button type="button" className="btn ghost" disabled={busy} onClick={() => revoke({ inviteId: invite.inviteId })}>{lang === "de" ? "Widerrufen" : "Revoke"}</button></div>)}
    {error && <p role="alert" className="formerror">{error}</p>}
  </div>;
}
