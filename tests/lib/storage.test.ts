import { describe, expect, it } from "vitest";
import { completeSession, DEFAULT_PROGRESS, loadProgress, saveProgress, setLevel, STORAGE_KEY, toggleLearned } from "@/lib/storage";
import { expr } from "../fixtures";

function memStore(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial));
  return {
    get length() { return data.size; },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}
const throwing = (): Storage => ({ ...memStore(), getItem: () => { throw new Error("denied"); }, setItem: () => { throw new Error("quota"); } });

describe("progress storage", () => {
  it("returns defaults for empty storage", () => {
    expect(loadProgress(memStore())).toEqual(DEFAULT_PROGRESS);
    expect(DEFAULT_PROGRESS).toMatchObject({ version: 1, level: null, sessionCount: 0, expressions: [] });
  });

  it("returns defaults for corrupt JSON, wrong version or throwing storage", () => {
    expect(loadProgress(memStore({ [STORAGE_KEY]: "{oops" }))).toEqual(DEFAULT_PROGRESS);
    expect(loadProgress(memStore({ [STORAGE_KEY]: JSON.stringify({ version: 9 }) }))).toEqual(DEFAULT_PROGRESS);
    expect(loadProgress(throwing())).toEqual(DEFAULT_PROGRESS);
  });

  it("round-trips saved progress", () => {
    const store = memStore();
    const p = setLevel(DEFAULT_PROGRESS, "advanced");
    saveProgress(p, store);
    expect(loadProgress(store)).toEqual(p);
  });

  it("does not throw when saving fails", () => {
    expect(() => saveProgress(DEFAULT_PROGRESS, throwing())).not.toThrow();
  });

  it("counts sessions and merges expressions case/space-insensitively, keeping learned", () => {
    let p = completeSession(DEFAULT_PROGRESS, [expr("gonna")], "2026-11-20T00:00:00Z");
    p = toggleLearned(p, "gonna");
    p = completeSession(p, [expr("Gonna "), expr("no cap")], "2026-11-21T00:00:00Z");
    expect(p.sessionCount).toBe(2);
    expect(p.expressions.map((e) => e.phrase)).toEqual(["gonna", "no cap"]);
    expect(p.expressions[0]).toMatchObject({ learned: true, firstSeenAt: "2026-11-20T00:00:00Z" });
    expect(p.expressions[1]).toMatchObject({ learned: false, firstSeenAt: "2026-11-21T00:00:00Z" });
  });

  it("toggles learned on and off without mutating the input", () => {
    const p = completeSession(DEFAULT_PROGRESS, [expr("wiped")], "t");
    const on = toggleLearned(p, "wiped");
    expect(on.expressions[0].learned).toBe(true);
    expect(p.expressions[0].learned).toBe(false);
    expect(toggleLearned(on, "wiped").expressions[0].learned).toBe(false);
  });
});
