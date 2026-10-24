import { partsOf } from "../scoreboard/TaskText";
import type { ScoreboardTask } from "../types";

const WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15,
  twenty: 20, thirty: 30, forty: 40, "forty-five": 45, fifty: 50, sixty: 60, ninety: 90,
};
const NUMBER = `\\d+(?:\\.\\d+)?|${Object.keys(WORDS).join("|")}`;
/** "3 minutes", "90 seconds", "a minute", "five mins". */
const LIMIT = new RegExp(`\\b(${NUMBER})\\s*(minutes?|mins?|seconds?|secs?)\\b`, "i");

/** A time limit a task's words give, in ms ("You have exactly 3 minutes" is 180000), and the sentence it's in. No `said`: the host set it in ✎. */
export interface Limit { ms: number; said?: string }

/** The first time limit in some words, if any. */
export function limitIn(text: string): Limit | undefined {
  for (const sentence of text.split(/(?<=[.!?])\s+|\n+/)) {
    const m = LIMIT.exec(sentence);
    if (!m) continue;
    const n = WORDS[m[1]!.toLowerCase()] ?? parseFloat(m[1]!);
    const ms = Math.round(n * (/^m/i.test(m[2]!) ? 60_000 : 1000));
    if (ms > 0) return { ms, said: sentence.trim() };
  }
  return undefined;
}

/**
 * A task's time limits, a part each (the part's place, 1 to N, and how many parts there are), in the order they're read.
 * A limit the host set on a part wins; else the one its words give.
 */
export function limitsOf(task: ScoreboardTask | undefined): (Limit & { part: number; of: number })[] {
  const parts = partsOf(task);
  return parts.flatMap((p, i) => {
    const limit = p.limit ? { ms: p.limit } : limitIn(p.text);
    return limit ? [{ ...limit, part: i + 1, of: parts.length }] : [];
  });
}

/** "3 min", "90 sec", "1:30": a time as a chip says it. */
export function timeLabel(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s % 60 === 0) return `${s / 60} min`;
  if (s < 60) return `${s} sec`;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
