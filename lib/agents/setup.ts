import { CLI_COMMAND, CONNECT_CLAUDE, DOCTOR_COMMAND } from "@/lib/agents/format";

/**
 * The two ways to connect a machine, shared by the home page, the changelog
 * and anything else that explains setup: one command for the terminal, or one
 * prompt to paste into Claude Code, which then runs the same commands and asks
 * before it changes the crontab.
 */

export { DOCTOR_COMMAND };
export const AUDIT_COMMAND = `${CLI_COMMAND} audit`;
export const BREW_INSTALL = `brew install shufflethis/tap/agenttracking`;
export const AUDIT_ONE_LINER = `brew install shufflethis/tap/agenttracking && agenttracking audit
# or without Homebrew (Linux / macOS, SHA-256 verified):
curl -fsSL https://agenttracking.co/install.sh | sh -s -- audit`;
export const STATUS_COMMAND = `${CLI_COMMAND} status`;
export const GUARD_EXAMPLE = `${CLI_COMMAND} guard --max-failures 5 --max-calls 80 --max-minutes 45 --block-destructive on`;
export const PAUSE_COMMAND = `${CLI_COMMAND} pause --reason "maintenance"`;
export const DISCONNECT_CLAUDE = `${CLI_COMMAND} disconnect claude`;
export const WRAP_CRON = `# crontab, before
0 7 * * * /opt/backup.sh
# after
0 7 * * * ${CLI_COMMAND} wrap --name backup --every 24h --tail 20 -- /opt/backup.sh`;

export function wrapAny(name: string, command: string, every = "24h"): string {
  return `${CLI_COMMAND} wrap --name ${name} --every ${every} -- ${command}`;
}

export function claudeSetupPrompt(lang: "en" | "de"): string {
  if (lang === "de")
    return `Richte auf dieser Maschine das Agent-Monitoring von agenttracking.co ein.

1. Führe aus: ${CONNECT_CLAUDE}
   Der Befehl zeigt einen Code und einen Link. Zeig mir beides und warte, bis ich den Code im Browser bestätigt habe.
2. Führe \`${DOCTOR_COMMAND}\` aus. Schlag für jeden noch nicht umschlossenen Cron-Job eine neue Zeile vor:
   ${CLI_COMMAND} wrap --name <kurzer-name> --every <Intervall passend zum Zeitplan> -- <ursprünglicher Befehl>
   Zeig mir die komplette neue Crontab und installiere sie erst, wenn ich Ja sage.
3. Führe \`${STATUS_COMMAND}\` aus und sag mir, ob die Maschine verbunden ist.`;
  return `Set up agenttracking.co agent monitoring on this machine.

1. Run: ${CONNECT_CLAUDE}
   It prints a code and a link. Show me both and wait until I have confirmed the code in the browser.
2. Run \`${DOCTOR_COMMAND}\`. For every unwrapped cron job it finds, suggest a new line that wraps the command like this:
   ${CLI_COMMAND} wrap --name <short-name> --every <interval matching the schedule> -- <original command>
   Show me the complete new crontab and only install it after I say yes.
3. Run \`${STATUS_COMMAND}\` and tell me whether this machine is connected.`;
}
