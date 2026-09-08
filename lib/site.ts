/**
 * Everything that names this installation.
 *
 * The cloud at agenttracking.co and a self-hosted copy run the same code;
 * they differ in the origin the snippet posts to, the entity on the legal
 * pages and the address that sends mail. All of that comes from the
 * environment, with the cloud's values as defaults, so a self-hoster changes
 * variables rather than source.
 *
 * No Node imports here: this file is read from both server and client code.
 */

const trim = (v: string | undefined) => (v ?? "").trim();

/** Absolute origin of this installation, no trailing slash. */
export const SITE_ORIGIN = (trim(process.env.SITE_ORIGIN) || "https://agenttracking.co").replace(/\/+$/, "");

export const SITE_HOST = SITE_ORIGIN.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

export const SITE_NAME = trim(process.env.SITE_NAME) || "Agent Tracking";

/** Build an absolute URL on this installation. */
export const absolute = (path: string) => `${SITE_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

/** The address customers write to and mail comes from. */
export const CONTACT_EMAIL = trim(process.env.CONTACT_EMAIL) || `hi@${SITE_HOST}`;

/**
 * Other hosts a customer's snippet may load agent.js from and still count as
 * installed. The product started as a feature of webmcp-tool.com, and sites
 * that installed the line there stay verified after the move.
 */
export const LEGACY_SNIPPET_HOSTS: readonly string[] = (trim(process.env.LEGACY_SNIPPET_HOSTS) || "webmcp-tool.com")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/**
 * Optional page-view counter for the site itself: the URL of a Plausible
 * script (self-hosted or plausible.io). Cookieless, no personal identifiers,
 * and it counts only visits to this installation, never a customer's site.
 * Empty, the default, loads nothing.
 */
export const PLAUSIBLE_SCRIPT = trim(process.env.PLAUSIBLE_SCRIPT);
/** Who hosts that Plausible instance, for the privacy notice, for example "netcup GmbH, Karlsruhe, Germany". */
export const PLAUSIBLE_HOSTING = trim(process.env.PLAUSIBLE_HOSTING);
export const PLAUSIBLE_HOST = PLAUSIBLE_SCRIPT ? PLAUSIBLE_SCRIPT.replace(/^https?:\/\//, "").replace(/\/.*$/, "") : "";

/** The public source, linked from the footer and the docs. */
export const GITHUB_URL = trim(process.env.GITHUB_URL) || "https://github.com/shufflethis/agent-tracking";

/**
 * The readiness check the dashboard shows beside the agent numbers. It is a
 * separate product (webmcp-tool.com) reached over HTTP; empty disables the
 * score line entirely, which a self-hoster may prefer.
 */
export const CHECK_ORIGIN = (process.env.CHECK_ORIGIN === undefined ? "https://webmcp-tool.com" : trim(process.env.CHECK_ORIGIN)).replace(/\/+$/, "");
export const checkUrl = (domain: string) => (CHECK_ORIGIN ? `${CHECK_ORIGIN}/check/${encodeURIComponent(domain)}` : null);

/**
 * The legal entity behind this installation, printed on the imprint, the
 * privacy notice, the terms, the DPA and every mail footer. The defaults are
 * the cloud's operator; a self-hoster must set their own, because the pages
 * are legal statements about whoever runs the server.
 */
/** True when no entity is configured: the cloud's operator is printed. A self-hoster who sets LEGAL_NAME gets none of the cloud's other details by accident. */
const cloudEntity = !trim(process.env.LEGAL_NAME);

export const LEGAL = {
  name: trim(process.env.LEGAL_NAME) || "FINAL MASTER LLC",
  form: trim(process.env.LEGAL_FORM) || (cloudEntity ? "Limited Liability Company (Florida, USA)" : ""),
  addressLines: (trim(process.env.LEGAL_ADDRESS) || (cloudEntity ? "7901 4th St N Ste 300|St. Petersburg, FL 33702|USA" : ""))
    .split("|")
    .map((l) => l.trim())
    .filter(Boolean),
  email: trim(process.env.LEGAL_EMAIL) || (cloudEntity ? "hi@finalmaster.net" : CONTACT_EMAIL),
  website: trim(process.env.LEGAL_WEBSITE) || (cloudEntity ? "https://finalmaster.net" : SITE_ORIGIN),
  /** Where the server stands. Stated as a fact about the machine, not about the operator. */
  hostingCountry: trim(process.env.HOSTING_COUNTRY) || "Germany",
  hostingProvider: trim(process.env.HOSTING_PROVIDER) || (cloudEntity ? "NexoSystems IT-Solutions, Niederzier, Germany" : "the hosting provider named in the privacy notice"),
  /** Article 27 GDPR representative in the EU, if one is appointed. Empty prints nothing. */
  euRepresentative: trim(process.env.LEGAL_EU_REPRESENTATIVE),
  /** Last revision of the legal texts, printed on each of them. */
  revised: trim(process.env.LEGAL_REVISED) || "2026-09-08",
};

/** The address split the way schema.org wants it. Parsed from the second address line ("City, ST 12345" or "12345 City"), country as ISO alpha-2. */
function structuredAddress(lines: string[]) {
  const [street = "", cityLine = "", countryRaw = ""] = lines;
  let locality = cityLine;
  let region = "";
  let postal = "";
  const us = /^(.*?),?\s+([A-Z]{2})\s+(\d{5}(?:-\d{4})?)$/.exec(cityLine);
  const eu = /^(\d{4,5})\s+(.+)$/.exec(cityLine);
  if (us) [locality, region, postal] = [us[1], us[2], us[3]];
  else if (eu) [postal, locality] = [eu[1], eu[2]];
  const countryMap: Record<string, string> = { usa: "US", "united states": "US", germany: "DE", deutschland: "DE", austria: "AT", österreich: "AT", switzerland: "CH", schweiz: "CH" };
  const country = countryRaw.length === 2 ? countryRaw.toUpperCase() : (countryMap[countryRaw.toLowerCase()] ?? countryRaw);
  return { "@type": "PostalAddress", streetAddress: street, addressLocality: locality, ...(region ? { addressRegion: region } : {}), ...(postal ? { postalCode: postal } : {}), addressCountry: country };
}
export const LEGAL_ADDRESS_SCHEMA = structuredAddress(LEGAL.addressLines);

/** The person behind the installation, for bylines and Article authorship. Empty means the organisation is the author. */
export const AUTHOR = {
  name: trim(process.env.AUTHOR_NAME),
  url: trim(process.env.AUTHOR_URL),
  sameAs: trim(process.env.AUTHOR_SAMEAS).split(",").map((s) => s.trim()).filter(Boolean),
};

/** IndexNow key (Bing, Yandex, Naver). Served at /indexnow-key.txt when set. */
export const INDEXNOW_KEY = trim(process.env.INDEXNOW_KEY);

export const LEGAL_LINE = [LEGAL.name, LEGAL.addressLines.join(", ")].filter(Boolean).join(" · ");
