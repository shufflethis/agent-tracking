import type { Metadata } from "next";
import DashboardShell from "@/components/DashboardShell";
import { requireAccount } from "@/lib/tracking/auth";
import { dashLang } from "@/lib/tracking/copy";
import { LEGAL } from "@/lib/site";

export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };
export const runtime = "nodejs";

const COPY = {
  en: {
    title: "Account",
    signedIn: (e: string) => `Signed in as ${e}.`,
    sessionsTitle: "Sign out everywhere",
    sessionsText: "Ends every session of this account on every browser and device, this one included. Use it if you signed in on a computer that is not yours or think a session was copied. Connected machines keep reporting; revoke those under Your agents → Settings.",
    sessionsBtn: "Sign out everywhere",
    deleteTitle: "Delete account and all data",
    deleteText: "Deletes this account at once and for good: your websites with all their statistics, your agents with every run, event and signal, all tokens and settings. A paid subscription is cancelled immediately, without refund for the current period. Stripe keeps its own invoice records, as the law requires; we keep nothing.",
    confirmLabel: (e: string) => `Type ${e} to confirm`,
    deleteBtn: "Delete my account and all data",
    errors: { confirm: "The email address did not match. Nothing was deleted.", billing: `Your subscription could not be cancelled with Stripe, so nothing was deleted. Try again in a minute or write to ${LEGAL.email}.` } as Record<string, string>,
  },
  de: {
    title: "Konto",
    signedIn: (e: string) => `Angemeldet als ${e}.`,
    sessionsTitle: "Überall abmelden",
    sessionsText: "Beendet jede Sitzung dieses Kontos in jedem Browser und auf jedem Gerät, auch diese hier. Nutze das, wenn du dich an einem fremden Rechner angemeldet hast oder glaubst, dass eine Sitzung kopiert wurde. Verbundene Maschinen melden weiter; die widerrufst du unter Deine Agents → Einstellungen.",
    sessionsBtn: "Überall abmelden",
    deleteTitle: "Konto und alle Daten löschen",
    deleteText: "Löscht dieses Konto sofort und endgültig: deine Websites mit allen Statistiken, deine Agents mit allen Läufen, Events und Auffälligkeiten, alle Tokens und Einstellungen. Ein bezahltes Abo wird sofort gekündigt, ohne Erstattung für den laufenden Zeitraum. Stripe behält seine eigenen Rechnungsbelege, wie es das Gesetz verlangt; wir behalten nichts.",
    confirmLabel: (e: string) => `Zur Bestätigung ${e} eintippen`,
    deleteBtn: "Mein Konto und alle Daten löschen",
    errors: { confirm: "Die E-Mail-Adresse stimmte nicht. Es wurde nichts gelöscht.", billing: `Dein Abo konnte bei Stripe nicht gekündigt werden, deshalb wurde nichts gelöscht. Versuch es in einer Minute noch einmal oder schreib an ${LEGAL.email}.` } as Record<string, string>,
  },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const account = await requireAccount("/app/account");
  const c = COPY[dashLang(account.lang)];
  return (
    <DashboardShell account={account} title={c.title}>
      <section className="shell section" style={{ paddingTop: 32, maxWidth: 720 }}>
        <p>{c.signedIn(account.email)}</p>

        <div className="card" style={{ padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, marginTop: 0 }}>{c.sessionsTitle}</h2>
          <p style={{ color: "var(--ink-2)" }}>{c.sessionsText}</p>
          <form method="post" action="/api/account">
            <input type="hidden" name="action" value="signout_all" />
            <button className="btn ghost" type="submit">{c.sessionsBtn}</button>
          </form>
        </div>

        <div className="card" id="delete" style={{ padding: 24, borderColor: "var(--crit)" }}>
          <h2 style={{ fontSize: 20, marginTop: 0 }}>{c.deleteTitle}</h2>
          <p style={{ color: "var(--ink-2)" }}>{c.deleteText}</p>
          {error && c.errors[error] ? <p role="alert" style={{ color: "var(--crit)" }}>{c.errors[error]}</p> : null}
          <form method="post" action="/api/account">
            <input type="hidden" name="action" value="delete" />
            <label style={{ display: "block", fontSize: 14, marginBottom: 6 }} htmlFor="confirm">{c.confirmLabel(account.email)}</label>
            <input className="field" id="confirm" name="confirm" type="email" autoComplete="off" required style={{ width: "100%", maxWidth: 420, marginBottom: 14 }} />
            <div><button className="btn" type="submit" style={{ background: "var(--crit)", color: "#111" }}>{c.deleteBtn}</button></div>
          </form>
        </div>
      </section>
    </DashboardShell>
  );
}
