import { escapeHtml } from "./email";
import { LEGAL, LEGAL_LINE, SITE_HOST, SITE_NAME, SITE_ORIGIN } from "./site";

/**
 * The one look every customer-facing email shares.
 *
 * Pure: a title, a body and a footer choice in, a document out. The header is
 * a text wordmark next to the brand mark as a hosted PNG: Gmail renders no
 * SVG in mail and strips data: URIs. Everything is inline style on white,
 * because the dark theme does not survive Outlook.
 */

const CYAN = "#3fd8ca";
const INK = "#111111";
const MUTED = "#6b6b74";
const RULE = "#e6e6ea";

const MARK_URL = `${SITE_ORIGIN}/email/mark.png`;

const DISPLAY = "'Jost', Futura, 'Century Gothic', 'Trebuchet MS', sans-serif";
const BODY = "'Open Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";

export { LEGAL_LINE };

export type LayoutInput = {
  title: string;
  /** Inbox preview text. Hidden in the body; escaped. */
  preheader?: string;
  /** Trusted HTML built with the helpers below. Callers escape their own data. */
  body: string;
  /** Present only for recurring mail. Its presence is what adds the unsubscribe line. */
  unsubscribeUrl?: string;
  unsubscribeReason?: string;
  unsubscribeLabel?: string;
};

export const heading = (text: string) =>
  `<h2 style="font-family:${DISPLAY};font-size:19px;line-height:1.3;margin:0 0 10px;color:${INK}">${escapeHtml(text)}</h2>`;

export const paragraph = (html: string, tone: "normal" | "muted" = "normal") =>
  `<p style="margin:0 0 14px;color:${tone === "muted" ? MUTED : "#444"};font-size:15px;line-height:1.6">${html}</p>`;

export const button = (href: string, label: string) =>
  `<p style="margin:6px 0 26px"><a href="${escapeHtml(href)}" style="display:inline-block;background:${INK};color:#ffffff;padding:13px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-family:${BODY}">${escapeHtml(label)}</a></p>`;

export function layout({ title, preheader, body, unsubscribeUrl, unsubscribeReason, unsubscribeLabel }: LayoutInput): string {
  const mark = `<img src="${escapeHtml(MARK_URL)}" width="42" height="28" alt="" style="vertical-align:middle;margin-right:10px">`;
  const unsubscribe = unsubscribeUrl
    ? `<p style="margin:0 0 6px">${escapeHtml(unsubscribeReason ?? `You are receiving this because you track a site on ${SITE_HOST}.`)} <a href="${escapeHtml(unsubscribeUrl)}" style="color:${MUTED}">${escapeHtml(unsubscribeLabel ?? "Stop these mails")}</a>.</p>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f6">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(preheader)}</div>` : ""}
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f6">
<tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px">
<tr><td style="padding:26px 32px 18px;border-bottom:3px solid ${CYAN}">
  ${mark}<span style="font-family:${DISPLAY};font-weight:700;font-size:18px;letter-spacing:0.01em;color:${INK};vertical-align:middle">${escapeHtml(SITE_NAME)}</span>
</td></tr>
<tr><td style="padding:26px 32px 8px;font-family:${BODY};color:${INK};font-size:15px;line-height:1.6">
${body}
</td></tr>
<tr><td style="padding:18px 32px 26px;border-top:1px solid ${RULE};font-family:${BODY};font-size:12px;line-height:1.6;color:${MUTED}">
  ${unsubscribe}
  <p style="margin:0 0 6px">${escapeHtml(LEGAL_LINE)}</p>
  <p style="margin:0"><a href="${SITE_ORIGIN}/imprint" style="color:${MUTED}">Imprint</a> · <a href="${SITE_ORIGIN}/privacy" style="color:${MUTED}">Privacy</a> · <a href="${SITE_ORIGIN}" style="color:${MUTED}">${escapeHtml(SITE_HOST)}</a> · <a href="${escapeHtml(LEGAL.website)}" style="color:${MUTED}">${escapeHtml(LEGAL.name)}</a></p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
