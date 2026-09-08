import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import LoginForm from "@/components/LoginForm";
import { readSessionToken, SESSION_COOKIE } from "@/lib/session";
import { dashCopy, langFromHeader } from "@/lib/tracking/copy";

export const metadata: Metadata = {
  title: "Sign in to Agent Tracking",
  description: "One email, one button, no password. Opens the Agent Tracking dashboard for your sites.",
  robots: { index: false, follow: true },
};

export const runtime = "nodejs";

/** No account yet, so no stored language: the browser's Accept-Language decides here. */
export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string; domain?: string; lang?: string }> }) {
  const { next, domain, lang: langParam } = await searchParams;
  const session = readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (session) redirect(safeNext(next));
  const lang = langParam === "de" || langParam === "en" ? langParam : langFromHeader((await headers()).get("accept-language"));
  const c = dashCopy(lang).login;
  return (
    <section className="shell" style={{ paddingTop: 72, paddingBottom: 60 }}>
      <div className="pagehead" style={{ marginBottom: 28 }}>
        <p className="eyebrow">{c.eyebrow}</p>
        <h1 style={{ fontSize: "clamp(28px,4vw,40px)" }}>{c.title}</h1>
        <p className="dek" style={{ maxWidth: "56ch" }}>{c.dek}</p>
      </div>
      <div className="card" style={{ padding: 28, maxWidth: 560 }}>
        <LoginForm next={next} domain={domain} labels={{ emailLabel: c.emailLabel, placeholder: c.placeholder, sending: c.sending, submit: c.submit, failed: c.failed, checkInbox: c.checkInbox, onItsWay: c.onItsWay("{email}") }} />
      </div>
    </section>
  );
}
