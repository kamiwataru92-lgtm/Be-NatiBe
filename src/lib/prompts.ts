import type { LanguageConfig, Scene } from "@/config/languages";
import { LEVEL_PROFILES, type Level } from "@/lib/levels";
import type { ChatMessage, Lesson } from "@/lib/schemas";

export type Prompt = { system: string; user: string };
export type ChatPrompt = { system: string; messages: { role: "user" | "assistant"; content: string }[] };

const SUPPORT: Record<LevelProfileKey, string> = {
  heavy: "The learner is a beginner (junior-high-school English). Explain generously and simply in Japanese.",
  medium: "The learner is intermediate. Keep Japanese explanations concise.",
  light: "The learner is advanced (high test scores but little speaking practice). Keep Japanese explanations short and focus on nuance.",
};
type LevelProfileKey = "heavy" | "medium" | "light";

const SLANG: Record<"basic" | "common" | "full", string> = {
  basic: "Use only the most common, safe casual expressions and keep sentences short and clear.",
  common: "Use common everyday slang and idioms at a relaxed conversational pace.",
  full: "Use slang, idioms and reductions freely, exactly as natives talk to each other at natural speed. Do not simplify.",
};

function levelGuide(level: Level): string {
  const p = LEVEL_PROFILES[level];
  return `${SUPPORT[p.japaneseSupport]} ${SLANG[p.slang]}`;
}

export function buildLessonPrompt(lang: LanguageConfig, level: Level, scene: Scene): Prompt {
  const [min, max] = LEVEL_PROFILES[level].lessonLines;
  return {
    system: [
      `You write short listening lessons of natural ${lang.nativeLabel} conversation for Japanese learners who want to sound like natives rather than perfect grammar.`,
      lang.styleGuide,
      levelGuide(level),
      `Write a dialogue between 2 or 3 named speakers with ${min} to ${max} lines in total. Write reductions like gonna/wanna exactly as spoken.`,
      "Then pick 3 to 5 slang words or idioms from the dialogue. For each give meaningJa (meaning in Japanese), usageJa (when and with whom to use it, in Japanese), casualness (1 = fine anywhere, 3 = friends only) and exampleEn (a new example sentence).",
      `Return JSON only. Set sceneId to "${scene.id}".`,
    ].join("\n"),
    user: `Scene: ${scene.descriptionEn}`,
  };
}

function lessonContext(lesson: Lesson): string {
  return [
    `Lesson "${lesson.title}" (scene ${lesson.sceneId}).`,
    "Dialogue:",
    ...lesson.lines.map((l) => `${l.speaker}: ${l.text}`),
    `Target expressions: ${lesson.expressions.map((e) => e.phrase).join(", ")}`,
  ].join("\n");
}

export function buildChatPrompt(lang: LanguageConfig, level: Level, lesson: Lesson, history: ChatMessage[]): ChatPrompt {
  const system = [
    `You are a friendly native speaker of ${lang.nativeLabel} role-playing the same scene as the lesson below with a Japanese learner.`,
    lang.styleGuide,
    levelGuide(level),
    lessonContext(lesson),
    "Keep each reply to 1-3 short sentences and end with something the learner can respond to. Naturally use the target expressions and invite the learner to use them.",
    "If there are no learner messages yet, open the conversation in character with a natural first line.",
    "nativeVersion: rewrite the learner's latest message the way a native would actually say it in this situation, or null if it is already natural (or if there is no learner message yet). Do not nitpick grammar unless it blocks understanding.",
    "noteJa: one short tip in Japanese about the learner's latest message (empty string if none).",
    "Return JSON only.",
  ].join("\n");

  const messages: ChatPrompt["messages"] = [{ role: "user", content: "(Start the scene.)" }];
  for (const m of history) {
    const role = m.role === "learner" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    if (last.role === role) last.content += `\n${m.text}`;
    else messages.push({ role, content: m.text });
  }
  return { system, messages };
}

export function buildFeedbackPrompt(lang: LanguageConfig, level: Level, lesson: Lesson, history: ChatMessage[]): Prompt {
  return {
    system: [
      `You are a coach for Japanese learners of ${lang.nativeLabel} who care about communicating like natives, not about perfect grammar.`,
      levelGuide(level),
      "Point out a grammar mistake only if it blocks understanding.",
      "Write all explanations in Japanese:",
      "- understoodJa: how the learner came across to a native listener overall.",
      "- rewrites: for learner messages that sounded unnatural, the original and how a native would say it.",
      "- structureJa: advice on how the learner organized what they wanted to say (order, connectors, giving reasons).",
      "- usedExpressions: which target expressions the learner actually used.",
      "Return JSON only.",
    ].join("\n"),
    user: [lessonContext(lesson), "Practice conversation:", ...history.map((m) => `${m.role === "learner" ? "Learner" : "Native"}: ${m.text}`)].join("\n"),
  };
}

export type PlacementQuestion = { id: string; kind: "listen" | "reply"; promptEn: string; choicesEn?: string[] };

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  { id: "l1", kind: "listen", promptEn: "Can I get a medium latte, please?", choicesEn: ["Ordering a drink", "Asking for directions", "Paying a bill"] },
  { id: "l2", kind: "listen", promptEn: "I'm kinda beat, so I'm just gonna head home.", choicesEn: ["They're tired and going home", "They won a game", "They're going to a party"] },
  { id: "l3", kind: "listen", promptEn: "No cap, that show was lowkey fire. You gotta check it out.", choicesEn: ["The show was really good", "The show was boring", "The show was cancelled"] },
  { id: "r1", kind: "reply", promptEn: "Hey! How was your weekend?" },
  { id: "r2", kind: "reply", promptEn: "I'm thinking of grabbing some food after work. Wanna come?" },
];

export function buildPlacementPrompt(lang: LanguageConfig, answers: { questionId: string; answer: string }[]): Prompt {
  const lines = answers.map((a) => {
    const q = PLACEMENT_QUESTIONS.find((x) => x.id === a.questionId);
    const label = q ? `${q.kind} question "${q.promptEn}"${q.choicesEn ? ` (correct: "${q.choicesEn[0]}")` : ""}` : `question ${a.questionId}`;
    return `${label} -> learner answered: ${a.answer}`;
  });
  return {
    system: [
      `You place Japanese learners of ${lang.nativeLabel} into one of three levels: beginner (junior-high-school English), intermediate, advanced (understands well but needs natural speaking practice).`,
      "Judge listening of casual speech and how naturally they reply. Write reasonJa in Japanese in one or two sentences. Return JSON only.",
    ].join("\n"),
    user: lines.join("\n"),
  };
}
