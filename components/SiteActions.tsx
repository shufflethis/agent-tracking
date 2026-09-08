"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ActionCopy } from "@/lib/tracking/copy";

/**
 * The buttons of the dashboard: add a site, verify the snippet, toggle the
 * public share, remove a site, tokens, log upload, digest, language, sign
 * out. One fetch each, then a refresh so the server component re-reads the
 * store. Labels arrive as plain strings (ActionCopy) because a client
 * component cannot take functions as props.
 */

async function call(body: Record<string, unknown>): Promise<{ ok: boolean; detail?: string; verified?: boolean; share?: boolean }> {
  const res = await fetch("/api/sites", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  if (!res) return { ok: false, detail: "No connection." };
  return (await res.json().catch(() => ({ ok: false, detail: "Unexpected answer." }))) as { ok: boolean; detail?: string };
}

export function AddSiteForm({ initial = "", c }: { initial?: string; c: ActionCopy }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFailure(null);
    const r = await call({ action: "add", domain: value });
    setBusy(false);
    if (!r.ok) return setFailure(r.detail ?? c.failed);
    router.push(`/app/${encodeURIComponent(value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0])}`);
    router.refresh();
  }

  return (
    <div>
      <form className="scanform" onSubmit={submit}>
        <input type="text" inputMode="url" name="domain" aria-label={c.domainLabel} placeholder="example.com" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? c.adding : c.addSite}
        </button>
      </form>
      {failure ? (
        <p className="formerror" role="alert">
          {failure}
        </p>
      ) : (
        <p className="formnote">
          {c.addNote} <a href="/dpa">{c.dpa}</a> {c.addNoteEnd}
        </p>
      )}
    </div>
  );
}

export function VerifyButton({ domain, c }: { domain: string; c: ActionCopy }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        className="btn ghost"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await call({ action: "verify", domain });
          setBusy(false);
          if (!r.ok) return setNote(r.detail ?? c.couldNotCheck);
          setNote(r.verified ? c.found : (r.detail ?? c.notFound));
          if (r.verified) router.refresh();
        }}
      >
        {busy ? c.checking : c.checkSnippet}
      </button>
      {note ? <span style={{ fontSize: 13, color: "var(--muted)" }}>{note}</span> : null}
    </span>
  );
}

export function ShareToggle({ domain, on, c }: { domain: string; on: boolean; c: ActionCopy }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await call({ action: "share", domain, on: !on });
        setBusy(false);
        router.refresh();
      }}
    >
      {on ? c.makePrivate : c.publish}
    </button>
  );
}

export function RemoveButton({ domain, c, confirmLabel }: { domain: string; c: ActionCopy; confirmLabel: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  return armed ? (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <button
        type="button"
        className="btn"
        style={{ background: "var(--crit)", color: "#111" }}
        onClick={async () => {
          await call({ action: "remove", domain });
          router.push("/app");
          router.refresh();
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="btn ghost" onClick={() => setArmed(false)}>
        {c.keep}
      </button>
    </span>
  ) : (
    <button type="button" className="btn ghost" onClick={() => setArmed(true)}>
      {c.remove}
    </button>
  );
}

/**
 * The API token. Created here, shown once, never shown again: the server
 * keeps a hash. "Replace" mints a new one and the old one stops working.
 */
export function TokenPanel({ hasToken, existsLabel, c }: { hasToken: boolean; existsLabel: string; c: ActionCopy }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const mint = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/token", { method: "POST" });
      const data = (await res.json()) as { ok: boolean; token?: string };
      if (data.ok && data.token) {
        setToken(data.token);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };
  const revoke = async () => {
    setBusy(true);
    try {
      await fetch("/api/token", { method: "DELETE" });
      setToken(null);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };
  if (token) {
    return (
      <div>
        <pre className="code" style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: 10 }}>{token}</pre>
        <p style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: 0 }}>
          <button
            type="button"
            className="btn"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(token);
                setCopied(true);
              } catch {
                /* the token is on screen; selecting it still works */
              }
            }}
          >
            {copied ? c.copied : c.copyToken}
          </button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{c.shownOnce}</span>
        </p>
      </div>
    );
  }
  return (
    <p style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", margin: 0 }}>
      <button type="button" className={hasToken ? "btn ghost" : "btn"} disabled={busy} onClick={mint}>
        {hasToken ? c.replaceToken : c.createToken}
      </button>
      {hasToken ? (
        <>
          <button type="button" className="btn ghost" disabled={busy} onClick={revoke}>
            {c.revoke}
          </button>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>{existsLabel}</span>
        </>
      ) : null}
    </p>
  );
}

/** A log file from the customer's disk, posted as its own body; gzip is fine, the server sniffs it. */
export function LogUpload({ domain, c, lang }: { domain: string; c: ActionCopy; lang: "en" | "de" }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const de = lang === "de";
  return (
    <div>
      <input
        type="file"
        accept=".log,.txt,.gz,text/plain,application/gzip"
        aria-label={c.logFileLabel}
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setNote(`${de ? "Sende" : "Sending"} ${file.name} (${Math.round(file.size / 1024)} KB)`);
          try {
            const res = await fetch(`/api/logs/${encodeURIComponent(domain)}`, { method: "POST", body: file });
            const data = (await res.json()) as { ok: boolean; detail?: string; scanned?: number; skipped?: number; fetches?: number; unverified?: number; bursts?: number };
            if (!data.ok) setNote(data.detail ?? c.failed);
            else {
              setNote(
                de
                  ? `${data.scanned} Zeilen gelesen, ${data.skipped} bereits importiert, ${data.fetches} Agenten-Abrufe, ${data.unverified} unverifiziert, ${data.bursts} Bursts.`
                  : `${data.scanned} lines read, ${data.skipped} already imported, ${data.fetches} agent fetches, ${data.unverified} unverified, ${data.bursts} bursts.`,
              );
              router.refresh();
            }
          } catch {
            setNote(c.noConnection);
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      {note ? <p className="formnote" style={{ marginTop: 8 }}>{note}</p> : null}
    </div>
  );
}

export function DigestToggle({ on, c }: { on: boolean; c: ActionCopy }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="btn ghost"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/digest", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ on: !on }) }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
    >
      {on ? c.digestOff : c.digestOn}
    </button>
  );
}

export function LangSwitch({ lang, labelEn, labelDe }: { lang: "en" | "de"; labelEn: string; labelDe: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const pick = async (next: "en" | "de") => {
    if (next === lang || busy) return;
    setBusy(true);
    await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lang: next }) }).catch(() => null);
    setBusy(false);
    router.refresh();
  };
  const style = (active: boolean) => ({ background: "none", border: 0, padding: 0, cursor: active ? "default" : "pointer", color: active ? "var(--ink)" : "var(--muted)", fontWeight: active ? 600 : 400, fontSize: 13 });
  return (
    <span aria-label="Language" style={{ display: "inline-flex", gap: 6 }}>
      <button type="button" style={style(lang === "en")} onClick={() => pick("en")} aria-pressed={lang === "en"}>
        {labelEn}
      </button>
      <span style={{ color: "var(--muted)" }}>|</span>
      <button type="button" style={style(lang === "de")} onClick={() => pick("de")} aria-pressed={lang === "de"}>
        {labelDe}
      </button>
    </span>
  );
}

export function SignOut({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn ghost"
      style={{ padding: "6px 12px", fontSize: 13 }}
      onClick={async () => {
        await fetch("/api/auth", { method: "DELETE" });
        router.push("/login");
        router.refresh();
      }}
    >
      {label}
    </button>
  );
}
export function CheckoutButton({ plan, label }: { plan: "pro" | "agency"; label: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 8 }}>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) }).catch(() => null);
          const data = res ? ((await res.json().catch(() => ({}))) as { ok?: boolean; url?: string; detail?: string }) : {};
          setBusy(false);
          if (data.ok && data.url) window.location.href = data.url;
          else setNote(data.detail ?? "Checkout is not available.");
        }}
      >
        {busy ? "Opening checkout" : label}
      </button>
      {note ? <span style={{ fontSize: 13, color: "var(--muted)" }}>{note}</span> : null}
    </span>
  );
}
