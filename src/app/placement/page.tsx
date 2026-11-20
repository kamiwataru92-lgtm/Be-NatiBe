"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_LANGUAGE_ID, getLanguage } from "@/config/languages";
import { ApiError, postJson } from "@/lib/api-client";
import { LEVEL_LABEL_JA } from "@/lib/levels";
import { PLACEMENT_QUESTIONS } from "@/lib/prompts";
import type { PlacementResult } from "@/lib/schemas";
import { createBrowserSpeaker, type Speaker } from "@/lib/speech/tts";
import { setLevel } from "@/lib/storage";
import { useProgress } from "@/lib/use-progress";
import { ErrorRetry } from "@/components/ErrorRetry";

const lang = getLanguage(DEFAULT_LANGUAGE_ID);

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function PlacementPage() {
  const { update } = useProgress();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; answer: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<PlacementResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const speaker = useRef<Speaker | null>(null);
  useEffect(() => {
    speaker.current = createBrowserSpeaker(lang.speechLang);
    return () => speaker.current?.stop();
  }, []);

  const q = PLACEMENT_QUESTIONS[index];
  const choices = useMemo(() => (q?.choicesEn ? shuffle(q.choicesEn) : []), [q]);

  async function finish(all: typeof answers) {
    setBusy(true);
    setError(null);
    try {
      const r = await postJson<PlacementResult>("/api/placement", { answers: all });
      update((p) => setLevel(p, r.level));
      setResult(r);
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "unknown");
    }
    setBusy(false);
  }

  function answer(text: string) {
    const all = [...answers, { questionId: q.id, answer: text }];
    setAnswers(all);
    setDraft("");
    if (index + 1 < PLACEMENT_QUESTIONS.length) setIndex(index + 1);
    else void finish(all);
  }

  return (
    <main className="page">
      <header className="bar">
        <Link href="/">← ホーム</Link>
        <h1>レベル診断</h1>
      </header>

      {result ? (
        <section className="stack">
          <p>
            あなたのレベルは <strong className="big">{LEVEL_LABEL_JA[result.level]}</strong>
          </p>
          <p>{result.reasonJa}</p>
          <Link className="btn primary" href="/">
            ホームへ
          </Link>
        </section>
      ) : error ? (
        <ErrorRetry code={error} onRetry={() => finish(answers)} />
      ) : busy || !q ? (
        <p className="muted">判定しています…</p>
      ) : (
        <section className="stack">
          <p className="muted small">
            {index + 1} / {PLACEMENT_QUESTIONS.length}
          </p>
          {q.kind === "listen" ? (
            <>
              <p>英語を聞いて、内容に合うものを選んでください。</p>
              {speaker.current ? (
                <button className="btn" type="button" onClick={() => speaker.current?.speakLines([{ speaker: "A", text: q.promptEn }], { rate: 1 })}>
                  ▶ 聞く
                </button>
              ) : (
                <p className="bubble" lang="en">{q.promptEn}</p>
              )}
              <div className="choices">
                {choices.map((c) => (
                  <button key={c} className="btn choice" type="button" lang="en" onClick={() => answer(c)}>
                    {c}
                  </button>
                ))}
              </div>
              <button className="link-btn" type="button" onClick={() => answer("(skipped: could not tell)")}>
                わからない
              </button>
            </>
          ) : (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault();
                if (draft.trim()) answer(draft.trim());
              }}
            >
              <p>友達にこう言われました。英語で返してみてください。</p>
              <p className="bubble" lang="en">{q.promptEn}</p>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={500} rows={3} lang="en" aria-label="あなたの返事" />
              <button className="btn primary" type="submit" disabled={!draft.trim()}>
                答える
              </button>
              <button className="link-btn" type="button" onClick={() => answer("(skipped)")}>
                わからない
              </button>
            </form>
          )}
        </section>
      )}
    </main>
  );
}
