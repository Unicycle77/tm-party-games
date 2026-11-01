import { useEffect, useState, type CSSProperties } from "react";
import { TaskCard } from "../../TaskCard";
import type { Display, Session } from "../../types";
import { FlipClock } from "../../clock/FlipClock";
import { clipBefore, clipFrom } from "../../drawing/measure";
import { useServerOffset } from "../noisemaster/data";
import { SHEET, SNAKE_WORDS, UNROLL_DELAY, UNROLL_SPEED, closed, inchesText, lengthOf, running, sheetsText, snakeTask, stripOf, useRemaining } from "./data";
import { PaperStrip, RollSvg } from "../../drawing/surfaces/Roll";
import { MARKERS } from "../../drawing/palettes";
import { standingsOf } from "./standings";

/** While they draw: the show's clock. Before and after it, the task's words, with the stamp once everyone's roll is in. */
export function Collecting({ session }: { code: string; session: Session; viewOnly: boolean }) {
  const remaining = useRemaining(session);
  if (running(session)) return <FlipClock ms={remaining} width="93vh" className="tv" />;
  return <TaskCard lines={["", snakeTask(session)?.text ?? SNAKE_WORDS]}>{closed(session) && <span className="stamp all-in">✓ All submitted</span>}</TaskCard>;
}

/** Server time, every frame while `on`. */
function useFrameNow(on: boolean) {
  const offset = useServerOffset();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const tick = () => { setNow(Date.now()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return now + offset;
}

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);
  return v;
}

/** The gap between a roll's ragged end and its taped-on torn piece, in roll units. */
const GAP = 34;
const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The race: every roll side by side across the top, in running order, each guest's name on a paper label above it, each
 * hanging as it was at 0:00 (a torn piece taped on below, the same paper, its ragged top matching the tear). At the host's
 * "▶ Unroll the snakes" they all unroll downward together at one speed; a roll that has run out becomes its empty cardboard
 * tube, so the longest finishes last. The view zooms out as the longest still unrolling nears the bottom (the rolls pinned
 * to the top, the labels staying full size). "Show the lengths" adds a paper label under each name, the gold glow and a
 * gold 5 on the second longest; the best-snake bonus is a round +1. A thin spot gets a red marker ring when the host asks.
 */
export function Stage({ session, display }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const rows = standingsOf(session);
  const start = (display.revealAt ?? 0) + UNROLL_DELAY;
  const longest = Math.max(0, ...rows.map((r) => r.stopsAt));
  const instant = reduced();
  const now = useFrameNow(!instant && Date.now() < (display.revealAt ?? 0) + longest + 1000);
  const ran = instant ? Infinity : Math.max(0, now - start);
  const vp = useViewport();
  const n = Math.max(1, rows.length);

  const strips = rows.map((r) => {
    const s = stripOf(session, r.uid);
    const shown = Math.min(s.full, s.hang + (ran * UNROLL_SPEED) / 1000);
    return { ...s, shown, done: shown >= s.full };
  });
  // Sizes in pixels: a column per roll; the paper is 85.333% of the roll's width, 1000 units across.
  const colW = Math.min((vp.w * 0.92) / n, vp.w * 0.2);
  const top = vp.h * (display.numbers ? 0.17 : 0.12);
  const avail = vp.h * 0.86 - top;
  const need = Math.max(SHEET, ...strips.map((s) => s.shown + (s.tear > 0 ? GAP + s.tear : 0)));
  const z = Math.min(1, avail / (colW * (138 / 300 + (need * 0.85333) / 1000)));
  const rollW = colW * z;

  return (
    <main className="stage race-stage" style={{ "--col": `${colW}px`, "--roll": `${rollW}px`, "--top": `${top}px` } as CSSProperties}>
      <div className="race">
        {rows.map((r, i) => {
          const s = strips[i]!;
          const m = lengthOf(session, r.uid);
          const rings = display.circle === r.uid && (m.thin.length || m.thinAll)
            ? (m.thinAll ? [] : m.thin).map((t, k) => <ellipse key={k} className="thin-ring" cx={t.x} cy={t.y} rx={t.r * 1.15} ry={t.r} transform={`rotate(${k % 2 ? 8 : -6} ${t.x} ${t.y})`} />)
            : null;
          return (
            <figure key={r.uid} className={display.numbers && r.won ? "won" : undefined}>
              <figcaption>
                <span className="name">{r.name}</span>
                {display.numbers && <span className="length">{r.dq ? "DQ" : `${inchesText(r.inches)} · ${sheetsText(r.sheets)}`}</span>}
              </figcaption>
              <div className="race-roll">
                <RollSvg empty={s.done} aria-hidden="true" />
                <div className={display.circle === r.uid && m.thinAll ? "race-paper all-thin" : "race-paper"}>
                  <PaperStrip strokes={clipFrom(s.strokes, s.tear)} palette={MARKERS} top={s.tear + s.shown} bottom={s.tear} height={s.shown} torn={s.tear > 0 ? "below" : undefined} marks={rings} />
                  {s.tear > 0 && (
                    <div className="race-torn" style={{ marginTop: `${(GAP * rollW * 0.85333) / 1000}px` }}>
                      <span className="tape left" /><span className="tape right" />
                      <PaperStrip strokes={clipBefore(s.strokes, s.tear)} palette={MARKERS} top={s.tear} bottom={0} height={s.tear} torn="above" />
                    </div>
                  )}
                </div>
                {display.numbers && r.won && <span className={r.bonus ? "five shifted" : "five"}>5</span>}
                {r.bonus > 0 && <span className={display.numbers && r.won ? "plus-one with-five" : "plus-one"}>+{r.bonus}</span>}
              </div>
            </figure>
          );
        })}
      </div>
      <div className="stage-label"><span>second longest snake</span></div>
    </main>
  );
}
