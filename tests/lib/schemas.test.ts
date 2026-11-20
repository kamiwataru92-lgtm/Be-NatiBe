import { describe, expect, it } from "vitest";
import { ChatRequestSchema, LessonSchema, MAX_LEARNER_TURNS, PlacementResultSchema } from "@/lib/schemas";

import { expr, sampleLesson } from "../fixtures";

describe("LessonSchema", () => {
  it("accepts a valid lesson", () => {
    expect(LessonSchema.safeParse(sampleLesson).success).toBe(true);
  });
  it("rejects fewer than 3 or more than 5 expressions", () => {
    expect(LessonSchema.safeParse({ ...sampleLesson, expressions: [expr("a"), expr("b")] }).success).toBe(false);
    expect(LessonSchema.safeParse({ ...sampleLesson, expressions: ["a", "b", "c", "d", "e", "f"].map(expr) }).success).toBe(false);
  });
  it("rejects casualness outside 1-3", () => {
    const bad = { ...sampleLesson, expressions: [expr("a"), expr("b"), { ...expr("c"), casualness: 4 }] };
    expect(LessonSchema.safeParse(bad).success).toBe(false);
  });
});

describe("ChatRequestSchema", () => {
  const base = { level: "beginner", lesson: sampleLesson };
  const turns = (n: number) =>
    Array.from({ length: n }, (_, i) => [
      { role: "native", text: `q${i}` },
      { role: "learner", text: `a${i}` },
    ]).flat();

  it("accepts an empty history (first native line)", () => {
    expect(ChatRequestSchema.safeParse({ ...base, history: [] }).success).toBe(true);
  });
  it("accepts up to the max learner turns", () => {
    expect(MAX_LEARNER_TURNS).toBe(5);
    expect(ChatRequestSchema.safeParse({ ...base, history: turns(5) }).success).toBe(true);
  });
  it("rejects a 6th learner turn", () => {
    expect(ChatRequestSchema.safeParse({ ...base, history: turns(6) }).success).toBe(false);
  });
  it("rejects empty and over-long learner text", () => {
    expect(ChatRequestSchema.safeParse({ ...base, history: [{ role: "learner", text: "   " }] }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ ...base, history: [{ role: "learner", text: "x".repeat(501) }] }).success).toBe(false);
  });
  it("rejects a history that ends with the native speaker", () => {
    expect(ChatRequestSchema.safeParse({ ...base, history: [...turns(1), { role: "native", text: "hi" }] }).success).toBe(false);
  });
});

describe("PlacementResultSchema", () => {
  it("only accepts known levels", () => {
    expect(PlacementResultSchema.safeParse({ level: "advanced", reasonJa: "理由" }).success).toBe(true);
    expect(PlacementResultSchema.safeParse({ level: "expert", reasonJa: "理由" }).success).toBe(false);
  });
});

describe("ChatTurnSchema", () => {
  it("rejects replies longer than native history allows", async () => {
    const { ChatTurnSchema } = await import("@/lib/schemas");
    expect(ChatTurnSchema.safeParse({ reply: "x".repeat(2001), nativeVersion: null, noteJa: "" }).success).toBe(false);
    expect(ChatTurnSchema.safeParse({ reply: "x".repeat(2000), nativeVersion: null, noteJa: "" }).success).toBe(true);
  });
});
