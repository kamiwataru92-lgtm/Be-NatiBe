const LABEL = { 1: "どこでも使える", 2: "くだけた場で", 3: "仲の良い友達だけ" } as const;

export function Casualness({ value }: { value: 1 | 2 | 3 }) {
  return (
    <span className="casual" title={LABEL[value]}>
      <span aria-hidden="true">{"●".repeat(value)}{"○".repeat(3 - value)}</span> {LABEL[value]}
    </span>
  );
}
