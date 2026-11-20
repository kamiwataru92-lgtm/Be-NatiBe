import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AiError, generateStructured } from "@/lib/ai";
import { ChatTurnSchema, LessonSchema, PlacementResultSchema, SessionFeedbackSchema } from "@/lib/schemas";

const Schema = z.object({ answer: z.string() });

function fakeClient(impl: () => unknown) {
  const generateContent = vi.fn(async () => impl());
  return { client: { models: { generateContent } } as unknown as GoogleGenAI, generateContent };
}

const base = { name: "chatTurn" as const, schema: Schema, system: "sys", messages: [{ role: "user" as const, content: "hi" }] };

afterEach(() => vi.unstubAllEnvs());

describe("generateStructured", () => {
  it("returns parsed JSON that matches the schema", async () => {
    const { client } = fakeClient(() => ({ text: '{"answer":"yo"}', candidates: [{ finishReason: "STOP" }] }));
    await expect(generateStructured({ ...base, client })).resolves.toEqual({ answer: "yo" });
  });

  it("sends system instruction, JSON mode and maps assistant to model role", async () => {
    const { client, generateContent } = fakeClient(() => ({ text: '{"answer":"ok"}', candidates: [{ finishReason: "STOP" }] }));
    await generateStructured({
      ...base,
      client,
      messages: [
        { role: "user", content: "a" },
        { role: "assistant", content: "b" },
        { role: "user", content: "c" },
      ],
    });
    const arg = (generateContent.mock.calls[0] as unknown[])[0] as {
      model: string;
      contents: { role: string; parts: { text: string }[] }[];
      config: { systemInstruction: string; responseMimeType: string; responseJsonSchema: unknown };
    };
    expect(arg.contents.map((c) => c.role)).toEqual(["user", "model", "user"]);
    expect(arg.contents[1].parts[0].text).toBe("b");
    expect(arg.config.systemInstruction).toBe("sys");
    expect(arg.config.responseMimeType).toBe("application/json");
    expect(arg.config.responseJsonSchema).toBeTruthy();
    expect(arg.model).toBe("gemini-flash-latest");
  });

  it("uses AI_MODEL when set", async () => {
    vi.stubEnv("AI_MODEL", "gemini-test");
    const { client, generateContent } = fakeClient(() => ({ text: '{"answer":"ok"}', candidates: [{ finishReason: "STOP" }] }));
    await generateStructured({ ...base, client });
    expect(((generateContent.mock.calls[0] as unknown[])[0] as { model: string }).model).toBe("gemini-test");
  });

  it("reports a safety stop as refusal", async () => {
    const { client } = fakeClient(() => ({ text: undefined, candidates: [{ finishReason: "SAFETY" }] }));
    await expect(generateStructured({ ...base, client })).rejects.toMatchObject({ kind: "refusal" });
  });

  it("reports a blocked prompt as refusal", async () => {
    const { client } = fakeClient(() => ({ text: undefined, promptFeedback: { blockReason: "OTHER" } }));
    await expect(generateStructured({ ...base, client })).rejects.toMatchObject({ kind: "refusal" });
  });

  it("reports non-JSON and schema mismatch as invalid_output", async () => {
    const a = fakeClient(() => ({ text: "not json", candidates: [{ finishReason: "STOP" }] }));
    await expect(generateStructured({ ...base, client: a.client })).rejects.toMatchObject({ kind: "invalid_output" });
    const b = fakeClient(() => ({ text: '{"answer":1}', candidates: [{ finishReason: "STOP" }] }));
    await expect(generateStructured({ ...base, client: b.client })).rejects.toMatchObject({ kind: "invalid_output" });
  });

  it("maps 429 to rate_limited and other errors to upstream", async () => {
    const a = fakeClient(() => {
      throw new ApiError({ message: "quota", status: 429 });
    });
    await expect(generateStructured({ ...base, client: a.client })).rejects.toMatchObject({ kind: "rate_limited" });
    const b = fakeClient(() => {
      throw new Error("network down");
    });
    const err = await generateStructured({ ...base, client: b.client }).catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.kind).toBe("upstream");
  });

  it("returns schema-valid fixtures without calling the client in mock mode", async () => {
    vi.stubEnv("AI_MOCK", "1");
    const { client, generateContent } = fakeClient(() => ({}));
    const cases = [
      ["lesson", LessonSchema],
      ["chatTurn", ChatTurnSchema],
      ["feedback", SessionFeedbackSchema],
      ["placement", PlacementResultSchema],
    ] as const;
    for (const [name, schema] of cases) {
      const out = await generateStructured({ name, schema: schema as z.ZodType<unknown>, system: "s", messages: base.messages, client });
      expect(schema.safeParse(out).success).toBe(true);
    }
    expect(generateContent).not.toHaveBeenCalled();
  });
});

describe("clientOptions", () => {
  it("uses the v1beta API so model aliases and JSON schema output work", async () => {
    const { clientOptions } = await import("@/lib/ai");
    expect(clientOptions("KEY")).toEqual({ apiKey: "KEY", apiVersion: "v1beta" });
  });
});
