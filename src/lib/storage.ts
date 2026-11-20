import { z } from "zod";
import type { Level } from "@/lib/levels";
import { ExpressionSchema, LevelSchema, type Expression } from "@/lib/schemas";

export type SavedExpression = Expression & { learned: boolean; firstSeenAt: string };
export type Progress = { version: 1; level: Level | null; sessionCount: number; expressions: SavedExpression[] };

export const STORAGE_KEY = "be-natibe:progress";
export const DEFAULT_PROGRESS: Progress = Object.freeze({ version: 1, level: null, sessionCount: 0, expressions: [] }) as Progress;

const ProgressSchema = z.object({
  version: z.literal(1),
  level: LevelSchema.nullable(),
  sessionCount: z.number().int().min(0),
  expressions: z.array(ExpressionSchema.extend({ learned: z.boolean(), firstSeenAt: z.string() })),
});

// localStorage が使えない環境では、このタブの中だけで値を持つ
let memoryFallback: Progress = DEFAULT_PROGRESS;
let saveFailed = false;

function defaultStore(): Storage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

export function loadProgress(store: Storage | undefined = defaultStore()): Progress {
  if (saveFailed) return memoryFallback;
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return store ? DEFAULT_PROGRESS : memoryFallback;
    const parsed = ProgressSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : DEFAULT_PROGRESS;
  } catch {
    return memoryFallback;
  }
}

export function saveProgress(p: Progress, store: Storage | undefined = defaultStore()): void {
  memoryFallback = p;
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(p));
    saveFailed = false;
  } catch {
    saveFailed = true;
    // 保存できなくても学習は続けられる
  }
}

export function setLevel(p: Progress, level: Level): Progress {
  return { ...p, level };
}

const key = (phrase: string) => phrase.trim().toLowerCase();

export function completeSession(p: Progress, expressions: Expression[], nowIso: string): Progress {
  const list = [...p.expressions];
  const seen = new Set(list.map((e) => key(e.phrase)));
  for (const e of expressions) {
    if (seen.has(key(e.phrase))) continue;
    seen.add(key(e.phrase));
    list.push({ ...e, phrase: e.phrase.trim(), learned: false, firstSeenAt: nowIso });
  }
  return { ...p, sessionCount: p.sessionCount + 1, expressions: list };
}

export function toggleLearned(p: Progress, phrase: string): Progress {
  return { ...p, expressions: p.expressions.map((e) => (key(e.phrase) === key(phrase) ? { ...e, learned: !e.learned } : e)) };
}
