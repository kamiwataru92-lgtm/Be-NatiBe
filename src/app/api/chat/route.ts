import { DEFAULT_LANGUAGE_ID, getLanguage } from "@/config/languages";
import { generateStructured } from "@/lib/ai";
import { jsonHandler } from "@/lib/api-handler";
import { buildChatPrompt } from "@/lib/prompts";
import { ChatRequestSchema, ChatTurnSchema } from "@/lib/schemas";

export const POST = jsonHandler(ChatRequestSchema, async ({ level, lesson, history }) => {
  const p = buildChatPrompt(getLanguage(DEFAULT_LANGUAGE_ID), level, lesson, history);
  const turn = await generateStructured({ name: "chatTurn", schema: ChatTurnSchema, system: p.system, messages: p.messages });
  return history.length === 0 ? { ...turn, nativeVersion: null, noteJa: "" } : turn;
});
