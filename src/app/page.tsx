"use client";

import Link from "next/link";
import { LEVEL_LABEL_JA, LEVELS, isLevel } from "@/lib/levels";
import { setLevel } from "@/lib/storage";
import { useProgress } from "@/lib/use-progress";

export default function Home() {
  const { progress, update } = useProgress();

  return (
    <main className="page">
      <header className="hero">
        <h1 className="logo">Be-NatiBe</h1>
        <p className="tagline">
          教科書の英語を、<mark>ネイティブの英語</mark>に。
        </p>
      </header>

      {progress && !progress.level && (
        <section className="stack">
          <p>最初に 3 分ほどのレベル診断をして、あなたに合った会話の速さと難しさを決めます。</p>
          <Link className="btn primary" href="/placement">
            まずはレベル診断
          </Link>
        </section>
      )}

      {progress?.level && (
        <section className="stack">
          <div className="stats">
            <p>
              いまのレベル <strong>{LEVEL_LABEL_JA[progress.level]}</strong>
            </p>
            <p>
              これまでの学習 <strong>{progress.sessionCount} 回</strong>
            </p>
          </div>
          <Link className="btn primary" href="/lesson">
            今日の学習をはじめる
          </Link>
          <p className="muted small">聞く → 表現を拾う → 話してみる → フィードバック（約 10 分）</p>
          <label className="field inline">
            <span>レベルを変える</span>
            <select
              aria-label="レベルを変える"
              value={progress.level}
              onChange={(e) => {
                const v = e.target.value;
                if (isLevel(v)) update((p) => setLevel(p, v));
              }}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABEL_JA[l]}
                </option>
              ))}
            </select>
          </label>
          <nav className="links">
            <Link href="/expressions">表現リスト（{progress.expressions.length}）</Link>
            <Link href="/placement">診断をやり直す</Link>
          </nav>
        </section>
      )}
    </main>
  );
}
