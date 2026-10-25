import type { Scoreboard } from "../types";
import { shownTotals } from "./scoring";
import { codesOf, MARGIN, num, PAGE_H, PAGE_W, stream, typewriter, widthOf, wrap, writePdf, type Face, type Placed } from "./taskCardsPdf";
import { sorted, titleOf } from "./tasks";

/*
 * "Scores by task" for the download-all zip, built with the Print PDF's own writer, so it's the same plain black
 * typewriter on white Letter. A row per task the room has seen scored, in the order played; a column per guest in
 * final standing, the winner first; a cell is that task's points, a bonus kept apart ("3 +1") and a DQ as "DQ".
 * Totals along the bottom, as on the scoreboard, and the tiebreaker's winner under them when it settled a tie.
 */

const SIZE = 12, LEAD = 1.35, ROW_PAD = 7;

/** The points a contestant got for a task as the cell shows them, from the points the room saw and the task's bonus and DQ. */
function cell(points: number | undefined, bonus: true | number | undefined, dq: boolean) {
  if (points === undefined && !dq) return "";
  const b = bonus === true ? 1 : bonus ?? 0;
  const plus = b ? ` +${b}` : "";
  return dq ? `DQ${plus}` : `${(points ?? 0) - b}${plus}`;
}

/** Drops a leading emoji (the light's 💡) that the typewriter face can't draw. */
const plain = (s: string) => s.replace(/^\p{Extended_Pictographic}️?\s*/u, "");

/**
 * The PDF. `heading` is the party's name; `subtitle` says what the page is ("Scores by task · 25 October 2026", or
 * "Scores so far · after 5 of 8 tasks").
 */
export async function buildScoresPdf(board: Scoreboard | undefined, heading: string, subtitle: string, face?: Face): Promise<Uint8Array> {
  face ??= await typewriter();
  const totals = shownTotals(board);
  const ids = sorted(board?.contestants).map(([id]) => id);
  const top = Math.max(...ids.map((id) => totals[id] ?? 0));
  const leaders = ids.filter((id) => (totals[id] ?? 0) === top);
  const settled = leaders.length > 1 && board?.tiebreaker?.winner && leaders.includes(board.tiebreaker.winner) ? board.tiebreaker.winner : undefined;
  // Highest first; the tiebreaker's winner ahead of whoever they tied with, then the list's order.
  const cols = [...ids].sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0) || +(b === settled) - +(a === settled));
  const shown = board?.shown ?? {};
  const tasks = sorted(board?.tasks).filter(([id]) => shown[id] && Object.keys(shown[id]!).length);
  const name = (id: string) => board?.contestants?.[id]?.name ?? "";

  // The guests' columns as wide as the widest of their names and cells; the task column takes the rest.
  const usable = PAGE_W - 2 * MARGIN, numW = 22;
  let size = SIZE;
  let guestW = 0;
  for (; size > 7; size -= 0.5) {
    const texts = cols.flatMap((id) => [name(id), String(totals[id] ?? 0), ...tasks.map(([tid, t]) => cell(shown[tid]?.[id], t.bonus?.[id], !!t.dq?.[id]))]);
    guestW = Math.max(...texts.map((s) => widthOf(face!, codesOf(face!, s), size))) + size;
    if (numW + 9 * size + cols.length * guestW <= usable) break;
  }
  const taskW = usable - numW - cols.length * guestW;
  const lead = size * LEAD;
  const colX = (i: number) => MARGIN + numW + taskW + i * guestW + guestW / 2;

  const pages: string[] = [];
  let placed: Placed[] = [], lines: string[] = [];
  let y = PAGE_H - MARGIN;
  const text = (s: string, x: number, at: number, sz = size, centred = false) => {
    const codes = codesOf(face!, s);
    placed.push({ x: centred ? x - widthOf(face!, codes, sz) / 2 : x, y: at, codes, size: sz });
  };
  const rule = (at: number, w: number, grey: number) => lines.push(`${num(grey)} G ${num(w)} w ${num(MARGIN)} ${num(at)} m ${num(PAGE_W - MARGIN)} ${num(at)} l S`);
  const header = () => {
    y -= lead;
    text("Task", MARGIN + numW, y);
    cols.forEach((id, i) => text(name(id), colX(i), y, size, true));
    y -= ROW_PAD;
    rule(y, 1.5, 0);
  };
  const newPage = () => {
    if (placed.length) pages.push(stream(placed, lines));
    placed = []; lines = [];
    y = PAGE_H - MARGIN;
  };

  text(heading, MARGIN, y - 20, 20);
  y -= 20 * LEAD;
  text(subtitle, MARGIN, y - size, size);
  y -= size * LEAD + 2 * size;
  header();

  tasks.forEach(([tid, t], n) => {
    const words = wrap(face!, plain(titleOf(t)), size, taskW - size);
    const h = words.length * lead + 2 * ROW_PAD;
    if (y - h < MARGIN + 4 * lead) { newPage(); header(); }
    let at = y - ROW_PAD - size;
    text(String(n + 1), MARGIN, at);
    for (const codes of words) { placed.push({ x: MARGIN + numW, y: at, codes, size }); at -= lead; }
    cols.forEach((id, i) => text(cell(shown[tid]?.[id], t.bonus?.[id], !!t.dq?.[id]), colX(i), y - ROW_PAD - size, size, true));
    y -= h;
    if (n < tasks.length - 1) rule(y, 0.5, 0.73);
  });

  rule(y, 1.5, 0);
  const big = size * 1.25;
  y -= ROW_PAD + big;
  text("Total", MARGIN + numW, y, big);
  cols.forEach((id, i) => text(String(totals[id] ?? 0), colX(i), y, big, true));
  if (settled) {
    y -= big + lead;
    text(`Tiebreaker: ${name(settled)}`, MARGIN, y);
  }
  newPage();
  return writePdf(face, pages);
}
