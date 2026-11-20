import { afterEach, describe, expect, it, vi } from "vitest";
import { demoResponse } from "@/lib/demo";
import { postJson } from "@/lib/api-client";
import { ChatTurnSchema, LessonSchema, PlacementResultSchema, SessionFeedbackSchema } from "@/lib/schemas";

afterEach(() => vi.unstubAllEnvs());

describe("demoResponse", () => {
  it("returns schema-valid data for every API", () => {
    expect(LessonSchema.safeParse(demoResponse("/api/lesson", {})).success).toBe(true);
    expect(SessionFeedbackSchema.safeParse(demoResponse("/api/feedback", {})).success).toBe(true);
    expect(PlacementResultSchema.safeParse(demoResponse("/api/placement", {})).success).toBe(true);
    expect(ChatTurnSchema.safeParse(demoResponse("/api/chat", { history: [{ role: "learner", text: "hi" }] })).success).toBe(true);
  });
  it("opens the chat without a native rewrite", () => {
    const t = demoResponse("/api/chat", { history: [] }) as { nativeVersion: unknown; noteJa: string };
    expect(t.nativeVersion).toBeNull();
    expect(t.noteJa).toBe("");
  });
  it("is used by postJson instead of the network in demo mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO", "1");
    const f = vi.fn();
    const out = await postJson("/api/placement", { answers: [] }, f as unknown as typeof fetch);
    expect(PlacementResultSchema.safeParse(out).success).toBe(true);
    expect(f).not.toHaveBeenCalled();
  });
});
