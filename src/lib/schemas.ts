import { z } from "zod";
import { LEVELS } from "@/lib/levels";

export const LevelSchema = z.enum(LEVELS as ["beginner", "intermediate", "advanced"]);

export const ExpressionSchema = z.object({
  phrase: z.string().min(1),
  meaningJa: z.string().min(1),
  usageJa: z.string().min(1),
  casualness: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  exampleEn: z.string().min(1),
});
export type Expression = z.infer<typeof ExpressionSchema>;

export const LessonSchema = z.object({
  title: z.string().min(1),
  sceneId: z.string().min(1),
  speakers: z.array(z.string().min(1)).min(2).max(3),
  lines: z.array(z.object({ speaker: z.string().min(1), text: z.string().min(1) })).min(2),
  expressions: z.array(ExpressionSchema).min(3).max(5),
});
export type Lesson = z.infer<typeof LessonSchema>;

export const MAX_NATIVE_CHARS = 2000;

export const ChatTurnSchema = z.object({
  reply: z.string().min(1).max(MAX_NATIVE_CHARS),
  nativeVersion: z.string().nullable(),
  noteJa: z.string(),
});
export type ChatTurn = z.infer<typeof ChatTurnSchema>;

export const SessionFeedbackSchema = z.object({
  understoodJa: z.string().min(1),
  rewrites: z.array(z.object({ original: z.string(), native: z.string() })),
  structureJa: z.string().min(1),
  usedExpressions: z.array(z.string()),
});
export type SessionFeedback = z.infer<typeof SessionFeedbackSchema>;

export const PlacementResultSchema = z.object({ level: LevelSchema, reasonJa: z.string().min(1) });
export type PlacementResult = z.infer<typeof PlacementResultSchema>;

export const MAX_LEARNER_TURNS = 5;
export const MAX_LEARNER_CHARS = 500;
export const LearnerText = z.string().trim().min(1).max(MAX_LEARNER_CHARS);

export const ChatMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("learner"), text: LearnerText }),
  z.object({ role: z.literal("native"), text: z.string().min(1).max(MAX_NATIVE_CHARS) }),
]);
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

const HistorySchema = z
  .array(ChatMessageSchema)
  .max(MAX_LEARNER_TURNS * 2 + 1)
  .refine((h) => h.filter((m) => m.role === "learner").length <= MAX_LEARNER_TURNS, "too many learner turns");

export const LessonRequestSchema = z.object({ level: LevelSchema, sceneId: z.string().min(1) });

export const ChatRequestSchema = z.object({
  level: LevelSchema,
  lesson: LessonSchema,
  history: HistorySchema.refine((h) => h.length === 0 || h[h.length - 1].role === "learner", "must end with learner"),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const FeedbackRequestSchema = z.object({
  level: LevelSchema,
  lesson: LessonSchema,
  history: HistorySchema.refine((h) => h.some((m) => m.role === "learner"), "needs learner turns"),
});
export type FeedbackRequest = z.infer<typeof FeedbackRequestSchema>;

export const PlacementRequestSchema = z.object({
  answers: z.array(z.object({ questionId: z.string().min(1), answer: z.string().max(MAX_LEARNER_CHARS) })).min(1).max(10),
});
export type PlacementRequest = z.infer<typeof PlacementRequestSchema>;
