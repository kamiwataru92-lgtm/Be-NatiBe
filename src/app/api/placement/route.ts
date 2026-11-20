import { DEFAULT_LANGUAGE_ID, getLanguage } from "@/config/languages";
import { generateStructured } from "@/lib/ai";
import { jsonHandler } from "@/lib/api-handler";
import { buildPlacementPrompt } from "@/lib/prompts";
import { PlacementRequestSchema, PlacementResultSchema } from "@/lib/schemas";

export const POST = jsonHandler(PlacementRequestSchema, async ({ answers }) => {
  const p = buildPlacementPrompt(getLanguage(DEFAULT_LANGUAGE_ID), answers);
  return generateStructured({ name: "placement", schema: PlacementResultSchema, system: p.system, messages: [{ role: "user", content: p.user }] });
});
