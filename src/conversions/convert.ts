import type { ShownConversion, TaskUnit } from "../types";
import { ANCHOR, soundEnergy, UNITS, type Kind, type UselessUnit } from "./units";

/** The everyday units the host can measure in, by kind. Tasks can bring their own (see `TaskUnit`). */
export const COMMON: Record<Kind, string[]> = {
  height: ["mm", "cm", "m", "in", "ft"],
  length: ["mm", "cm", "m", "in", "ft"],
  weight: ["g", "kg", "oz", "lb"],
  time: ["sec", "min", "hr"],
  volume: ["ml", "L", "tsp", "tbsp", "fl oz", "cup", "pt", "qt", "gal"],
  loudness: ["dB"],
};
export const KINDS: Kind[] = ["height", "length", "weight", "time", "volume", "loudness"];
export const KIND_LABEL: Record<Kind, string> = { height: "Height", length: "Length", weight: "Weight", time: "Time", volume: "Volume", loudness: "Loudness" };

/** The one built-in prop: a standard six-sided die is 16 mm along each edge. */
export const DICE: TaskUnit = { name: "dice", amount: 16, unit: "mm", kind: "height" };

/** A task measured with a dB meter (the 🔊 shortcut): readings go in as the meter shows them. */
export const DB_METER: TaskUnit = { name: "dB", amount: 1, unit: "dB", kind: "loudness" };

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

/**
 * Sounds are always "about" and rounded, so nothing is closer to a round number than anything else. Instead, the
 * best is a count you can picture and still laugh at, around 30 at once; a fraction of something louder comes after.
 */
const loudOff = (m: Match) => Math.abs(Math.log10(m.count) - 1.5) + (m.fraction ? 0.5 : 0);

/** Past a billion (1/94,002,983,111,123,540 of the Grand Canyon) a number can't be read out, and every one looks "exact". */
const MOST = 1e9;

/**
 * Every unit of a kind, closest to a round number first (and of two as close, the smaller number, which is easier
 * to picture), with the closest few shuffled so a repeat isn't a rerun. "Use a different unit" still offers the rest.
 */
export function rank(kind: Kind, anchor: number, shuffleTop = 5, random = Math.random): Match[] {
  const all = UNITS[kind].map((u) => matchFor(u, anchor)).filter((m): m is Match => !!m && m.whole <= MOST)
    .sort(kind === "loudness" ? (a, b) => loudOff(a) - loudOff(b) : (a, b) => a.off - b.off || a.whole - b.whole);
  const top = all.slice(0, shuffleTop);
  for (let i = top.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [top[i], top[j]] = [top[j]!, top[i]!];
  }
  return [...top, ...all.slice(shuffleTop)];
}

/** A measurement in its kind's anchor (mm, g, s or ml, or a dB reading's sound energy). */
export const toAnchor = (amount: number, unit: string) => unit === "dB" ? soundEnergy(amount) : amount * (ANCHOR[unit] ?? NaN);

const num = (n: number, digits = 2) => n.toLocaleString("en-US", { maximumFractionDigits: digits });
const article = (u: UselessUnit) => u.the ?? (/^[aeiou]/i.test(u.one) ? "an" : "a");
const withArticle = (u: UselessUnit) => [article(u), u.one].filter(Boolean).join(" ");
const DIMENSION: Record<Kind, string> = { height: "height", length: "length", weight: "weight", time: "length", volume: "volume", loudness: "noise" };
const ADJECTIVE: Record<Kind, string> = { height: " tall", length: " long", weight: "", time: "", volume: "", loudness: "" };
/** Two significant figures, for a count worked out from a reading to a tenth of a dB: 2,630.3 conversations is "about 2,600". */
const rough = (n: number) => num(Number(n.toPrecision(2)), 2);

/** The three lines the host reads out, and the big screen shows: "39 dice tall is" / "4 dollar bills" / "the long side". */
export function say(kind: Kind, amount: number, inUnit: string, m: Match, system: System = "metric"): ShownConversion {
  // At an imperial party, 5.5 ft or 66 in is read the way it's said: "5 ft 6 in tall is". Under a foot it stays as typed.
  // Weights in lb or oz read like a label, without its total ounces: "10 ½ oz is", "1 lb 8 oz is", "5.25 lb is".
  const imperial = system === "imperial" && ANCHOR[inUnit] !== undefined;
  const length = imperial && (inUnit === "ft" || inUnit === "in") && amount * ANCHOR[inUnit]! >= ANCHOR.ft!;
  const weight = imperial && (inUnit === "lb" || inUnit === "oz");
  const typed = length ? feetAndInches(amount * ANCHOR[inUnit]!) : weight ? poundsAndOunces(amount * ANCHOR[inUnit]!, false) : `${num(amount)} ${inUnit}`;
  const lead = `${typed}${ADJECTIVE[kind]} is`;
  const u = m.unit;
  // Sounds are always "about" (see `sounds`): so many of them going at once, or a fraction of one.
  if (kind === "loudness") {
    const main = m.fraction ? `about 1/${rough(Math.max(2, 1 / m.count < 10 ? Math.round(1 / m.count) : 1 / m.count))} the noise of ${withArticle(u)}` : `about ${rough(m.count)} ${rough(m.count) === "1" ? u.one : u.many} at once`;
    return { lead, main, how: u.measured };
  }
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

/** Which units the party explains things in. */
export type System = "metric" | "imperial";

const QUARTER = ["", "¼", "½", "¾"];
/**
 * A length in mm the way it's said aloud in feet and inches, to the nearest quarter inch: "6 ¼ in", "2 ft ½ in", "3 ft".
 * Under an inch it stays a decimal (a sheet of paper is 0.004 in, not 0); past a mile it's miles.
 */
export function feetAndInches(mm: number): string {
  const inches = mm / 25.4;
  if (inches >= 63360) return `${num(inches / 63360)} mi`;
  if (inches < 1) return `${num(inches, 3)} in`;
  const quarters = Math.round(inches * 4);
  const ft = Math.floor(quarters / 48);
  const whole = Math.floor((quarters % 48) / 4);
  const inch = [whole || "", QUARTER[quarters % 4]].filter(Boolean).join(" ");
  if (!ft) return `${inch} in`;
  return inch ? `${num(ft, 0)} ft ${inch} in` : `${num(ft, 0)} ft`;
}

/**
 * A weight in grams the way a US label puts it (NIST Handbook 130): ounces to the nearest quarter, "10 ½ oz"; from 1 lb
 * to under 4 lb, total ounces and then pounds and ounces, "24 oz (1 lb 8 oz)", or just "1 lb 8 oz" when `dual` is off;
 * from 4 lb, decimal pounds, "5.25 lb"; from a ton (2,000 lb), tons. Under a quarter ounce it stays a decimal.
 */
export function poundsAndOunces(g: number, dual = true): string {
  const oz = g / ANCHOR.oz!;
  const lb = oz / 16;
  if (lb >= 2000) return `${num(lb / 2000)} tons`;
  if (lb >= 4) return `${num(lb)} lb`;
  if (oz < 0.25) return `${num(oz, 3)} oz`;
  const quarters = Math.round(oz * 4);
  if (quarters >= 256) return "4 lb";
  const ounces = (q: number) => [Math.floor(q / 4) || "", QUARTER[q % 4]].filter(Boolean).join(" ");
  if (quarters < 64) return `${ounces(quarters)} oz`;
  const rest = quarters % 64;
  const split = `${Math.floor(quarters / 64)} lb${rest ? ` ${ounces(rest)} oz` : ""}`;
  return dual ? `${ounces(quarters)} oz (${split})` : split;
}

/** The working, for the host: "39 dice = 62.4 cm · a dollar bill is 15.6 cm", or in imperial "39 dice = 2 ft ½ in · a dollar bill is 6 ¼ in". */
export function working(kind: Kind, anchor: number, inLabel: string, m: Match, system: System = "metric"): string {
  if (kind === "loudness") return `${inLabel} · ${withArticle(m.unit)} is about ${num(10 * Math.log10(m.unit.size), 1)} dB`;
  const imperial = (a: number) => {
    if (kind === "weight") return poundsAndOunces(a);
    if (kind === "volume") {
      const gal = a / ANCHOR.gal!, cups = a / ANCHOR.cup!;
      return gal >= 1e9 ? `${num(a / 4.168181825e15)} cubic miles` : gal >= 1 ? `${num(gal)} gal` : cups >= 1 ? `${num(cups)} ${cups === 1 ? "cup" : "cups"}` : `${num(a / ANCHOR["fl oz"]!, 3)} fl oz`;
    }
    return feetAndInches(a);
  };
  const show = (a: number) => {
    if (system === "imperial" && kind !== "time") return imperial(a);
    if (kind === "weight") return a >= 1e6 ? `${num(a / 1e6)} t` : a >= 1000 ? `${num(a / 1000)} kg` : `${num(a, 3)} g`;
    if (kind === "time") {
      const yr = ANCHOR.yr!, d = ANCHOR.d!;
      return a >= yr ? `${num(a / yr)} years` : a >= d ? `${num(a / d)} days` : a >= 3600 ? `${num(a / 3600)} hr` : a >= 60 ? `${num(a / 60)} min` : `${num(a, 3)} sec`;
    }
    if (kind === "volume") return a >= 1e15 ? `${num(a / 1e15)} km³` : a >= 1e6 ? `${num(a / 1e6)} m³` : a >= 1000 ? `${num(a / 1000)} L` : `${num(a, 3)} ml`;
    return a >= 1e6 ? `${num(a / 1e6)} km` : a >= 1000 ? `${num(a / 1000)} m` : a >= 10 ? `${num(a / 10)} cm` : `${num(a, 3)} mm`;
  };
  // Typed as it's shown ("5 ft 11 in"), there's nothing to convert.
  const measured = inLabel === show(anchor) ? inLabel : `${inLabel} = ${show(anchor)}`;
  return `${measured} · ${withArticle(m.unit)} is ${m.unit.about ? "about " : ""}${show(m.unit.size)}`;
}
