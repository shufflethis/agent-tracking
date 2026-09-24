/** Privacy filters for untrusted browser and legacy aggregate dimensions. */
const ERROR_CLASSES = new Set([
  "Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "URIError",
  "AbortError", "TimeoutError", "ValidationError", "NetworkError", "NotFoundError",
  "SecurityError", "InvalidStateError",
]);

export function safeErrorClass(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  return ERROR_CLASSES.has(value) ? value : "Error";
}

export function safeEventName(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const name = value.trim();
  return /^[A-Za-z0-9._-]{1,128}$/.test(name) ? name : "[redacted]";
}

const DEFAULT_SENSITIVE = ["/account/**", "/auth/**", "/login/**", "/password/**", "/checkout/**", "/orders/**", "/users/**", "/profile/**", "/booking/**"];

function matchesTemplate(path: string, template: string): boolean {
  const pathParts = path.toLowerCase().split("/").filter(Boolean);
  const pattern = template.toLowerCase().split("/").filter(Boolean);
  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === "**") return true;
    if (i >= pathParts.length) return false;
    if (pattern[i] !== "*" && !pattern[i].startsWith(":") && pattern[i] !== pathParts[i]) return false;
  }
  return pathParts.length === pattern.length;
}

export function redactPath(value: unknown, configured = process.env.TRACKING_REDACT_PATHS ?? ""): string {
  if (typeof value !== "string") return "/";
  const raw = (value.split(/[?#]/)[0] || "/").slice(0, 200);
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const templates = [...DEFAULT_SENSITIVE, ...configured.split(",").map((item) => item.trim()).filter(Boolean)];
  if (templates.some((template) => matchesTemplate(path, template))) return "/[redacted]";
  return path.split("/").map((segment, index) => {
    if (index === 0 || !segment) return segment;
    if (!/^[A-Za-z0-9._~-]{1,60}$/.test(segment)) return "[redacted]";
    if (/@/.test(segment) || /^[0-9]{4,}$/.test(segment) || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return "[redacted]";
    if (segment.length >= 24 && /[a-z]/i.test(segment) && /[0-9]/.test(segment)) return "[redacted]";
    return segment;
  }).join("/");
}

export function safeCounterName(kind: string, name: string): string {
  if (kind === "page" || kind === "tool_page") return redactPath(name);
  if (kind === "tool_error") {
    const split = name.indexOf(" ");
    return `${safeEventName(split < 0 ? name : name.slice(0, split)) ?? "[redacted]"} ${safeErrorClass(split < 0 ? null : name.slice(split + 1)) ?? "Error"}`;
  }
  if (kind.startsWith("tool_") || kind === "conversion" || kind === "goal_attempt" || kind === "form_attempt") return safeEventName(name) ?? "[redacted]";
  return name;
}
