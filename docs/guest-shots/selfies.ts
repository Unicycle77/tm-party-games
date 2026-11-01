// Each guest's fruit selfie for the shots, as strokes (as stored) on an A4 page (1000 × 1414): a wobbly self-portrait, drawn
// with a nose, eating some fruit, in the ten markers. Party ABCD: the longer someone's orange time, the more they got done.
import { encodePage, type Stroke } from "../../src/drawing/strokes";

type Pt = [number, number];
const RED = 0, ORANGE = 1, YELLOW = 2, GREEN = 3, BLUE = 4, PURPLE = 5, PINK = 6, BROWN = 7, BLACK = 9;

/** A nose's hand: every point nudged a little, from a fixed seed so the shots repeat. */
function shaky(seed: number) {
  let a = seed;
  const rnd = () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 2 ** 32 - 0.5; };
  return (c: number, pts: Pt[], wobble = 9): Stroke => ({ c, p: pts.flatMap(([x, y]) => [Math.round(x + rnd() * wobble), Math.round(y + rnd() * wobble)]) });
}
const ring = (cx: number, cy: number, rx: number, ry: number, n = 28, from = 0, to = Math.PI * 2): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => { const t = from + ((to - from) * i) / n; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; });

/** The face every selfie starts from: a head, angry brows, eyes, an open mouth. */
function face(s: ReturnType<typeof shaky>, cx: number, cy: number, r: number): Stroke[] {
  return [
    s(BLACK, ring(cx, cy, r, r * 1.15)),
    s(BLACK, [[cx - r * 0.55, cy - r * 0.45], [cx - r * 0.15, cy - r * 0.3]]),
    s(BLACK, [[cx + r * 0.55, cy - r * 0.45], [cx + r * 0.15, cy - r * 0.3]]),
    s(BLACK, [[cx - r * 0.35, cy - r * 0.1], [cx - r * 0.33, cy - r * 0.08]], 2),
    s(BLACK, [[cx + r * 0.35, cy - r * 0.1], [cx + r * 0.37, cy - r * 0.08]], 2),
    s(RED, ring(cx, cy + r * 0.45, r * 0.32, r * 0.16)),
  ];
}

const SELFIES: Record<string, () => Stroke[]> = {
  // 0:45: a stick figure, a lemon held out, and a stray mark from a missed colour.
  greg: () => { const s = shaky(45); return [
    ...face(s, 500, 380, 120),
    s(BLACK, [[500, 520], [495, 900]]), s(BLACK, [[497, 640], [330, 760]]), s(BLACK, [[497, 640], [690, 700]]),
    s(BLACK, [[495, 900], [380, 1150]]), s(BLACK, [[495, 900], [620, 1140]]),
    s(YELLOW, ring(740, 690, 60, 45)),
    s(PINK, [[150, 200], [190, 230]]),
  ]; },
  // 3:00: a shirt, an orange at the mouth with a leaf.
  alex: () => { const s = shaky(180); return [
    ...face(s, 470, 400, 150),
    s(BLUE, [[380, 560], [300, 760], [270, 1180], [700, 1185], [690, 760], [580, 560]]),
    s(ORANGE, ring(640, 480, 85, 85)), s(ORANGE, [[600, 470], [640, 450], [690, 475]]),
    s(GREEN, [[650, 395], [665, 350], [720, 345]]),
    s(PINK, [[160, 820], [175, 870]]),
  ]; },
  // 3:00: a banana, held in both "hands", hair in purple.
  priya: () => { const s = shaky(181); return [
    ...face(s, 500, 420, 140),
    s(PURPLE, [...ring(500, 400, 165, 185, 20, Math.PI, Math.PI * 2)]),
    s(PURPLE, [[340, 400], [320, 640]]), s(PURPLE, [[660, 400], [680, 640]]),
    s(RED, [[400, 590], [330, 820], [340, 1180], [660, 1180], [670, 820], [600, 590]]),
    s(YELLOW, [[380, 640], [470, 700], [600, 690], [680, 620]]), s(YELLOW, [[390, 660], [480, 730], [610, 715], [680, 640]]),
    s(BROWN, [[680, 620], [700, 600]]),
  ]; },
  // 4:30: an apple, a striped jumper.
  mei: () => { const s = shaky(270); return [
    ...face(s, 480, 400, 145),
    s(BLACK, ring(480, 340, 160, 120, 18, Math.PI, Math.PI * 2)),
    s(GREEN, [[390, 560], [310, 780], [300, 1180], [680, 1180], [660, 780], [580, 560]]),
    s(GREEN, [[320, 800], [650, 800]]), s(GREEN, [[310, 950], [665, 950]]),
    s(RED, ring(660, 500, 80, 75)), s(BROWN, [[660, 425], [670, 385]]), s(GREEN, [[670, 400], [720, 380]]),
  ]; },
  // 6:00: a slice of watermelon, a table, glasses.
  sam: () => { const s = shaky(360); return [
    ...face(s, 470, 380, 150),
    s(BLACK, ring(410, 360, 45, 35)), s(BLACK, ring(530, 360, 45, 35)), s(BLACK, [[455, 360], [485, 360]]),
    s(BLUE, [[380, 540], [300, 760], [290, 1040], [650, 1040], [640, 760], [560, 540]]),
    s(GREEN, [[540, 520], [700, 640], [860, 520]]), s(RED, [[560, 525], [700, 620], [840, 525], [560, 525]]),
    s(BLACK, [[620, 560], [622, 562]], 2), s(BLACK, [[700, 580], [702, 582]], 2), s(BLACK, [[770, 555], [772, 557]], 2),
    s(BROWN, [[100, 1060], [900, 1060]]), s(BROWN, [[180, 1060], [180, 1300]]), s(BROWN, [[820, 1060], [820, 1300]]),
  ]; },
  // 10:00 (his answer, typed in by the host): a pineapple, a crown, laser eyes.
  tom: () => { const s = shaky(600); return [
    ...face(s, 470, 470, 150),
    s(YELLOW, [[340, 300], [360, 200], [420, 270], [470, 180], [520, 270], [580, 200], [600, 300], [340, 300]]),
    s(RED, [[420, 450], [120, 380]]), s(RED, [[520, 450], [880, 380]]),
    s(PURPLE, [[390, 630], [310, 840], [300, 1200], [660, 1200], [650, 840], [560, 630]]),
    s(BROWN, ring(700, 640, 70, 110)), s(BROWN, [[650, 580], [750, 700]]), s(BROWN, [[750, 580], [650, 700]]),
    s(GREEN, [[680, 530], [660, 450]]), s(GREEN, [[700, 530], [705, 440]]), s(GREEN, [[720, 530], [750, 455]]),
    s(ORANGE, [[200, 1300], [260, 1320]]),
  ]; },
};

/** The guests' pages, as the session stores them. */
export function fruitPages(ids: string[]) {
  return Object.fromEntries(ids.map((id) => [id, { p1: encodePage(SELFIES[id]!()) }]));
}

/** Their answers to part 1, in ms: Greg's 45 seconds, Alex's and Priya's 3 minutes, Mei 4:30, Sam 6, Tom 10. */
export const ORANGE_TIMES: Record<string, number> = { greg: 45_000, alex: 180_000, priya: 180_000, mei: 270_000, sam: 360_000, tom: 600_000 };
