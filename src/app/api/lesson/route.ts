import { DEFAULT_LANGUAGE_ID, getLanguage } from "@/config/languages";
import { generateStructured } from "@/lib/ai";
import { BadRequest, jsonHandler } from "@/lib/api-handler";
import { buildLessonPrompt } from "@/lib/prompts";
import { LessonRequestSchema, LessonSchema } from "@/lib/schemas";

export const POST = jsonHandler(LessonRequestSchema, async ({ level, sceneId }) => {
  const lang = getLanguage(DEFAULT_LANGUAGE_ID);
  const scene = lang.scenes.find((s) => s.id === sceneId);
  if (!scene) throw new BadRequest();
  const p = buildLessonPrompt(lang, level, scene);
  return generateStructured({ name: "lesson", schema: LessonSchema, system: p.system, messages: [{ role: "user", content: p.user }] });
});
