"use client";

import { useEffect, useRef, useState } from "react";
import { LEVEL_PROFILES, type Level } from "@/lib/levels";
import type { Lesson } from "@/lib/schemas";
import type { Speaker } from "@/lib/speech/tts";

export function ListenStep({ lesson, level, speaker, onNext }: { lesson: Lesson; level: Level; speaker: Speaker | null; onNext(): void }) {
  const [showScript, setShowScript] = useState(!speaker);
  const [playing, setPlaying] = useState(false);
  const [active, setActive] = useState<number | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      speaker?.stop();
    };
  }, [speaker]);

  async function play() {
    if (!speaker) return;
    setPlaying(true);
    await speaker.speakLines(lesson.lines, { rate: LEVEL_PROFILES[level].speechRate, onLine: (i) => alive.current && setActive(i) });
    if (alive.current) {
      setPlaying(false);
      setActive(null);
    }
  }

  const first = lesson.speakers[0];
  return (
    <section className="stack">
      <p>
        <strong>{lesson.title}</strong>
      </p>
      {speaker ? (
        <>
          <p className="muted small">まずは台本を見ずに聞いてみましょう。何度聞いても大丈夫です。</p>
          {playing ? (
            <button className="btn" type="button" onClick={() => { speaker.stop(); setPlaying(false); setActive(null); }}>
              ■ 止める
            </button>
          ) : (
            <button className="btn primary" type="button" onClick={play}>
              ▶ 再生
            </button>
          )}
        </>
      ) : (
        <p className="muted small">このブラウザは読み上げに対応していないため、台本を読んで進めます。</p>
      )}

      {showScript ? (
        <ol className="thread" aria-label="台本">
          {lesson.lines.map((l, i) => (
            <li key={i} className={`bubble${l.speaker === first ? "" : " me"}${active === i ? " active" : ""}`} lang="en">
              <span className="who">{l.speaker}</span>
              {l.text}
            </li>
          ))}
        </ol>
      ) : (
        <button className="hidden-script" type="button" onClick={() => setShowScript(true)}>
          台本を見る
        </button>
      )}

      <button className="btn" type="button" onClick={onNext}>
        次へ：表現を拾う
      </button>
    </section>
  );
}
