import type { Scoreboard } from "../types";
import { shownTotals } from "./scoring";
import { codesOf, MARGIN, num, PAGE_H, PAGE_W, stream, typewriter, widthOf, wrap, writePdf, type Face, type Placed } from "./taskCardsPdf";
import { sorted, titleOf } from "./tasks";

/*
 * "Scores by task" for the download-all zip, built with the Print PDF's own writer, so it's the same plain black
 * typewriter on white Letter. A row per task the room has seen scored, in the order played; a column per guest in
 * final standing, lowest on the left and the winner on the right as on the scoreboard; a cell is that task's points, a bonus kept apart ("3 +1") and a DQ as "DQ".
 * Totals along the bottom, as on the scoreboard, and the tiebreaker's winner under them when it settled a tie.
 */

const SIZE = 12, LEAD = 1.35, ROW_PAD = 7;
/** Ballpoint blue, so the marks read as added by hand over the typed page. */
const PEN = "0.12 0.22 0.62 RG 1 J 1 j";

/** A small, repeatable wobble, so the same night always draws the same marks. */
function wobble(seed: number) {
  let a = seed >>> 0 || 1;
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 2 ** 32 - 0.5; };
}

/** A pen line through `points`, as PDF path ops. */
const pen = (points: [number, number][], width: number) =>
  `${PEN} ${num(width)} w ${points.map(([x, y], i) => `${num(x)} ${num(y)} ${i ? "l" : "m"}`).join(" ")} S`;

/** A loop drawn around a number in one stroke: tilted, a little lopsided, and overshooting where it started. */
function circled(cx: number, cy: number, rx: number, ry: number, seed: number) {
  const r = wobble(seed), tilt = -0.1, pts: [number, number][] = [];
  const start = 1.9, sweep = 2 * Math.PI + 0.9, n = 72;
  for (let i = 0; i <= n; i++) {
    const t = start + (sweep * i) / n;
    const k = 1 + 0.07 * Math.sin(t * 2 + 0.7) + 0.14 * (i / n); // lopsided, and wider by the end, so the tail crosses the start
    const x = rx * k * Math.cos(t), y = ry * k * Math.sin(t);
    pts.push([cx + x * Math.cos(tilt) - y * Math.sin(tilt) + r() * 0.4, cy + x * Math.sin(tilt) + y * Math.cos(tilt) + r() * 0.4]);
  }
  return pen(pts, 1.2);
}

/** A quick underline from `x1` to `x2`: not quite level, with a slight sag. */
function underlined(x1: number, x2: number, y: number, seed: number) {
  const r = wobble(seed), pts: [number, number][] = [];
  const rise = r() * 1.6, sag = 0.6 + r() * 0.6;
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    pts.push([x1 - 1.5 + (x2 - x1 + 3) * t, y + rise * t - sag * Math.sin(Math.PI * t)]);
  }
  return pen(pts, 0.9);
}

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
 * "Scores so far · after 5 of 8 tasks"). `winner`, once the night is decided, has their total circled in pen; each task's
 * top points (ties and all, a DQ never) are underlined.
 */
export async function buildScoresPdf(board: Scoreboard | undefined, heading: string, subtitle: string, winner?: string, face?: Face): Promise<Uint8Array> {
  face ??= await typewriter();
  const totals = shownTotals(board);
  const ids = sorted(board?.contestants).map(([id]) => id);
  const top = Math.max(...ids.map((id) => totals[id] ?? 0));
  const leaders = ids.filter((id) => (totals[id] ?? 0) === top);
  const settled = leaders.length > 1 && board?.tiebreaker?.winner && leaders.includes(board.tiebreaker.winner) ? board.tiebreaker.winner : undefined;
  // Lowest on the left and the winner on the right, as on the scoreboard; the tiebreaker's winner right of whoever they tied with.
  const cols = [...ids].sort((a, b) => (totals[a] ?? 0) - (totals[b] ?? 0) || +(a === settled) - +(b === settled));
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
    const best = Math.max(...cols.filter((id) => !t.dq?.[id] && shown[tid]?.[id] !== undefined).map((id) => shown[tid]![id]!));
    cols.forEach((id, i) => {
      const s = cell(shown[tid]?.[id], t.bonus?.[id], !!t.dq?.[id]);
      text(s, colX(i), y - ROW_PAD - size, size, true);
      if (!t.dq?.[id] && shown[tid]?.[id] === best && best > 0) {
        const w = Math.max(widthOf(face!, codesOf(face!, s), size), size * 1.3);
        lines.push(underlined(colX(i) - w / 2, colX(i) + w / 2, y - ROW_PAD - size - 3, n * 31 + i * 7 + 1));
      }
    });
    y -= h;
    if (n < tasks.length - 1) rule(y, 0.5, 0.73);
  });

  rule(y, 1.5, 0);
  const big = size * 1.25;
  y -= ROW_PAD + big;
  text("Total", MARGIN + numW, y, big);
  cols.forEach((id, i) => {
    const s = String(totals[id] ?? 0);
    text(s, colX(i), y, big, true);
    if (id === winner) lines.push(circled(colX(i), y + big * 0.33, Math.min(guestW / 2 - 2, widthOf(face!, codesOf(face!, s), big) / 2 + 9), big * 0.85, 7));
  });
  if (settled) {
    y -= big + lead;
    text(`Tiebreaker: ${name(settled)}`, MARGIN, y);
  }
  newPage();
  return writePdf(face, pages);
}
