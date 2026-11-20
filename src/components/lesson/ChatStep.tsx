"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, postJson } from "@/lib/api-client";
import type { Level } from "@/lib/levels";
import { MAX_LEARNER_CHARS, MAX_LEARNER_TURNS, type ChatMessage, type ChatTurn, type Lesson } from "@/lib/schemas";
import { isRecognitionSupported, startRecognition } from "@/lib/speech/stt";
import { ErrorRetry } from "@/components/ErrorRetry";

type Shown = ChatMessage & { nativeVersion?: string | null; noteJa?: string };

export function ChatStep({ lesson, level, speechLang, onDone }: { lesson: Lesson; level: Level; speechLang: string; onDone(history: ChatMessage[]): void }) {
  const [shown, setShown] = useState<Shown[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null); // 送信に失敗した発言（null は最初の呼びかけ）
  const [listening, setListening] = useState(false);
  const [micOk, setMicOk] = useState(false);
  const rec = useRef<{ stop(): void } | null>(null);
  const started = useRef(false);

  useEffect(() => setMicOk(isRecognitionSupported()), []);

  const history: ChatMessage[] = shown.map(({ role, text }) => ({ role, text }) as ChatMessage);
  const learnerTurns = history.filter((m) => m.role === "learner").length;
  const finished = learnerTurns >= MAX_LEARNER_TURNS;

  const send = useCallback(
    async (text: string | null) => {
      setBusy(true);
      setError(null);
      setPending(text);
      if (text) setDraft((d) => (d.trim() === text ? "" : d));
      const base = shown.map(({ role, text }) => ({ role, text }) as ChatMessage);
      const next: ChatMessage[] = text ? [...base, { role: "learner", text }] : base;
      try {
        const turn = await postJson<ChatTurn>("/api/chat", { level, lesson, history: next });
        setShown((prev) => [
          ...prev,
          ...(text ? [{ role: "learner" as const, text, nativeVersion: turn.nativeVersion, noteJa: turn.noteJa }] : []),
          { role: "native" as const, text: turn.reply },
        ]);
        setPending(null);
      } catch (e) {
        setError(e instanceof ApiError ? e.code : "unknown");
        // 送れなかった文は入力欄に戻す（その間に書いた文があればそちらを残す）
        if (text) setDraft((d) => d || text);
      }
      setBusy(false);
    },
    [shown, level, lesson],
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void send(null);
  }, [send]);

  function toggleMic() {
    if (listening) {
      rec.current?.stop();
      return;
    }
    rec.current = startRecognition(speechLang, {
      onResult: (t) => setDraft((d) => (d ? `${d} ${t}` : t).slice(0, MAX_LEARNER_CHARS)),
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    });
    setListening(!!rec.current);
  }

  const trimmed = draft.trim();
  const canSend = !busy && !finished && !error && trimmed.length > 0 && draft.length <= MAX_LEARNER_CHARS;

  return (
    <section className="stack">
      <p className="muted small">同じ場面で、ネイティブと話してみましょう。さっきの表現を使えたら上出来です。</p>
      <ol className="thread" aria-label="会話">
        {shown.map((m, i) =>
          m.role === "native" ? (
            <li key={i} className="bubble" lang="en">
              {m.text}
            </li>
          ) : (
            <li key={i} className="stack" style={{ gap: 4 }}>
              <span className="bubble me" lang="en">
                {m.text}
              </span>
              {m.nativeVersion && (
                <span className="native-says">
                  ネイティブならこう言う：<span lang="en">{m.nativeVersion}</span>
                </span>
              )}
              {m.noteJa && <span className="native-says muted">{m.noteJa}</span>}
            </li>
          ),
        )}
        {busy && <li className="muted small">…</li>}
      </ol>

      {error && <ErrorRetry code={error} onRetry={() => send(pending)} />}

      {finished && (
        <button className="btn primary" type="button" onClick={() => onDone(history)}>
          フィードバックを見る
        </button>
      )}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) void send(trimmed);
        }}
      >
        <div className="composer-row">
          <textarea
            aria-label="あなたの返事"
            lang="en"
            rows={2}
            value={draft}
            disabled={finished || shown.length === 0}
            onChange={(e) => setDraft(e.target.value)}
          />
          {micOk && (
            <button className="btn mic" type="button" aria-pressed={listening} aria-label={listening ? "マイクを止める" : "マイクで話す"} onClick={toggleMic}>
              🎤
            </button>
          )}
        </div>
        <div className="composer-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <span className={`small ${draft.length > MAX_LEARNER_CHARS ? "error" : "muted"}`}>
            あと {MAX_LEARNER_TURNS - learnerTurns} 回{draft.length > MAX_LEARNER_CHARS ? `・${MAX_LEARNER_CHARS} 文字までです` : ""}
          </span>
          <button className="btn primary" type="submit" disabled={!canSend}>
            送る
          </button>
        </div>
      </form>
    </section>
  );
}
