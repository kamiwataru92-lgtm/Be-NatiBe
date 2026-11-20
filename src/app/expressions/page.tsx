"use client";

import Link from "next/link";
import { toggleLearned } from "@/lib/storage";
import { useProgress } from "@/lib/use-progress";
import { Casualness } from "@/components/Casualness";

export default function ExpressionsPage() {
  const { progress, update } = useProgress();
  if (!progress) return <main className="page" />;
  const list = [...progress.expressions].reverse();

  return (
    <main className="page">
      <header className="bar">
        <Link href="/">← ホーム</Link>
        <h1>表現リスト</h1>
      </header>
      {list.length === 0 ? (
        <div className="stack">
          <p>まだ表現はありません</p>
          <p className="muted">学習を 1 回終えると、会話に出てきたスラングやイディオムがここにたまります。</p>
          <Link className="btn primary" href="/">
            学習をはじめる
          </Link>
        </div>
      ) : (
        <ul className="expr-list">
          {list.map((e) => (
            <li key={e.phrase} className={e.learned ? "learned" : undefined}>
              <label>
                <input type="checkbox" checked={e.learned} onChange={() => update((p) => toggleLearned(p, e.phrase))} aria-label={`${e.phrase} を覚えた`} />
                <span className="phrase">
                  <mark>{e.phrase}</mark>
                </span>
              </label>
              <p>{e.meaningJa}</p>
              <p className="muted small">
                {e.usageJa} <Casualness value={e.casualness} />
              </p>
              <p className="example" lang="en">
                {e.exampleEn}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
