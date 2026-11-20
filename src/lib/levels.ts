export type Level = "beginner" | "intermediate" | "advanced";

export const LEVELS: Level[] = ["beginner", "intermediate", "advanced"];

export const LEVEL_LABEL_JA: Record<Level, string> = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "上級",
};

export type LevelProfile = {
  speechRate: number;
  japaneseSupport: "heavy" | "medium" | "light";
  slang: "basic" | "common" | "full";
  lessonLines: [number, number];
};

export const LEVEL_PROFILES: Record<Level, LevelProfile> = {
  beginner: { speechRate: 0.8, japaneseSupport: "heavy", slang: "basic", lessonLines: [4, 6] },
  intermediate: { speechRate: 0.95, japaneseSupport: "medium", slang: "common", lessonLines: [6, 8] },
  advanced: { speechRate: 1.05, japaneseSupport: "light", slang: "full", lessonLines: [6, 8] },
};

export function isLevel(v: unknown): v is Level {
  return typeof v === "string" && (LEVELS as string[]).includes(v);
}
