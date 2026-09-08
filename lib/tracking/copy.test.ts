import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { actionStrings, dashCopy, dashLang } from "./copy";

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
  it("falls back to English for anything but de", () => {
    assert.equal(dashLang("fr"), "en");
    assert.equal(dashLang("de"), "de");
    assert.equal(typeof actionStrings("de").addSite, "string");
    assert.equal("confirmDelete" in actionStrings("de"), false);
  });
});
