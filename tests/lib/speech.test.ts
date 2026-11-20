import { afterEach, describe, expect, it, vi } from "vitest";
import { assignVoices, createBrowserSpeaker, waitForVoices } from "@/lib/speech/tts";
import { isRecognitionSupported } from "@/lib/speech/stt";

type V = { name: string; lang: string };
const v = (name: string, lang = "en-US"): V => ({ name, lang });

class FakeUtterance {
  rate = 1; lang = ""; voice: unknown = null; onend: (() => void) | null = null; onerror: (() => void) | null = null;
  constructor(public text: string) {}
}

function fakeSynth(voices: V[]) {
  const spoken: FakeUtterance[] = [];
  const listeners: (() => void)[] = [];
  const synth = {
    getVoices: () => voices,
    speak: (u: FakeUtterance) => { spoken.push(u); queueMicrotask(() => u.onend?.()); },
    cancel: vi.fn(),
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
    removeEventListener: () => {},
  };
  return { synth: synth as unknown as SpeechSynthesis, spoken, fire: () => listeners.forEach((f) => f()), voices };
}

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("assignVoices", () => {
  it("gives each speaker a different voice when possible", () => {
    const r = assignVoices([v("A"), v("B"), v("C"), v("J", "ja-JP")], ["Sam", "Jess"], "en-US");
    expect(r.Sam).not.toBe(r.Jess);
    expect([r.Sam, r.Jess].every((n) => ["A", "B", "C"].includes(n!))).toBe(true);
  });
  it("reuses the voice when only one matches", () => {
    expect(assignVoices([v("A")], ["Sam", "Jess"], "en-US")).toEqual({ Sam: "A", Jess: "A" });
  });
  it("returns null when no voice matches the language", () => {
    expect(assignVoices([v("J", "ja-JP")], ["Sam"], "en-US")).toEqual({ Sam: null });
  });
  it("matches en_US style language tags", () => {
    expect(assignVoices([v("A", "en_US")], ["Sam"], "en-US")).toEqual({ Sam: "A" });
  });
});

describe("waitForVoices", () => {
  it("gives up after the timeout with an empty list", async () => {
    vi.useFakeTimers();
    const { synth } = fakeSynth([]);
    const p = waitForVoices(synth, 1000);
    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toEqual([]);
  });
  it("resolves when voiceschanged arrives", async () => {
    const f = fakeSynth([]);
    const p = waitForVoices(f.synth, 1000);
    f.voices.push(v("A"));
    f.fire();
    await expect(p).resolves.toHaveLength(1);
  });
});

describe("createBrowserSpeaker", () => {
  it("returns null without speech synthesis", () => {
    expect(createBrowserSpeaker("en-US", undefined)).toBeNull();
  });
  it("speaks each line at the given rate and reports progress", async () => {
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    const f = fakeSynth([v("A"), v("B")]);
    const speaker = createBrowserSpeaker("en-US", f.synth)!;
    const seen: number[] = [];
    await speaker.speakLines([{ speaker: "Sam", text: "one" }, { speaker: "Jess", text: "two" }], { rate: 0.8, onLine: (i) => seen.push(i) });
    expect(seen).toEqual([0, 1]);
    expect(f.spoken.map((u) => [u.text, u.rate, u.lang])).toEqual([["one", 0.8, "en-US"], ["two", 0.8, "en-US"]]);
  });
});

describe("isRecognitionSupported", () => {
  it("detects standard and webkit speech recognition", () => {
    expect(isRecognitionSupported({ SpeechRecognition: class {} } as unknown as Window)).toBe(true);
    expect(isRecognitionSupported({ webkitSpeechRecognition: class {} } as unknown as Window)).toBe(true);
    expect(isRecognitionSupported({} as Window)).toBe(false);
  });
});
