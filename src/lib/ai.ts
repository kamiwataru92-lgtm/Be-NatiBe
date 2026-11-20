import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { MOCK_FIXTURES } from "@/lib/mock-fixtures";

// AI 提供元との唯一の接点。別の AI に替えるときはこのファイルだけを書き換える。

export type AiErrorKind = "refusal" | "invalid_output" | "rate_limited" | "upstream";

export class AiError extends Error {
  constructor(public kind: AiErrorKind, message: string) {
    super(message);
    this.name = "AiError";
  }
}

export type AiTaskName = keyof typeof MOCK_FIXTURES;

export type GenerateArgs<T> = {
  name: AiTaskName;
  schema: z.ZodType<T>;
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
  client?: GoogleGenAI;
};

const BLOCKING_FINISH = new Set(["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION", "IMAGE_SAFETY"]);

/** SDK の既定は v1。モデル名の別名（-latest）と JSON スキーマ指定は v1beta でしか使えない */
export function clientOptions(apiKey: string | undefined) {
  return { apiKey, apiVersion: "v1beta" };
}

let defaultClient: GoogleGenAI | undefined;
function getClient(): GoogleGenAI {
  defaultClient ??= new GoogleGenAI(clientOptions(process.env.GEMINI_API_KEY));
  return defaultClient;
}

export async function generateStructured<T>({ name, schema, system, messages, client }: GenerateArgs<T>): Promise<T> {
  if (process.env.AI_MOCK === "1") {
    return schema.parse(structuredClone(MOCK_FIXTURES[name]));
  }

  let response;
  try {
    response = await (client ?? getClient()).models.generateContent({
      model: process.env.AI_MODEL || "gemini-flash-latest",
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      config: {
        systemInstruction: system,
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(schema),
      },
    });
  } catch (e) {
    if (e instanceof ApiError && e.status === 429) throw new AiError("rate_limited", "Rate limited");
    throw new AiError("upstream", e instanceof Error ? e.message : "Upstream error");
  }

  const finish = response.candidates?.[0]?.finishReason;
  if (response.promptFeedback?.blockReason || (finish && BLOCKING_FINISH.has(finish))) {
    throw new AiError("refusal", `Blocked: ${response.promptFeedback?.blockReason ?? finish}`);
  }

  let data: unknown;
  try {
    data = JSON.parse(response.text ?? "");
  } catch {
    throw new AiError("invalid_output", "Response was not JSON");
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new AiError("invalid_output", "Response did not match schema");
  return parsed.data;
}
