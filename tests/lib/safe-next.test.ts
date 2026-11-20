import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

const ORIGIN = "https://app.example";

describe("safeNext", () => {
  it("keeps same-origin paths with their query", () => {
    expect(safeNext("/lesson", ORIGIN)).toBe("/lesson");
    expect(safeNext("/expressions?x=1", ORIGIN)).toBe("/expressions?x=1");
  });
  it("falls back to / for missing or off-site destinations", () => {
    for (const bad of [null, "", "lesson", "//evil.example", "/\\evil.example", "https://evil.example/", "/%5Cevil.example".replace("%5C", "\\")]) {
      expect(safeNext(bad, ORIGIN)).toBe("/");
    }
  });
});
