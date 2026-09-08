import { SITE_ORIGIN } from "@/lib/site";

/** The one line a customer installs. Kept here so the docs, the settings page and the landing page hand out the same string. */
export const snippetFor = (domain: string) => `<script defer data-domain="${domain}" src="${SITE_ORIGIN}/agent.js"></script>`;
