"use client";

import { safeNext } from "@/lib/safe-next";
import { useState } from "react";

export type LoginLabels = { emailLabel: string; placeholder: string; sending: string; submit: string; failed: string; checkInbox: string; onItsWay: string };

/** Address in, link out. The rest happens in the email. Labels come in as strings; {email} in onItsWay is replaced. */
export default function LoginForm({ next, domain, lang = "en", labels }: { next?: string; domain?: string; lang?: "en" | "de"; labels: LoginLabels }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "working" | "sent">("idle");
  const [failure, setFailure] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("working");
    setFailure(null);
    const form = new FormData(event.currentTarget);
    const target = domain ? `/app?add=${encodeURIComponent(domain)}` : safeNext(next);
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: form.get("email"), company: form.get("company"), next: target, lang }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !data.ok) {
      setState("idle");
      setFailure(data.detail ?? labels.failed);
      return;
    }
    setState("sent");
  }

  if (state === "sent") {
    const [before, after] = labels.onItsWay.split("{email}");
    return (
      <div role="status">
        <p className="eyebrow" style={{ color: "var(--good)" }}>{labels.checkInbox}</p>
        <p style={{ color: "var(--ink-2)", margin: 0 }}>
          {before}
          <b>{email}</b>
          {after}
        </p>
      </div>
    );
  }

  return (
    <form className="gateform" onSubmit={submit}>
      <input
        type="email"
        name="email"
        inputMode="email"
        autoComplete="email"
        required
        aria-label={labels.emailLabel}
        placeholder={labels.placeholder}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (failure) setFailure(null);
        }}
      />
      <div aria-hidden="true" style={{ position: "absolute", left: -9999, top: -9999 }}>
        <label htmlFor="lf-company">Company</label>
        <input id="lf-company" name="company" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <button className="btn" type="submit" disabled={state === "working"}>
        {state === "working" ? labels.sending : labels.submit}
      </button>
      {failure ? (
        <p className="formerror" role="alert" style={{ flexBasis: "100%" }}>
          {failure}
        </p>
      ) : null}
    </form>
  );
}
