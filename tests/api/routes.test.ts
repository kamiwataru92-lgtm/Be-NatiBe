// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { sampleLesson } from "../fixtures";

vi.mock("@/lib/ai", async (orig) => {
  const actual = await orig<typeof import("@/lib/ai")>();
  return { ...actual, generateStructured: vi.fn() };
});

import { AiError, generateStructured } from "@/lib/ai";
import { POST as lesson } from "@/app/api/lesson/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as feedback } from "@/app/api/feedback/route";
import { POST as placement } from "@/app/api/placement/route";

const gen = vi.mocked(generateStructured);
const req = (path: string, body: unknown) =>
  new NextRequest(`http://localhost${path}`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body) });
const turns = (n: number) => Array.from({ length: n }, (_, i) => [{ role: "native", text: `q${i}` }, { role: "learner", text: `a${i}` }]).flat();


describe("API routes", () => {
  it("/api/lesson returns the generated lesson", async () => {
    gen.mockResolvedValue(sampleLesson);
    const res = await lesson(req("/api/lesson", { level: "beginner", sceneId: "cafe" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(sampleLesson);
    expect(gen.mock.calls[0][0].name).toBe("lesson");
  });

  it("/api/chat, /api/feedback, /api/placement pass the right task name", async () => {
    gen.mockClear();
    gen.mockResolvedValue({ ok: true });
    expect((await chat(req("/api/chat", { level: "advanced", lesson: sampleLesson, history: [] }))).status).toBe(200);
    expect((await feedback(req("/api/feedback", { level: "advanced", lesson: sampleLesson, history: turns(2) }))).status).toBe(200);
    expect((await placement(req("/api/placement", { answers: [{ questionId: "l1", answer: "x" }] }))).status).toBe(200);
    expect(gen.mock.calls.map((c) => c[0].name)).toEqual(["chatTurn", "feedback", "placement"]);
  });

  it("rejects bad chat input with 400", async () => {
    gen.mockClear();
    for (const history of [turns(6), [{ role: "learner", text: "x".repeat(501) }], [{ role: "learner", text: "" }]]) {
      const res = await chat(req("/api/chat", { level: "beginner", lesson: sampleLesson, history }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "bad_request" });
    }
    expect(gen).not.toHaveBeenCalled();
  });

  it("rejects unknown scenes, bad levels and invalid JSON with 400", async () => {
    expect((await lesson(req("/api/lesson", { level: "beginner", sceneId: "moon" }))).status).toBe(400);
    expect((await lesson(req("/api/lesson", { level: "expert", sceneId: "cafe" }))).status).toBe(400);
    expect((await lesson(req("/api/lesson", "{nope"))).status).toBe(400);
  });

  it("maps rate limits to 429", async () => {
    gen.mockImplementation(async () => {
      throw new AiError("rate_limited", "quota");
    });
    const res = await lesson(req("/api/lesson", { level: "beginner", sceneId: "cafe" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
  });

  it("maps other AI errors to 502 without leaking details", async () => {
    gen.mockImplementation(async () => {
      throw new AiError("refusal", "secret-key-AIza123 stack");
    });
    const res = await lesson(req("/api/lesson", { level: "beginner", sceneId: "cafe" }));
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "ai_failed", kind: "refusal" });
    expect(text).not.toContain("AIza");
  });
});
