import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actionStrings, dashCopy, dashLang, langFromHeader } from "./copy";

const shape = (v: unknown, path: string[] = []): string[] => {
  if (typeof v === "function") return [`${path.join(".")}:fn`];
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => shape(x, [...path, k]));
  return [`${path.join(".")}:${typeof v}`];
};

describe("dashboard copy", () => {
  it("has the same keys and value kinds in both languages", () => {
    assert.deepEqual(shape(dashCopy("de")).sort(), shape(dashCopy("en")).sort());
  });
  it("contains no em dash in any string", () => {
    for (const lang of ["en", "de"] as const) {
      const walk = (v: unknown, path: string) => {
        if (typeof v === "string") assert.doesNotMatch(v, /—/, `${lang} ${path}`);
        else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
      };
      walk(dashCopy(lang), lang);
    }
  });
  it("picks the language from the browser and tolerates junk", () => {
    assert.equal(langFromHeader("de-DE,de;q=0.9,en;q=0.8"), "de");
    assert.equal(langFromHeader("en-US,en;q=0.9"), "en");
    assert.equal(langFromHeader(null), "en");
    assert.equal(dashLang("fr"), "en");
    assert.equal(dashLang("de"), "de");
    assert.equal(typeof actionStrings("de").addSite, "string");
    assert.equal("confirmDelete" in actionStrings("de"), false);
  });
});
