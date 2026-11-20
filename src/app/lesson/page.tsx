"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANGUAGE_ID, getLanguage } from "@/config/languages";
import { ApiError, postJson } from "@/lib/api-client";
import type { ChatMessage, Lesson } from "@/lib/schemas";
import { createBrowserSpeaker, type Speaker } from "@/lib/speech/tts";
import { completeSession } from "@/lib/storage";
import { useProgress } from "@/lib/use-progress";
import { ErrorRetry } from "@/components/ErrorRetry";
import { ListenStep } from "@/components/lesson/ListenStep";
import { ExpressionsStep } from "@/components/lesson/ExpressionsStep";
import { ChatStep } from "@/components/lesson/ChatStep";
import { FeedbackStep } from "@/components/lesson/FeedbackStep";

const lang = getLanguage(DEFAULT_LANGUAGE_ID);
const STEPS = ["聞く", "表現を拾う", "話してみる", "フィードバック"];

export default function LessonPage() {
  const { progress, update } = useProgress();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const sceneId = useMemo(() => lang.scenes[Math.floor(Math.random() * lang.scenes.length)].id, []);
  const level = progress?.level ?? null;

  useEffect(() => setSpeaker(createBrowserSpeaker(lang.speechLang)), []);

  const load = useCallback(async () => {
    if (!level) return;
    setError(null);
    try {
      setLesson(await postJson<Lesson>("/api/lesson", { level, sceneId }));
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "unknown");
    }
  }, [level, sceneId]);

  useEffect(() => {
    if (level && !lesson) void load();
    // 最初の 1 回だけ取得する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const onSaved = useCallback(() => {
    if (lesson) update((p) => completeSession(p, lesson.expressions, new Date().toISOString()));
  }, [lesson, update]);

  if (progress && !level) {
    return (
      <main className="page">
        <p>先にレベル診断をしましょう。</p>
        <Link className="btn primary" href="/placement">
          レベル診断へ
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="bar">
        <Link href="/">← ホーム</Link>
        <h1>今日の学習</h1>
      </header>
      <ol className="steps" aria-label="学習の流れ">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? "current" : i < step ? "done" : undefined} aria-current={i === step ? "step" : undefined}>
            {s}
          </li>
        ))}
      </ol>

      {error && <ErrorRetry code={error} onRetry={load} />}
      {!error && (!lesson || !level) && <p className="muted">会話を準備しています…</p>}

      {lesson && level && step === 0 && <ListenStep lesson={lesson} level={level} speaker={speaker} onNext={() => setStep(1)} />}
      {lesson && level && step === 1 && <ExpressionsStep lesson={lesson} onNext={() => setStep(2)} />}
      {lesson && level && step === 2 && (
        <ChatStep
          lesson={lesson}
          level={level}
          speechLang={lang.speechLang}
          onDone={(h) => {
            setHistory(h);
            setStep(3);
          }}
        />
      )}
      {lesson && level && step === 3 && <FeedbackStep lesson={lesson} level={level} history={history} onSaved={onSaved} />}
    </main>
  );
}
