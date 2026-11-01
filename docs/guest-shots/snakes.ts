// Each guest's toilet roll and duck for the shots, as strokes (as stored): the snakes along the roll (y counts from the free
// end), the ducks on an A4 page. Party ABCD: everyone drew; the lengths and sizes are set so the scoring has something to say.
import { encodePage, type Stroke } from "../../src/drawing/strokes";
import { SHEET } from "../../src/games/snake/data";

type Pt = [number, number];
const line = (c: number, pts: Pt[]): Stroke => ({ c, p: pts.flatMap(([x, y]) => [Math.round(x), Math.round(y)]) });
const BLACK = 0, RED = 1, BLUE = 2, GREEN = 3;

/**
 * A snake drawn as an outline: its body follows a wiggle down the roll from `from` to `to`, `half` units either side of
 * its centre (thinner where `pinch` says), a pointed tail at `from` and a round head at `to`, with eyes and a forked tongue.
 */
function snake(c: number, from: number, to: number, { half = 72, amp = 230, period = 520, phase = 0, pinch }: { half?: number; amp?: number; period?: number; phase?: number; pinch?: [number, number, number] } = {}): Stroke[] {
  const steps = Math.ceil((to - from) / 14);
  const centre = (t: number): Pt => { const y = from + (to - from) * t; return [500 + amp * Math.sin(y / period + phase), y]; };
  const width = (t: number) => {
    const y = from + (to - from) * t;
    const tail = Math.min(1, (y - from) / 200) ** 0.7;
    const pinched = pinch && y > pinch[0] && y < pinch[1] ? pinch[2] : half;
    return Math.max(10, Math.min(half, pinched) * tail) + (t > 0.96 ? (t - 0.96) * 600 : 0);
  };
  const left: Pt[] = [], right: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const [x, y] = centre(t);
    const [ax, ay] = centre(Math.max(0, t - 0.002)), [bx, by] = centre(Math.min(1, t + 0.002));
    const l = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / l, ny = (bx - ax) / l, w = width(t);
    left.push([x + nx * w, y + ny * w]);
    right.push([x - nx * w, y - ny * w]);
  }
  const [hx, hy] = centre(1);
  const headR = half * 1.35;
  const head: Pt[] = Array.from({ length: 25 }, (_, i) => {
    const a = Math.PI + (i / 24) * Math.PI;
    return [hx + headR * Math.cos(a), hy - headR * 0.25 * Math.sin(a) + headR * 0.9 * (1 - Math.cos((i / 24) * Math.PI * 2)) / 2];
  });
  return [
    line(c, [...left, ...head.slice(0, 1), ...head, ...right.slice().reverse()]),
    line(BLACK, [[hx - headR * 0.4, hy + headR * 0.35]]),
    line(BLACK, [[hx + headR * 0.4, hy + headR * 0.35]]),
    line(RED, [[hx, hy + headR * 0.9], [hx, hy + headR * 1.4], [hx - 22, hy + headR * 1.65]]),
    line(RED, [[hx, hy + headR * 1.4], [hx + 22, hy + headR * 1.65]]),
  ];
}

/** Where each guest's snake runs, and how far out their roll was at 0:00. Alex didn't wind up in time: his first sheet tears off. */
const ROLLS: Record<string, { strokes: () => Stroke[]; out: number }> = {
  alex: { strokes: () => snake(GREEN, 250, 7100, { amp: 200, period: 430 }), out: 1520 },
  greg: { strokes: () => snake(BLACK, 300, 3150, { amp: 120, period: 600, pinch: [1500, 1900, 34] }), out: SHEET },
  mei: { strokes: () => snake(BLUE, 260, 9600, { amp: 260, period: 380, phase: 1 }), out: SHEET },
  priya: { strokes: () => snake(RED, 320, 4900, { amp: 180, period: 500, phase: 2 }), out: SHEET },
  sam: { strokes: () => snake(GREEN, 280, 7900, { amp: 240, period: 470, phase: 0.5 }), out: SHEET },
  tom: { strokes: () => [...snake(BLACK, 300, 11600, { amp: 90, period: 900, phase: 3 }), line(BLUE, [[150, 6000], [230, 6100], [160, 6200]])], out: SHEET },
};

/** The rolls of the guests who drew, as the session keeps them: `p1` and how far out (`out`). `upTo` cuts a roll short (a phone mid-task). */
export function snakeRolls(ids: string[], opts: { upTo?: number; out?: number } = {}) {
  return Object.fromEntries(ids.map((id) => {
    const r = ROLLS[id]!;
    let strokes = r.strokes();
    // Mid-task: only the body's two sides so far, each drawn down to `upTo`.
    if (opts.upTo !== undefined) strokes = strokes.slice(0, 1).flatMap((s) => {
      const runs: number[][] = [[]];
      for (let i = 0; i < s.p.length; i += 2) {
        if (s.p[i + 1]! <= opts.upTo!) runs[runs.length - 1]!.push(s.p[i]!, s.p[i + 1]!);
        else if (runs[runs.length - 1]!.length) runs.push([]);
      }
      return runs.filter((p) => p.length >= 4).map((p) => ({ c: s.c, p }));
    });
    return [id, { p1: encodePage(strokes), out: String(opts.out ?? r.out) }];
  }));
}

// ---- the ducks ----

const ellipse = (cx: number, cy: number, rx: number, ry: number, n = 32, from = 0, to = Math.PI * 2): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => { const a = from + ((to - from) * i) / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
const YELLOW = 2, ORANGE = 1, BLACK10 = 9, BLUE10 = 4, BROWN = 7, GREEN10 = 3, PINK = 6;

/** A duck facing right: body, head, beak, eye, wing, legs; `s` its size, `fill` scribbled in, `legs` how long. */
function duck(cx: number, cy: number, s: number, { colour = YELLOW, fill = true, legs = 1, pond = false } = {}): Stroke[] {
  const P = ([x, y]: Pt): Pt => [cx + x * s, cy + y * s];
  const L = (c: number, pts: Pt[]) => line(c, pts.map(P));
  const out: Stroke[] = [
    L(BLACK10, [...ellipse(0, 0, 190, 120, 36, Math.PI * 0.15, Math.PI * 2.13)]),
    L(BLACK10, ellipse(120, -150, 85, 80, 30)),
    L(ORANGE, [[195, -160], [270, -145], [200, -125]]),
    line(BLACK10, [P([140, -170])]),
    L(BLACK10, [[-80, -10], [20, -40], [60, 10], [-60, 40]]),
    L(ORANGE, [[-40, 115], [-45, 115 + 140 * legs], [-90, 130 + 140 * legs]]),
    L(ORANGE, [[50, 115], [55, 115 + 140 * legs], [10, 130 + 140 * legs]]),
  ];
  if (fill) for (let y = -100; y <= 100; y += 22) out.push(L(colour, [[-Math.sqrt(Math.max(0, 1 - (y / 115) ** 2)) * 175, y], [Math.sqrt(Math.max(0, 1 - (y / 115) ** 2)) * 175, y]]));
  if (pond) out.push(line(BLUE10, ellipse(cx - 40, cy + 330 * s + 160, 300, 70, 30)));
  return out;
}

/** Each guest's duck: sizes picked so the line-up has a story (Alex's long legs barely count; Tom drew a pond apart from his duck). */
const DUCKS: Record<string, () => Stroke[]> = {
  alex: () => duck(480, 560, 0.85, { legs: 2.6 }),
  greg: () => duck(500, 700, 1.7, { colour: BROWN }),
  mei: () => duck(470, 680, 1.15, { colour: GREEN10, fill: false }),
  priya: () => duck(520, 700, 0.6, { colour: PINK }),
  sam: () => duck(480, 660, 1.3),
  tom: () => duck(470, 520, 1.0, { pond: true }),
};

export function duckPages(ids: string[], opts: { partial?: boolean } = {}) {
  return Object.fromEntries(ids.map((id) => {
    const strokes = DUCKS[id]!();
    return [id, { p1: encodePage(opts.partial ? strokes.slice(0, 9) : strokes) }];
  }));
}
void GREEN;
