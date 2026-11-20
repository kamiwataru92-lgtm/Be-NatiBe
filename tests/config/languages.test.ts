import { describe, expect, it } from "vitest";
import { DEFAULT_LANGUAGE_ID, getLanguage } from "@/config/languages";

describe("languages", () => {
  it("provides American English as the default", () => {
    const en = getLanguage(DEFAULT_LANGUAGE_ID);
    expect(DEFAULT_LANGUAGE_ID).toBe("en-US");
    expect(en.speechLang).toBe("en-US");
    expect(en.styleGuide.length).toBeGreaterThan(20);
  });

  it("has at least six scenes with unique ids", () => {
    const { scenes } = getLanguage("en-US");
    expect(scenes.length).toBeGreaterThanOrEqual(6);
    expect(new Set(scenes.map((s) => s.id)).size).toBe(scenes.length);
  });

  it("throws on an unknown language id", () => {
    expect(() => getLanguage("xx")).toThrow();
  });
});
