import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { TaskCard } from "../../TaskCard";
import type { Display, Session } from "../../types";
import { FlipClock } from "../../clock/FlipClock";
import type { Mask } from "../../drawing/measure";
import { StrokesSvg } from "../../drawing/StrokesSvg";
import { useServerNow } from "../noisemaster/data";
import { DUCK_WORDS, HANG_MS, PAGE_H, PAGE_W, PALETTE, WASH_MS, closed, duckTask, pageOf, running, sizeOf, slideAt, useRemaining } from "./data";
import { duckStandings } from "./standings";

/** While they draw: the show's clock. Before and after it, the task's words, with the stamp once every duck is in. */
export function Collecting({ session }: { code: string; session: Session; viewOnly: boolean }) {
  const remaining = useRemaining(session);
  if (running(session)) return <FlipClock ms={remaining} width="93vh" className="tv" />;
  return <TaskCard lines={["", duckTask(session)?.text ?? DUCK_WORDS]}>{closed(session) && <span className="stamp all-in">✓ All submitted</span>}</TaskCard>;
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

/** A duck's measured silhouette as a picture, gold, for the wash. */
function washOf(mask: Mask | undefined): string | undefined {
  if (!mask || typeof document === "undefined") return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = mask.w;
  canvas.height = mask.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  const img = ctx.createImageData(mask.w, mask.h);
  for (let i = 0; i < mask.data.length; i++) {
    if (!mask.data[i]) continue;
    img.data.set([255, 214, 102, 255], i * 4);
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The line-up: every duck in its gold frame, its name on a paper label under it, hung in running order. Each one's
 * silhouette (what was measured) washes gold in turn, left to right, then the frames slide into size order, smallest on the
 * left, with "← smallest · biggest →" under them. Each of the host's knock-outs drops the two end frames together
 * (tipping outward), the rest staying put, until the median is left: the gold 5 lands on it. "Show the sizes" puts each
 * size on a paper label under the name. A DQ'd duck hangs at the far right, labelled DQ, and never falls.
 */
export function Stage({ session, display }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const { rows, lineUp, steps, dqs } = duckStandings(session);
  const n = rows.length;
  const start = display.revealAt ?? 0;
  const still = reduced();
  const now = useServerNow(Date.now() < start + slideAt(n) + 1500);
  const since = still ? Infinity : now - start;
  const slid = since >= slideAt(n);
  const out = Math.min(display.out ?? 0, steps.length);
  const fallen = new Set(steps.slice(0, out).flatMap((s) => s.out));
  // Frames that fall while this screen watches: the ones before it came up are simply gone.
  const seen = useRef<Set<string>>();
  if (!seen.current) seen.current = new Set(fallen);
  const done = slid && out >= steps.length;

  // Where each frame hangs: running order until the slide, then size order (the DQ'd at the far right).
  const order = slid ? [...lineUp, ...dqs] : rows.map((r) => r.uid);
  const cols = n <= 6 ? Math.max(1, n) : Math.ceil(n / 2);
  const rowsN = Math.ceil(n / cols) || 1;
  const vp = useViewport();
  const label = vp.h * (display.numbers ? 0.1 : 0.06);
  const cellW = (vp.w * 0.92) / cols;
  const cellH = (vp.h * 0.74) / rowsN;
  // The frame's border is about 7% of the page's width on each side.
  const frameH = Math.min((cellH - label) / 1.2, ((cellW * 0.8) / PAGE_W) * PAGE_H);
  const frameW = (frameH * PAGE_W) / PAGE_H;
  // Each row as tall as its frames and labels, so the line-up sits in the middle of the screen rather than up top.
  const rowH = Math.min(cellH, frameH * 1.2 + label);
  const washes = useMemo(() => Object.fromEntries(rows.map((r) => [r.uid, washOf(sizeOf(session, r.uid).mask)])), [rows.map((r) => r.uid).join(), session.games?.duck?.pages]);

  return (
    <main className="stage duck-stage" style={{ "--fw": `${frameW}px`, "--fh": `${frameH}px`, "--cw": `${cellW}px` } as CSSProperties}>
      <div className="duck-line" style={{ height: `${rowsN * rowH}px`, width: `${cols * cellW}px` }}>
        {rows.map((r, i) => {
          const at = order.indexOf(r.uid);
          const x = (at % cols) * cellW, y = Math.floor(at / cols) * rowH;
          const falls = fallen.has(r.uid);
          const gone = falls && seen.current!.has(r.uid);
          // The smaller half tips out to the left, the bigger to the right.
          const left = lineUp.indexOf(r.uid) < (lineUp.length - 1) / 2;
          const washAt = HANG_MS + i * WASH_MS;
          return (
            <figure key={r.uid} className={["duck-cell", falls && "falling", gone && "gone", done && r.won && "won"].filter(Boolean).join(" ")}
              style={{ transform: `translate(${x}px, ${y}px)`, "--dx": `${left ? -12 : 12}vw`, "--turn": `${left ? -35 : 35}deg` } as CSSProperties}>
              <div className="duck-frame">
                <StrokesSvg w={PAGE_W} h={PAGE_H} strokes={pageOf(session, r.uid)} palette={PALETTE} />
                {washes[r.uid] && !still && since < washAt + WASH_MS + 500 && (
                  <img className="duck-wash" src={washes[r.uid]} alt="" style={{ animationDelay: `${washAt - since}ms` }} />
                )}
                {done && r.won && <span className={r.bonus ? "five shifted" : "five"}>5</span>}
                {r.bonus > 0 && <span className={done && r.won ? "plus-one with-five" : "plus-one"}>+{r.bonus}</span>}
              </div>
              <figcaption>
                <span className="name">{r.name}</span>
                {(display.numbers || r.dq) && <span className="length">{r.dq ? "DQ" : `${r.sqIn} sq in`}</span>}
              </figcaption>
            </figure>
          );
        })}
      </div>
      {slid && <p className="duck-order">← smallest · biggest →</p>}
      <div className="stage-label"><span>median duck</span></div>
    </main>
  );
}
