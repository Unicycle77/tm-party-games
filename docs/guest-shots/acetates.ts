// Each guest's Acetate for the shots, as strokes on their sheet (the guest's way up, as stored). Drawn here as the room
// should see them on the projector, then turned half way round for the guest's phone, except where the guest forgot.
import { PAGE_H, PAGE_W, encodePage, type Stroke } from "../../src/games/flipchart/strokes";

const BLACK = 0, RED = 1, BLUE = 2, GREEN = 3;
type Pt = [number, number];
const line = (c: number, pts: Pt[]): Stroke => ({ c, p: pts.flatMap(([x, y]) => [Math.round(x), Math.round(y)]) });
const quad = (a: Pt, b: Pt, c: Pt, n = 10): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
  const t = i / n;
  return [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * b[0] + t ** 2 * c[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * b[1] + t ** 2 * c[1]];
});
const ellipse = (cx: number, cy: number, rx: number, ry: number, tilt = 0, n = 28): Pt[] => Array.from({ length: n + 1 }, (_, i) => {
  const a = (i / n) * Math.PI * 2;
  const x = rx * Math.cos(a), y = ry * Math.sin(a);
  return [cx + x * Math.cos(tilt) - y * Math.sin(tilt), cy + x * Math.sin(tilt) + y * Math.cos(tilt)];
});

/** A happy horse standing on grass, in the room's view: body, neck and head facing right, four legs, tail, eye, smile. */
function horse(dx = 0, dy = 0, s = 1, body = BLACK): Stroke[] {
  const P = ([x, y]: Pt): Pt => [dx + x * s, dy + y * s];
  const L = (c: number, pts: Pt[]) => line(c, pts.map(P));
  return [
    L(body, ellipse(470, 760, 210, 105, -0.04)),
    L(body, [...quad([650, 700], [700, 560], [760, 480]), ...quad([760, 480], [790, 440], [830, 470]), [900, 540], ...quad([900, 540], [910, 580], [870, 590]), [800, 570], ...quad([800, 570], [780, 650], [730, 720])]),
    L(body, [[780, 470], [770, 410], [815, 450]]),
    L(body, [[340, 850], [325, 1040]]), L(body, [[410, 860], [405, 1050]]), L(body, [[560, 860], [570, 1050]]), L(body, [[630, 845], [660, 1030]]),
    L(body, quad([265, 740], [170, 770], [150, 900])),
    line(BLACK, [P([815, 500])]),
    L(RED, quad([835, 545], [855, 565], [880, 545], 6)),
  ];
}
const grass = (y = 1090): Stroke => line(GREEN, [...quad([140, y], [420, y - 30], [560, y]), ...quad([560, y], [720, y + 30], [880, y - 10])]);

/** Capitals as strokes, in a 60 × 100 box (y down). */
const GLYPHS: Record<string, Pt[][]> = {
  A: [[[0, 100], [30, 0], [60, 100]], [[12, 62], [48, 62]]],
  L: [[[0, 0], [0, 100], [55, 100]]],
  E: [[[58, 0], [0, 0], [0, 100], [58, 100]], [[0, 50], [44, 50]]],
  X: [[[0, 0], [60, 100]], [[60, 0], [0, 100]]],
  G: [[...quad([58, 14], [30, -12], [6, 20]), ...quad([6, 20], [-8, 80], [30, 100]), ...quad([30, 100], [60, 100], [60, 60]), [34, 60]]],
  R: [[[0, 100], [0, 0], ...quad([0, 0], [62, -4], [56, 28]), ...quad([56, 28], [50, 52], [0, 50]), [60, 100]]],
  S: [[...quad([56, 10], [30, -8], [8, 12]), ...quad([8, 12], [0, 40], [30, 50]), ...quad([30, 50], [62, 62], [52, 88]), ...quad([52, 88], [30, 108], [2, 88])]],
  M: [[[0, 100], [0, 0], [30, 60], [60, 0], [60, 100]]],
  P: [[[0, 100], [0, 0], ...quad([0, 0], [62, -4], [56, 28]), ...quad([56, 28], [50, 54], [0, 52])]],
  I: [[[30, 0], [30, 100]], [[12, 0], [48, 0]], [[12, 100], [48, 100]]],
  Y: [[[0, 0], [30, 50], [60, 0]], [[30, 50], [30, 100]]],
  T: [[[0, 0], [60, 0]], [[30, 0], [30, 100]]],
  O: [ellipse(30, 50, 30, 50)],
};

/**
 * A word in the room's view, centred on (cx, y top), letters `h` tall. `turned`: letters the guest got the wrong way up on their
 * phone, so the room sees them upside down (each turned in its own place). `all`: the whole word upside down.
 */
function word(text: string, cx: number, y: number, h: number, c: number, { turned = [] as number[], all = false } = {}): Stroke[] {
  const k = h / 100, w = 60 * k, gap = 26 * k;
  const total = text.length * w + (text.length - 1) * gap;
  const x0 = cx - total / 2;
  const out = [...text].flatMap((ch, i) => {
    const lx = x0 + i * (w + gap);
    const flip = turned.includes(i);
    return (GLYPHS[ch] ?? []).map((pts) => line(c, pts.map(([x, gy]): Pt => flip ? [lx + w - x * k, y + h - gy * k] : [lx + x * k, y + gy * k])));
  });
  return all ? turn(out, cx, y + h / 2) : out;
}

/** Turns strokes half way round about a point. */
const turn = (strokes: Stroke[], cx: number, cy: number): Stroke[] => strokes.map((s) => ({ c: s.c, p: s.p.map((v, i) => Math.round(i % 2 ? 2 * cy - v : 2 * cx - v)) }));
/** From the room's view to the guest's phone: half way round about the middle of the sheet. */
const toPhone = (strokes: Stroke[]) => turn(strokes, PAGE_W / 2, PAGE_H / 2);

/** What each guest put on their acetate, in the room's view (see the shots for who did what). */
const ROOM: Record<string, Stroke[]> = {
  // Horse right, name forgotten: written the normal way up on the phone, so upside down here.
  alex: [...horse(), grass(), ...word("ALEX", 500, 1170, 150, RED, { all: true })],
  // Nearly perfect: the last G written the normal way up, so it's the one letter upside down here.
  greg: [...word("GREG", 330, 160, 120, BLUE, { turned: [3] }), ...horse(30, 60, 0.95), line(GREEN, [[230, 1130], [250, 1100], [270, 1130], [290, 1100], [310, 1130]]), line(GREEN, [[700, 1130], [720, 1100], [740, 1130], [760, 1100], [780, 1130]])],
  // Turned the name, forgot the horse: it's on its back.
  mei: [...turn(horse(), 500, 760), ...word("MEI", 500, 1160, 140, GREEN)],
  // Got both right.
  priya: [...horse(0, 0, 1, GREEN), grass(), ...word("PRIYA", 500, 1170, 130, RED)],
  // Forgot it all: drew it the normal way up on the phone, so the horse is on its back and the name upside down.
  sam: [...turn([...horse(), ...word("SAM", 500, 1170, 140, BLUE)], PAGE_W / 2, PAGE_H / 2)],
  // Ran out of time: a head and half a name.
  tom: [...horse(-120, 120).slice(1, 3), ...horse(-120, 120).slice(8), ...word("TO", 440, 1150, 140, BLUE)],
};
// Sam's turned in the room's view already, so his phone has it the normal way up.
export const acetateSheets = (ids: string[]) =>
  Object.fromEntries(ids.filter((id) => ROOM[id]).map((id) => [id, { p1: encodePage(toPhone(ROOM[id]!)) }]));
