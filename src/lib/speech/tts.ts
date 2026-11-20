// 読み上げ担当。高品質な音声 API に替えるときは Speaker を実装した別の関数を作り、呼び出し側で差し替える。

export type SpokenLine = { speaker: string; text: string };

export interface Speaker {
  speakLines(lines: SpokenLine[], opts: { rate: number; onLine?: (i: number) => void }): Promise<void>;
  stop(): void;
}

const norm = (lang: string) => lang.replace("_", "-").toLowerCase();

export function assignVoices(voices: { name: string; lang: string }[], speakers: string[], lang: string): Record<string, string | null> {
  const matching = voices.filter((v) => norm(v.lang) === norm(lang));
  const out: Record<string, string | null> = {};
  speakers.forEach((s, i) => {
    out[s] = matching.length ? matching[i % matching.length].name : null;
  });
  return out;
}

export function waitForVoices(synth: SpeechSynthesis, timeoutMs = 1000): Promise<SpeechSynthesisVoice[]> {
  const now = synth.getVoices();
  if (now.length) return Promise.resolve(now);
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      synth.removeEventListener?.("voiceschanged", done);
      resolve(synth.getVoices());
    };
    const timer = setTimeout(done, timeoutMs);
    synth.addEventListener?.("voiceschanged", done);
  });
}

function defaultSynth(): SpeechSynthesis | undefined {
  return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : undefined;
}

export function createBrowserSpeaker(lang: string, synth: SpeechSynthesis | undefined = defaultSynth()): Speaker | null {
  if (!synth) return null;
  let cancelled = false;

  return {
    async speakLines(lines, { rate, onLine }) {
      cancelled = false;
      synth.cancel();
      const voices = await waitForVoices(synth);
      const byName = new Map(voices.map((v) => [v.name, v]));
      const assigned = assignVoices(voices, [...new Set(lines.map((l) => l.speaker))], lang);
      for (let i = 0; i < lines.length && !cancelled; i++) {
        onLine?.(i);
        await new Promise<void>((resolve) => {
          const u = new SpeechSynthesisUtterance(lines[i].text);
          u.lang = lang;
          u.rate = rate;
          const voiceName = assigned[lines[i].speaker];
          if (voiceName) u.voice = byName.get(voiceName) ?? null;
          u.onend = () => resolve();
          u.onerror = () => resolve();
          synth.speak(u);
        });
      }
    },
    stop() {
      cancelled = true;
      synth.cancel();
    },
  };
}
