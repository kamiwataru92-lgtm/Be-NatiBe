import { describe, expect, it } from "vitest";
import { LEVEL_PROFILES, LEVELS, isLevel } from "@/lib/levels";

describe("levels", () => {
  it("speaks slower for beginners than for advanced learners", () => {
    expect(LEVEL_PROFILES.beginner.speechRate).toBeLessThan(LEVEL_PROFILES.advanced.speechRate);
  });

  it("uses the agreed parameters", () => {
    expect(LEVEL_PROFILES.beginner).toEqual({ speechRate: 0.8, japaneseSupport: "heavy", slang: "basic", lessonLines: [4, 6] });
    expect(LEVEL_PROFILES.advanced.slang).toBe("full");
    expect(LEVELS).toEqual(["beginner", "intermediate", "advanced"]);
  });

  it("recognises valid levels only", () => {
    expect(isLevel("advanced")).toBe(true);
    expect(isLevel("expert")).toBe(false);
    expect(isLevel(undefined)).toBe(false);
  });
});
