import { createHash, randomUUID } from "node:crypto";
import { parse, NodeType, type HTMLElement, type Node, type Options } from "node-html-parser";
import { db, getSite } from "./db";

export const CONTENT_CHECKS_METHOD = "visible-source-html-v1";
export const CONTENT_CHECKS_VERIFIER_VERSION = "2";
export const MAX_CAPTURE_BYTES = 256 * 1024;
export const MAX_CHECKS_PER_SITE = 50;
export const MAX_CHECKS_PER_PAGE = 20;

export type ContentCheck = {
  checkId: string;
  domain: string;
  pagePath: string;
  label: string;
  expectedText: string;
  alternatives: string[];
  createdAt: number;
};
export type ContentCheckResult = {
  checkId: string;
  label: string;
  expectedText: string;
  alternatives: string[];
  status: "found" | "not_found" | "uncheckable";
  matchedText: string | null;
  evidence: string | null;
};
export type ContentCapture = {
  runId: string;
  domain: string;
  pagePath: string;
  contentVersion: string;
  contentHash: string;
  method: string;
  verifierVersion: string;
  capturedAt: number;
  results: ContentCheckResult[];
};

type CheckRow = {
  check_id: string; domain: string; page_path: string; label: string;
  expected_text: string; alternatives_json: string; created_at: number;
};
type CaptureRow = {
  run_id: string; domain: string; page_path: string; content_version: string;
  content_hash: string; method: string; verifier_version: string;
  captured_at: number; results_json: string;
};

const checkFromRow = (row: CheckRow): ContentCheck => ({
  checkId: row.check_id, domain: row.domain, pagePath: row.page_path,
  label: row.label, expectedText: row.expected_text,
  alternatives: JSON.parse(row.alternatives_json) as string[], createdAt: row.created_at,
});
const captureFromRow = (row: CaptureRow): ContentCapture => ({
  runId: row.run_id, domain: row.domain, pagePath: row.page_path,
  contentVersion: row.content_version, contentHash: row.content_hash,
  method: row.method, verifierVersion: row.verifier_version,
  capturedAt: row.captured_at, results: JSON.parse(row.results_json) as ContentCheckResult[],
});

export function normalizePagePath(value: unknown, domain: string): string {
  if (typeof value !== "string" || value.length > 2048 || !value.startsWith("/") || value.startsWith("//") || /[?#\\\x00-\x1f]/u.test(value)) throw new Error("invalid_page_path");
  let url: URL;
  try { url = new URL(value, `https://${domain.toLowerCase()}`); }
  catch { throw new Error("invalid_page_path"); }
  if (url.origin !== `https://${domain.toLowerCase()}` || url.search || url.hash) throw new Error("invalid_page_path");
  return url.pathname;
}

function normalizeText(value: string): string {
  return value.normalize("NFKC").replace(/[\p{White_Space}\u200b\ufeff]+/gu, " ").trim();
}

const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BODY", "CAPTION", "DD", "DETAILS", "DIALOG",
  "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3",
  "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION",
  "SUMMARY", "TABLE", "TBODY", "TD", "TFOOT", "TH", "THEAD", "TR", "UL",
]);
const OMIT_TAGS = new Set(["HEAD", "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
type HtmlParser = (data: string, options?: Partial<Options>) => HTMLElement;

function isHidden(node: HTMLElement): boolean {
  if ("hidden" in node.attributes || node.attributes["aria-hidden"]?.trim().toLowerCase() === "true") return true;
  const declarations = (node.attributes.style ?? "").split(";");
  for (const declaration of declarations) {
    const colon = declaration.indexOf(":");
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration.slice(colon + 1).replace(/\s*!important\s*$/iu, "").trim().toLowerCase();
    if ((property === "display" && value === "none") ||
        (property === "visibility" && (value === "hidden" || value === "collapse")) ||
        (property === "content-visibility" && value === "hidden")) return true;
  }
  return false;
}

/** Extract source-visible text with a real HTML parser; external CSS is not evaluated. */
export function visibleHtmlText(html: string, parseHtml: HtmlParser = parse): string {
  const document = parseHtml(html, { lowerCaseTagName: false, comment: false });
  const body = document.querySelector("body");
  const parts: string[] = [];
  let visited = 0;
  const walk = (node: Node, depth: number): void => {
    visited += 1;
    if (visited > 100_000 || depth > 256) throw new Error("html_too_complex");
    if (node.nodeType === NodeType.TEXT_NODE) {
      parts.push(node.text);
      return;
    }
    if (node.nodeType !== NodeType.ELEMENT_NODE) return;
    const element = node as HTMLElement;
    const tag = element.tagName.toUpperCase();
    if (OMIT_TAGS.has(tag) || tag === "SVG" || tag === "CANVAS" || isHidden(element)) return;
    if (tag === "DIALOG" && !("open" in element.attributes)) return;
    if (BLOCK_TAGS.has(tag) || tag === "BR") parts.push(" ");
    if (tag === "DETAILS" && !("open" in element.attributes)) {
      for (const child of element.childNodes) {
        if (child.nodeType === NodeType.ELEMENT_NODE && (child as HTMLElement).tagName.toUpperCase() === "SUMMARY") walk(child, depth + 1);
      }
    } else {
      for (const child of element.childNodes) walk(child, depth + 1);
    }
    if (BLOCK_TAGS.has(tag)) parts.push(" ");
  };
  if (body) walk(body, 0);
  else for (const child of document.childNodes) walk(child, 0);
  return normalizeText(parts.join(""));
}

function evidenceAround(text: string, index: number, matchLength: number): string {
  const context = Math.max(0, Math.floor((400 - matchLength) / 2));
  const start = Math.max(0, index - context);
  const end = Math.min(text.length, index + matchLength + context);
  return text.slice(start, end);
}

export function evaluateContentChecks(input: {
  html: string; checks: Pick<ContentCheck, "checkId" | "label" | "expectedText" | "alternatives">[];
  parseHtml?: HtmlParser;
}): { contentHash: string; results: ContentCheckResult[] } {
  const contentHash = createHash("sha256").update(input.html, "utf8").digest("hex");
  let visibleText = "";
  let uncheckable = false;
  try {
    visibleText = visibleHtmlText(input.html, input.parseHtml);
    uncheckable = visibleText.length === 0;
  } catch {
    uncheckable = true;
  }
  const results = input.checks.map((check): ContentCheckResult => {
    const candidates = [check.expectedText, ...check.alternatives];
    if (uncheckable) return { ...check, status: "uncheckable", matchedText: null, evidence: null };
    for (const candidate of candidates) {
      const normalized = normalizeText(candidate);
      if (!normalized) continue;
      // Regex is used only for literal text matching, never for parsing HTML.
      // Unicode case-insensitive matching preserves offsets into the original text.
      const match = new RegExp(normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "iu").exec(visibleText);
      if (match) return { ...check, status: "found", matchedText: candidate, evidence: evidenceAround(visibleText, match.index, match[0].length) };
    }
    return { ...check, status: "not_found", matchedText: null, evidence: null };
  });
  return { contentHash, results };
}

export function createContentCheck(input: {
  domain: string; owner: string; pagePath: string; label: string;
  expectedText: string; alternatives?: string[]; now?: number;
}): ContentCheck {
  const domain = input.domain.toLowerCase();
  if (getSite(domain)?.owner !== input.owner.toLowerCase()) throw new Error("site_forbidden");
  const pagePath = normalizePagePath(input.pagePath, domain);
  const label = typeof input.label === "string" ? input.label.trim() : "";
  const expectedText = typeof input.expectedText === "string" ? normalizeText(input.expectedText) : "";
  const alternatives = Array.isArray(input.alternatives) ? input.alternatives.map((v) => typeof v === "string" ? normalizeText(v) : "") : [];
  if (!label || label.length > 100 || /[\x00-\x1f]/u.test(label)) throw new Error("invalid_label");
  if (!expectedText || expectedText.length > 240 || /[\x00-\x1f]/u.test(expectedText)) throw new Error("invalid_expected_text");
  if (alternatives.length > 5 || alternatives.some((v) => !v || v.length > 240 || /[\x00-\x1f]/u.test(v))) throw new Error("invalid_alternatives");
  const seenAlternatives = new Set([expectedText.toLowerCase()]);
  const uniqueAlternatives = alternatives.filter((value) => {
    const key = value.toLowerCase();
    if (seenAlternatives.has(key)) return false;
    seenAlternatives.add(key);
    return true;
  });
  const d = db();
  const siteCount = (d.prepare("select count(*) as n from content_checks where domain=?").get(domain) as { n: number }).n;
  if (siteCount >= MAX_CHECKS_PER_SITE) throw new Error("site_check_limit");
  const pageCount = (d.prepare("select count(*) as n from content_checks where domain=? and page_path=?").get(domain, pagePath) as { n: number }).n;
  if (pageCount >= MAX_CHECKS_PER_PAGE) throw new Error("page_check_limit");
  const check: ContentCheck = { checkId: randomUUID(), domain, pagePath, label, expectedText, alternatives: uniqueAlternatives, createdAt: input.now ?? Date.now() };
  d.prepare("insert into content_checks (domain, check_id, page_path, label, expected_text, alternatives_json, created_at) values (?, ?, ?, ?, ?, ?, ?)")
    .run(domain, check.checkId, pagePath, label, expectedText, JSON.stringify(check.alternatives), check.createdAt);
  return check;
}

export function recordContentCapture(input: {
  domain: string; owner: string; runId: string; pagePath: string;
  contentVersion: string; html: string; now?: number;
}): ContentCapture {
  const domain = input.domain.toLowerCase();
  if (getSite(domain)?.owner !== input.owner.toLowerCase()) throw new Error("site_forbidden");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(input.runId)) throw new Error("invalid_run_id");
  const pagePath = normalizePagePath(input.pagePath, domain);
  const contentVersion = typeof input.contentVersion === "string" ? input.contentVersion.trim() : "";
  if (!contentVersion || contentVersion.length > 100 || /[\x00-\x1f]/u.test(contentVersion)) throw new Error("invalid_content_version");
  if (typeof input.html !== "string" || Buffer.byteLength(input.html, "utf8") > MAX_CAPTURE_BYTES) throw new Error("capture_too_large");
  const d = db();
  const evaluated = evaluateContentChecks({ html: input.html, checks: contentChecksFor(domain, pagePath) });
  if (evaluated.results.length === 0) throw new Error("no_checks_for_page");
  const prior = d.prepare(`select run_id, domain, page_path, content_version, content_hash, method,
    verifier_version, captured_at, results_json from content_captures where domain=? and run_id=?`).get(domain, input.runId) as CaptureRow | undefined;
  if (prior) {
    const existing = captureFromRow(prior);
    if (existing.pagePath !== pagePath || existing.contentVersion !== contentVersion || existing.contentHash !== evaluated.contentHash) throw new Error("capture_id_conflict");
    return existing;
  }
  const dayStart = (input.now ?? Date.now()) - 86_400_000;
  const recentCount = (d.prepare("select count(*) as n from content_captures where domain=? and page_path=? and captured_at>=?").get(domain, pagePath, dayStart) as { n: number }).n;
  if (recentCount >= 20) throw new Error("capture_rate_limit");
  const capture: ContentCapture = {
    runId: input.runId, domain, pagePath, contentVersion, contentHash: evaluated.contentHash,
    method: CONTENT_CHECKS_METHOD, verifierVersion: CONTENT_CHECKS_VERIFIER_VERSION,
    capturedAt: input.now ?? Date.now(), results: evaluated.results,
  };
  d.prepare(`insert into content_captures
    (domain, run_id, page_path, content_version, content_hash, method, verifier_version, captured_at, results_json, html_snapshot)
    values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(domain, capture.runId, pagePath, contentVersion, capture.contentHash, capture.method, capture.verifierVersion, capture.capturedAt, JSON.stringify(capture.results), input.html);
  return capture;
}

export function contentChecksFor(domain: string, pagePath?: string): ContentCheck[] {
  const rows = (pagePath
    ? db().prepare("select * from content_checks where domain=? and page_path=? order by created_at, check_id").all(domain.toLowerCase(), pagePath)
    : db().prepare("select * from content_checks where domain=? order by created_at desc limit ?").all(domain.toLowerCase(), MAX_CHECKS_PER_SITE)) as CheckRow[];
  return rows.map(checkFromRow);
}

export function contentCapturesFor(domain: string, pagePath?: string, limit = 100): ContentCapture[] {
  const bounded = Math.min(100, Math.max(1, Math.trunc(limit)));
  const columns = "run_id, domain, page_path, content_version, content_hash, method, verifier_version, captured_at, results_json";
  const rows = (pagePath
    ? db().prepare(`select ${columns} from content_captures where domain=? and page_path=? order by captured_at desc limit ?`).all(domain.toLowerCase(), pagePath, bounded)
    : db().prepare(`select ${columns} from content_captures where domain=? order by captured_at desc limit ?`).all(domain.toLowerCase(), bounded)) as CaptureRow[];
  return rows.map(captureFromRow);
}
