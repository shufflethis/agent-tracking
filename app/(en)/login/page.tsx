import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import LoginForm from "@/components/LoginForm";
import { currentAccount } from "@/lib/tracking/auth";
import { dashCopy } from "@/lib/tracking/copy";

export const metadata: Metadata = {
  title: "Sign in to Agent Tracking",
  description: "One email, one button, no password. Opens the Agent Tracking dashboard for your sites.",
  robots: { index: false, follow: true },
};

export const runtime = "nodejs";

/** English unless the German landing page sent the visitor here with ?lang=de. The browser's language is not consulted. */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; domain?: string; lang?: string; signed_out?: string }> }) {
  const { next, domain, lang: langParam, signed_out } = await searchParams;
  // currentAccount, not the bare token: a revoked or deleted session must land here, not loop back to /app.
  if (await currentAccount()) redirect(safeNext(next));
  const lang = langParam === "de" ? "de" : "en";
  const c = dashCopy(lang).login;
  return (
    <section className="shell" style={{ paddingTop: 72, paddingBottom: 60 }}>
      <div className="pagehead" style={{ marginBottom: 28 }}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 style={{ fontSize: "clamp(28px,4vw,40px)" }}>{c.title}</h1>
        <p className="dek" style={{ maxWidth: "56ch" }}>{c.dek}</p>
        {signed_out === "all" ? <p role="status" style={{ color: "var(--cyan)", marginTop: 12 }}>{lang === "de" ? "Alle Sitzungen dieses Kontos sind beendet." : "Every session of this account has been signed out."}</p> : null}
      </div>
      <div className="card mid" style={{ padding: 28, maxWidth: 560 }}>
        <LoginForm next={next} domain={domain} lang={lang} labels={{ emailLabel: c.emailLabel, placeholder: c.placeholder, sending: c.sending, submit: c.submit, failed: c.failed, checkInbox: c.checkInbox, onItsWay: c.onItsWay("{email}") }} />
      </div>
    </section>
  );
}
