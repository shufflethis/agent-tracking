"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InviteAccept({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return <div><button className="btn" type="button" disabled={busy} onClick={async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? "Invitation failed");
      router.push(`/app/${encodeURIComponent(result.domain)}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Invitation failed"); }
    finally { setBusy(false); }
  }}>Accept read access</button>{error && <p role="alert" className="formerror">{error}</p>}</div>;
}
