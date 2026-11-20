import type { Lesson } from "@/lib/schemas";
import { Casualness } from "@/components/Casualness";

export function ExpressionsStep({ lesson, onNext }: { lesson: Lesson; onNext(): void }) {
  return (
    <section className="stack">
      <p className="muted small">会話に出てきた、ネイティブがよく使う言い回しです。次の会話で使ってみましょう。</p>
      <ul className="expr-list">
        {lesson.expressions.map((e) => (
          <li key={e.phrase}>
            <span className="phrase" lang="en">
              <mark>{e.phrase}</mark>
            </span>
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
      <button className="btn" type="button" onClick={onNext}>
        次へ：話してみる
      </button>
    </section>
  );
}
