import type { ShownConversion, TaskUnit } from "../types";
import { ANCHOR, UNITS, type Kind, type UselessUnit } from "./units";

/** The everyday units the host can measure in, by kind. Tasks can bring their own (see `TaskUnit`). */
export const COMMON: Record<Kind, string[]> = {
  height: ["mm", "cm", "m", "in", "ft"],
  length: ["mm", "cm", "m", "in", "ft"],
  weight: ["g", "kg", "oz", "lb"],
  time: ["sec", "min", "hr"],
  volume: ["ml", "L", "tsp", "tbsp", "fl oz", "cup", "pt", "qt", "gal"],
};
export const KINDS: Kind[] = ["height", "length", "weight", "time", "volume"];
export const KIND_LABEL: Record<Kind, string> = { height: "Height", length: "Length", weight: "Weight", time: "Time", volume: "Volume" };

/** The one built-in prop: a standard six-sided die is 16 mm along each edge. */
export const DICE: TaskUnit = { name: "dice", amount: 16, unit: "mm", kind: "height" };

/** A result: how much of one useless unit the measurement is, as a whole count or as "1/N of one". */
export interface Match {
  unit: UselessUnit;
  /** The measurement divided by the unit. */
  count: number;
  /** The whole number the result rounds to: the count, or N in "1/N". */
  whole: number;
  fraction: boolean;
  /** How far from that whole number it is: the ranking, lowest first. */
  off: number;
}

export function matchFor(unit: UselessUnit, anchor: number): Match | undefined {
  const count = anchor / unit.size;
  if (!(count > 0) || !isFinite(count)) return undefined;
  if (Math.round(count) >= 1) {
    const whole = Math.round(count);
    return { unit, count, whole, fraction: false, off: Math.abs(count - whole) };
  }
  // Below 1, flip it: 0.0156 blue whales is 1/64.1 of one, scored like 64.1 would be.
  const flipped = 1 / count;
  const whole = Math.round(flipped);
  return { unit, count, whole, fraction: true, off: Math.abs(flipped - whole) };
}

/** Past a billion (1/94,002,983,111,123,540 of the Grand Canyon) a number can't be read out, and every one looks "exact". */
const MOST = 1e9;

/**
 * Every unit of a kind, closest to a round number first (and of two as close, the smaller number, which is easier
 * to picture), with the closest few shuffled so a repeat isn't a rerun. "Use a different unit" still offers the rest.
 */
export function rank(kind: Kind, anchor: number, shuffleTop = 5, random = Math.random): Match[] {
  const all = UNITS[kind].map((u) => matchFor(u, anchor)).filter((m): m is Match => !!m && m.whole <= MOST).sort((a, b) => a.off - b.off || a.whole - b.whole);
  const top = all.slice(0, shuffleTop);
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [top[i], top[j]] = [top[j]!, top[i]!];
  }
  return [...top, ...all.slice(shuffleTop)];
}

/** A measurement in its kind's anchor (mm, g, s or ml). */
export const toAnchor = (amount: number, unit: string) => amount * (ANCHOR[unit] ?? NaN);

const num = (n: number, digits = 2) => n.toLocaleString("en-US", { maximumFractionDigits: digits });
const article = (u: UselessUnit) => u.the ?? (/^[aeiou]/i.test(u.one) ? "an" : "a");
const withArticle = (u: UselessUnit) => [article(u), u.one].filter(Boolean).join(" ");
const DIMENSION: Record<Kind, string> = { height: "height", length: "length", weight: "weight", time: "length", volume: "volume" };
const ADJECTIVE: Record<Kind, string> = { height: " tall", length: " long", weight: "", time: "", volume: "" };

/** The three lines the host reads out, and the big screen shows: "39 dice tall is" / "4 dollar bills" / "the long side". */
export function say(kind: Kind, amount: number, inUnit: string, m: Match): ShownConversion {
  const lead = `${num(amount)} ${inUnit}${ADJECTIVE[kind]} is`;
  const u = m.unit;
  // How close: exactly (to the last decimal shown), almost exactly (within 2%), or only roughly.
  const value = m.fraction ? 1 / m.count : m.count;
  const rel = Math.abs(value - m.whole) / m.whole;
  const exact = !u.about && rel < 0.001;
  const almost = rel < 0.02;
  let main: string;
  if (m.fraction) {
    const prefix = exact ? "exactly " : almost && !u.about ? "almost exactly " : "about ";
    main = `${prefix}1/${num(m.whole, 0)} the ${DIMENSION[kind]} of ${withArticle(u)}`;
  } else if (exact) {
    main = `${num(m.whole, 0)} ${m.whole === 1 ? u.one : u.many}`;
  } else if (almost) {
    main = `${u.about ? "about" : "almost exactly"} ${num(m.whole, 0)} ${m.whole === 1 ? u.one : u.many}`;
  } else {
    const digits = m.count < 10 ? 2 : m.count < 1000 ? 1 : 0;
    main = `${u.about ? "about " : ""}${num(m.count, digits)} ${u.many}`;
  }
  return { lead, main, how: u.measured };
}

/** The working, for the host: "39 dice = 62.4 cm · a dollar bill is 15.6 cm". */
export function working(kind: Kind, anchor: number, inLabel: string, m: Match): string {
  const show = (a: number) => {
    if (kind === "weight") return a >= 1e6 ? `${num(a / 1e6)} t` : a >= 1000 ? `${num(a / 1000)} kg` : `${num(a, 3)} g`;
    if (kind === "time") {
      const yr = ANCHOR.yr!, d = ANCHOR.d!;
      return a >= yr ? `${num(a / yr)} years` : a >= d ? `${num(a / d)} days` : a >= 3600 ? `${num(a / 3600)} hr` : a >= 60 ? `${num(a / 60)} min` : `${num(a, 3)} sec`;
    }
    if (kind === "volume") return a >= 1e15 ? `${num(a / 1e15)} km³` : a >= 1e6 ? `${num(a / 1e6)} m³` : a >= 1000 ? `${num(a / 1000)} L` : `${num(a, 3)} ml`;
    return a >= 1e6 ? `${num(a / 1e6)} km` : a >= 1000 ? `${num(a / 1000)} m` : a >= 10 ? `${num(a / 10)} cm` : `${num(a, 3)} mm`;
  };
  return `${inLabel} = ${show(anchor)} · ${withArticle(m.unit)} is ${m.unit.about ? "about " : ""}${show(m.unit.size)}`;
}
