import { DEFAULT_LANGUAGE_ID, getLanguage } from "@/config/languages";
import { generateStructured } from "@/lib/ai";
import { jsonHandler } from "@/lib/api-handler";
import { buildFeedbackPrompt } from "@/lib/prompts";
import { FeedbackRequestSchema, SessionFeedbackSchema } from "@/lib/schemas";

export const POST = jsonHandler(FeedbackRequestSchema, async ({ level, lesson, history }) => {
  const p = buildFeedbackPrompt(getLanguage(DEFAULT_LANGUAGE_ID), level, lesson, history);
  return generateStructured({ name: "feedback", schema: SessionFeedbackSchema, system: p.system, messages: [{ role: "user", content: p.user }] });
});
