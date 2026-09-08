/**
 * Transactional email through Brevo.
 *
 * Kept deliberately small: one function, no SDK, no queue. If the send fails the
 * caller is told so and can surface it — a contact form that reports success on
 * a failed delivery is worse than one that has no backend at all.
 */

import { CONTACT_EMAIL, SITE_NAME } from "./site";

const ENDPOINT = "https://api.brevo.com/v3/smtp/email";

export type Address = { email: string; name?: string };

export type MailFamily = "login" | "manifest-alert" | "digest";

/**
 * Which family of mail this is. Kept on the type so a send site names its
 * purpose; nothing is recorded per recipient.
 */
export type LedgerMeta = {
  family: MailFamily;
  host?: string;
  score?: number;
  grade?: string;
  segment?: string;
  cluster?: string;
};

export type Mail = {
  to: Address[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: Address;
  tags?: string[];
  /**
   * Raw message headers. The one that matters is List-Unsubscribe: Gmail and
   * Outlook read it and show their own unsubscribe control, which is what
   * keeps recurring mail out of the spam folder once volume exists.
   */
  headers?: Record<string, string>;
  ledger?: LedgerMeta;
};

export type SendResult = { ok: true; messageId?: string } | { ok: false; reason: string };

/** The verified sender in Brevo. Anything else is rejected by the API. */
export function sender(): Address {
  return {
    email: process.env.MAIL_FROM_EMAIL ?? CONTACT_EMAIL,
    name: process.env.MAIL_FROM_NAME ?? SITE_NAME,
  };
}

export function inbox(): Address {
  return { email: CONTACT_EMAIL, name: SITE_NAME };
}

export function emailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

export async function sendMail(mail: Mail): Promise<SendResult> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return { ok: false, reason: "No BREVO_API_KEY is configured." };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: sender(),
        to: mail.to,
        replyTo: mail.replyTo,
        subject: mail.subject,
        textContent: mail.text,
        htmlContent: mail.html,
        tags: mail.tags,
        headers: mail.headers,
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Network error" };
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Brevo returns a code and message; keep both, they are the difference between
    // "unverified sender" and "out of credits".
    return { ok: false, reason: `Brevo ${res.status}: ${body.slice(0, 300)}` };
  }

  const data = (await res.json().catch(() => ({}))) as { messageId?: string };

  return { ok: true, messageId: data.messageId };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
