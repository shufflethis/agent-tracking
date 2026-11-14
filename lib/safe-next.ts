/**
 * Where to send someone after sign-in. Only a same-origin path: a bare "/"
 * prefix would still let "//evil.example" through as a protocol-relative URL.
 *
 * Its own module, with no Node imports, because the login form is a client
 * component and lib/session.ts pulls in node:crypto.
 */
export function safeNext(raw: unknown): string {
  const value = typeof raw === "string" ? raw : "";
  if (!/^\/(?!\/|\\)[^\s\\\x00-\x1f\x7f]*$/.test(value)) return "/app";
  try {
    const parsed = new URL(value, "https://agenttracking.invalid");
    return parsed.origin === "https://agenttracking.invalid" ? value : "/app";
  } catch {
    return "/app";
  }
}
