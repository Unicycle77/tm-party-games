/** Points as chalk-style tally marks: four strokes, then a fifth struck across them. Nothing for none. */
export function Tally({ n }: { n: number }) {
  if (n <= 0) return null;
  const groups = Array.from({ length: Math.ceil(n / 5) }, (_, i) => Math.min(5, n - i * 5));
  return (
    <span className="tally" role="img" aria-label={`${n} ${n === 1 ? "point" : "points"}`}>
      {groups.map((g, i) => <span key={i} className={g === 5 ? "tally-group five" : "tally-group"}>{"|".repeat(Math.min(g, 4))}</span>)}
    </span>
  );
}
