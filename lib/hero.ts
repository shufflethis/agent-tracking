/**
 * Which photograph sits behind which page header. Generic office scenes,
 * texture behind a headline; they illustrate nothing and claim nothing.
 */
const HERO: Record<string, string> = {
  home: "building",
  docs: "analysing",
};

export function heroFor(key: string): string | undefined {
  return HERO[key];
}
