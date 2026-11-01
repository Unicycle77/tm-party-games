/**
 * "One target rank wins": the second longest snake and the median duck. Everyone is measured, and only the drawing at the
 * target rank gets 5; everyone else gets 0. The bonus point is the host's, by hand, as on every task.
 *
 * - **Second** (the snake): longest first, by length, then by sheets used for the tied (more sheets first). The second in
 *   that order wins; anyone exactly level with it (same length to the half inch and same sheets) shares the 5. With one or
 *   two drawings the longest wins instead (Jeffrey: otherwise it's boring).
 * - **Median** (the duck): smallest first. Odd: the middle one. Even: of the two middle ones, the one closer to the mean of
 *   all the ducks; exactly as close, both. With two ducks the biggest wins; one duck wins. Anyone level with a winner shares.
 *
 * DQ'd drawings are left out before this is worked out (see measured.ts), so a DQ changes who's second or in the middle.
 */
export type Target = "second" | "median";

type Values = Record<string, number>;

const keyOf = (target: Target, values: Values, sheets: Values | undefined) => (c: string): [number, number] =>
  target === "second" ? [values[c] ?? 0, sheets?.[c] ?? 0] : [values[c] ?? 0, 0];

const cmp = (a: [number, number], b: [number, number]) => a[0] - b[0] || a[1] - b[1];
const same = (a: [number, number], b: [number, number]) => cmp(a, b) === 0;

/** The order a target is worked out in: longest first for "second", smallest first for "median". Ties keep `ids`' order. */
export function orderOf(target: Target, ids: string[], values: Values, sheets?: Values): string[] {
  const key = keyOf(target, values, sheets);
  const sorted = [...ids].sort((a, b) => cmp(key(a), key(b)));
  return target === "second" ? stableReverse(sorted, key) : sorted;
}

/** Biggest first, keeping the original order among equals. */
function stableReverse(sorted: string[], key: (c: string) => [number, number]) {
  const groups: string[][] = [];
  for (const c of sorted) {
    const last = groups[groups.length - 1];
    if (last && same(key(last[0]!), key(c))) last.push(c);
    else groups.push([c]);
  }
  return groups.reverse().flat();
}

/** Who gets the 5 among `ids`. */
export function winnersOf(target: Target, ids: string[], values: Values, sheets?: Values): string[] {
  if (!ids.length) return [];
  const key = keyOf(target, values, sheets);
  const order = orderOf(target, ids, values, sheets);
  const n = order.length;
  let picks: string[];
  if (target === "second") picks = [order[n <= 2 ? 0 : 1]!];
  else if (n <= 2) picks = [order[n - 1]!];
  else if (n % 2) picks = [order[(n - 1) / 2]!];
  else {
    const mean = ids.reduce((sum, c) => sum + (values[c] ?? 0), 0) / n;
    const a = order[n / 2 - 1]!, b = order[n / 2]!;
    const da = Math.abs((values[a] ?? 0) - mean), db = Math.abs((values[b] ?? 0) - mean);
    picks = Math.abs(da - db) < 1e-9 ? [a, b] : da < db ? [a] : [b];
  }
  return order.filter((c) => picks.some((p) => same(key(p), key(c))));
}

/** Each one's place in the order (1 = longest snake, or smallest duck), level ones sharing a place. */
export function placesOf(target: Target, ids: string[], values: Values, sheets?: Values): Values {
  const key = keyOf(target, values, sheets);
  const order = orderOf(target, ids, values, sheets);
  const out: Values = {};
  order.forEach((c, i) => { out[c] = i > 0 && same(key(order[i - 1]!), key(c)) ? out[order[i - 1]!]! : i + 1; });
  return out;
}

/** The points: 5 for the winners, 0 for everyone else, and each one's place. */
export function targetPoints(target: Target, ids: string[], values: Values, sheets?: Values): { points: Values; place: Values } {
  const won = new Set(winnersOf(target, ids, values, sheets));
  return { points: Object.fromEntries(ids.map((c) => [c, won.has(c) ? 5 : 0])), place: placesOf(target, ids, values, sheets) };
}

/**
 * The duck's knock-outs on the TV, from the line-up (smallest first, the winners known): each step takes the smallest and
 * the biggest still standing, until only the winners are left. When two are left and one wins, the last step takes "the one
 * further from the average". Each step is the ids that fall, and the words on the host's gold button.
 */
export function knockOuts(order: string[], winners: string[]): { out: string[]; label: string }[] {
  const won = new Set(winners);
  const left = [...order];
  const steps: { out: string[]; label: string }[] = [];
  while (left.some((c) => !won.has(c))) {
    const lo = left[0]!, hi = left[left.length - 1]!;
    const out = [lo, hi].filter((c, i, all) => !won.has(c) && all.indexOf(c) === i);
    const label = left.length === 2 && out.length === 1 ? "Out: the one further from the average"
      : out.length === 2 ? "Out: the smallest and the biggest" : out[0] === lo ? "Out: the smallest" : "Out: the biggest";
    steps.push({ out, label });
    for (const c of out) left.splice(left.indexOf(c), 1);
  }
  return steps;
}
