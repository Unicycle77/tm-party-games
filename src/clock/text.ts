/** "14:32": what's left, rounded up to the second, never below nothing. */
export function clockText(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** A stopwatch's face: "0:41" and the tenth, "3". */
export function watchText(ms: number): { text: string; tenth: string } {
  const tenths = Math.max(0, Math.floor(ms / 100));
  const s = Math.floor(tenths / 10);
  return { text: `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, tenth: String(tenths % 10) };
}

/** "0:41.3": a stopwatch's time, as a chip says it. */
export const watchLabel = (ms: number) => { const { text, tenth } = watchText(ms); return `${text}.${tenth}`; };
