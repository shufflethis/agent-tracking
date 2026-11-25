import type { DashLang } from "../tracking/copy";

const safeTz = (timeZone?: string | null): string => {
  if (!timeZone) return "Europe/Berlin";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(0);
    return timeZone;
  } catch {
    return "Europe/Berlin";
  }
};

/** Display helpers for the fleet pages. Defaults to Europe/Berlin unless an account time zone is given. */
export const when = (at: number | null, lang: DashLang, timeZone?: string | null) => {
  if (at === null) return "";
  return new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { timeZone: safeTz(timeZone), day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(at));
};

export const whenTime = (at: number, lang: DashLang, timeZone?: string | null) =>
  new Intl.DateTimeFormat(lang === "de" ? "de-DE" : "en-GB", { timeZone: safeTz(timeZone), hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(at));

export function duration(ms: number | null): string {
  if (ms === null || ms < 0) return "";
  if (ms < 1000) return `${ms} ms`;
  const s = Math.round(ms / 1000);
  if (s < 90) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min`;
  return `${(m / 60).toFixed(1)} h`;
}

export function every(ms: number): string {
  if (ms % 86_400_000 === 0) return `${ms / 86_400_000}d`;
  if (ms % 3_600_000 === 0) return `${ms / 3_600_000}h`;
  return `${Math.round(ms / 60_000)}m`;
}

export const HEALTH_CHIP: Record<string, string> = { problem: "chip fail", running: "chip accent", ok: "chip pass", idle: "chip na" };
export const STATUS_CHIP: Record<string, string> = { failed: "chip fail", hung: "chip fail", missed: "chip fail", running: "chip accent", ok: "chip pass" };

export const CLI_VERSION = "0.6.6";
export const CLI_FILE = `agenttracking-${CLI_VERSION}.tgz`;
export const CLI_URL = `https://agenttracking.co/downloads/${CLI_FILE}`;
export const INSTALL_URL = "https://agenttracking.co/install.sh";
/** SHA-256 of public/downloads/<CLI_FILE>. lib/agents/cli-checksum.test.ts fails when the file and this value drift apart. */
export const CLI_SHA256 = "44c585b9120aaea1c8db821d5ec9e57e6dbf85af079d92a3eda22692e8bf5907";
export const CLI_INSTALL = `curl -fsSL ${INSTALL_URL} | sh`;
export const CLI_COMMAND = "agenttracking";
/** Download, check the hash, then run from the checked file. */
export const CLI_VERIFY = `curl -fsSLO ${CLI_URL}
echo "${CLI_SHA256}  ${CLI_FILE}" | sha256sum -c -
tar -tzf ${CLI_FILE}            # list what is inside
npx --yes ./${CLI_FILE} connect all`;
export const CONNECT_CLAUDE = `curl -fsSL ${INSTALL_URL} | sh -s -- connect all`;
export const DOCTOR_COMMAND = `${CLI_COMMAND} doctor`;
export const WRAP_EXAMPLE = `${CLI_COMMAND} wrap --name backup --every 24h --tail 20 -- ./backup.sh`;
