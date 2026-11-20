"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, postJson } from "@/lib/api-client";
import type { Level } from "@/lib/levels";
import type { ChatMessage, Lesson, SessionFeedback } from "@/lib/schemas";
import { ErrorRetry } from "@/components/ErrorRetry";

export function FeedbackStep({ lesson, level, history, onSaved }: { lesson: Lesson; level: Level; history: ChatMessage[]; onSaved(): void }) {
  const [fb, setFb] = useState<SessionFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saved = useRef(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await postJson<SessionFeedback>("/api/feedback", { level, lesson, history });
      setFb(r);
      if (!saved.current) {
        saved.current = true;
        onSaved();
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.code : "unknown");
    }
  }, [level, lesson, history, onSaved]);

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  if (error) return <ErrorRetry code={error} onRetry={load} />;
  if (!fb) return <p className="muted">フィードバックを作っています…</p>;

  return (
    <section className="stack feedback">
      <div>
        <h2>伝わり方</h2>
        <p>{fb.understoodJa}</p>
      </div>
      {fb.rewrites.length > 0 && (
        <div>
          <h2>ネイティブならこう言う</h2>
          {fb.rewrites.map((r, i) => (
            <div key={i} className="rewrite" lang="en">
              <span className="from">{r.original}</span>
              <span>{r.native}</span>
            </div>
          ))}
        </div>
      )}
      <div>
        <h2>話の組み立て</h2>
        <p>{fb.structureJa}</p>
      </div>
      {fb.usedExpressions.length > 0 && (
        <p className="small">
          使えた表現：
          {fb.usedExpressions.map((e) => (
            <mark key={e} lang="en">
              {e}
            </mark>
          ))}
        </p>
      )}
      <p className="muted small">今日の表現は表現リストに保存しました。</p>
      <Link className="btn primary" href="/">
        ホームに戻る
      </Link>
    </section>
  );
}
