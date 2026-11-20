// 音声入力（ブラウザの音声認識）。使えないブラウザではテキスト入力だけにする。

type RecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

function getCtor(win?: Window): RecognitionCtor | undefined {
  const w = (win ?? (typeof window !== "undefined" ? window : undefined)) as unknown as
    | { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
    | undefined;
  return w?.SpeechRecognition ?? w?.webkitSpeechRecognition;
}

export function isRecognitionSupported(win?: Window): boolean {
  return !!getCtor(win);
}

export function startRecognition(
  lang: string,
  handlers: { onResult(text: string): void; onError(code: string): void; onEnd(): void },
): { stop(): void } | null {
  const Ctor = getCtor();
  if (!Ctor) return null;
  const r = new Ctor();
  r.lang = lang;
  r.interimResults = false;
  r.continuous = false;
  r.onresult = (e) => {
    const text = Array.from(e.results).map((res) => res[0]?.transcript ?? "").join(" ").trim();
    if (text) handlers.onResult(text);
  };
  r.onerror = (e) => handlers.onError(e.error);
  r.onend = () => handlers.onEnd();
  try {
    r.start();
  } catch {
    handlers.onError("start_failed");
    return null;
  }
  return { stop: () => r.stop() };
}
