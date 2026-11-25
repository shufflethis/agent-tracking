/**
 * Terminal brand banner matching the `< ● >` Mark.tsx logo in Cyan -> Violet.
 * Automatically disables ANSI color codes when stdout is not a TTY or NO_COLOR is set.
 */
export function formatBrandBanner(opts: {
  version?: string;
  subtitle?: string;
  color?: boolean;
} = {}): string {
  const useColor = opts.color ?? (Boolean(process.stdout.isTTY) && !process.env.NO_COLOR);
  const wrap = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
  const cyan = wrap("38;5;80");
  const sky = wrap("38;5;111");
  const violet = wrap("38;5;141");
  const white = wrap("1;97");
  const dim = wrap("2");

  const ver = opts.version ? `v${opts.version.replace(/^v/, "")}` : "";
  const titleText = ver ? `AGENT TRACKING  ${ver}` : "AGENT TRACKING";
  const subText = opts.subtitle ?? "Zero-prompt guardrails & fleet monitor";
  const urlText = "https://agenttracking.co";

  const leftCols = 15;
  const innerWidth = Math.max(42, titleText.length, subText.length, urlText.length) + leftCols + 2;
  const fill = (textLen: number) => " ".repeat(Math.max(1, innerWidth - leftCols - textLen));

  const titleStyled = ver ? `${white("AGENT TRACKING")}  ${cyan(ver)}` : white("AGENT TRACKING");
  const top = cyan(`╭${"─".repeat(innerWidth)}╮`);
  const bot = cyan(`╰${"─".repeat(innerWidth)}╯`);

  const row1 = `${cyan("│")}   ${cyan("╱")}     ${violet("╲")}     ${titleStyled}${fill(titleText.length)}${cyan("│")}`;
  const row2 = `${cyan("│")}  ${cyan("<")}   ${sky("●")}   ${violet(">")}    ${dim(subText)}${fill(subText.length)}${cyan("│")}`;
  const row3 = `${cyan("│")}   ${cyan("╲")}     ${violet("╱")}     ${dim(urlText)}${fill(urlText.length)}${cyan("│")}`;

  return [top, row1, row2, row3, bot].join("\n");
}
