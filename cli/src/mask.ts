/**
 * Best-effort masking of secrets in stderr lines before they leave the machine.
 * It is a safety net for `wrap --tail`, not a guarantee; the tail is opt-in.
 */
const RULES: [RegExp, string][] = [
  [/Bearer\s+\S+/gi, "Bearer [masked]"],
  [/\b(?:sk|ghp|gho|ghs|ghu|github_pat|atk|wmt|xox[abprs])[-_][A-Za-z0-9_-]{8,}/g, "[masked]"],
  [/\b([\w-]*(?:key|token|secret|password|passwd|auth)[\w-]*)(\s*[=:]\s*)(["']?)[^\s"']+/gi, "$1$2$3[masked]"],
  [/\b[0-9a-fA-F]{32,}\b/g, "[masked]"],
  [/[A-Za-z0-9+/_-]{40,}={0,2}/g, "[masked]"],
];

export function maskSecrets(s: string): string {
  return RULES.reduce((out, [pattern, replacement]) => out.replace(pattern, replacement), s);
}
