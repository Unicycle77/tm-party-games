import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import blank from "../assets/scoreboard/blank.jpg";
import frame from "../assets/frame.png";
import seal from "../assets/scoreboard/seal.png";
import type { HeadshotCrop, Player, Scoreboard } from "../types";
import { cropFill } from "./crop";
import { Mosaic } from "./Mosaic";
import { shownTotals } from "./scoring";
import "./scoreboard.css";

/**
 * The scoreboard on the big screen, ported as is from tm-scoreboard (VodBox's, MIT; see
 * THIRD_PARTY_NOTICES.md): framed headshots swaying over wax seals, lowest score on the left and the
 * leader on the right, enlarged. It shows the totals as of the host's last update; when the host
 * updates, it waits a second, ticks each seal to its new total over two seconds and slides everyone
 * into their new order, just like the original's Play button. Unless the host turned it off, anyone with a
 * headshot who hasn't checked in yet is a 3 by 4 mosaic of it, which sharpens to their face when they do.
 */
export function ScoreboardStage({ board, players }: { board: Scoreboard | undefined; players: Record<string, Player> | undefined }) {
  const contestants = Object.entries(board?.contestants ?? {}).sort(([, a], [, b]) => a.order - b.order);
  const target = shownTotals(board);
  const ids = contestants.map(([id]) => id);

  // What each seal says right now, and the left-to-right order; both move only when the totals change.
  const [shown, setShown] = useState<Record<string, number>>(() => target);
  const [order, setOrder] = useState<string[]>(() => byScore(ids, target));
  /** The totals the order and the leader's size go by, which change when the re-sort starts. */
  const [ranked, setRanked] = useState<Record<string, number>>(() => target);
  const last = useRef(target);
  const key = JSON.stringify(target);

  // Contestants added or removed: place them straight away, without animating anyone.
  const idsKey = ids.join(",");
  useEffect(() => {
    setOrder((o) => byScore([...o.filter((id) => ids.includes(id)), ...ids.filter((id) => !o.includes(id))], ranked));
  }, [idsKey]);

  useEffect(() => {
    const from = last.current;
    last.current = target;
    if (JSON.stringify(from) === key) return;
    let frameId = 0;
    // As in the original: hold for a second, then tick and re-sort together.
    const timer = window.setTimeout(() => {
      setOrder((o) => byScore(o, target));
      setRanked(target);
      let start = 0;
      const loop = (t: number) => {
        if (!start) start = t;
        const p = Math.min((t - start) / 2000, 1);
        const next: Record<string, number> = {};
        for (const id of new Set([...Object.keys(from), ...Object.keys(target)])) {
          const a = from[id] ?? 0, b = target[id] ?? 0;
          // Whole points tick; any fraction (a half point) switches halfway through.
          let n = Math.round(ease(p, Math.floor(a), Math.floor(b)));
          n += t - start < 1000 ? a - Math.floor(a) : b - Math.floor(b);
          next[id] = n;
        }
        setShown(next);
        if (p < 1) frameId = requestAnimationFrame(loop);
      };
      frameId = requestAnimationFrame(loop);
    }, 1000);
    return () => { clearTimeout(timer); cancelAnimationFrame(frameId); setShown(target); setRanked(target); };
  }, [key]);

  // Scaled to fit, as the original did: 275px a contestant, never taller than 1080px.
  const [box, setBox] = useState({ w: window.innerWidth, h: window.innerHeight });
  useLayoutEffect(() => {
    const onResize = () => setBox({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  const wm = 1400 * (contestants.length / 5);
  const m = wm ? Math.min(box.w / wm, box.h / 1080) : 1;

  const top = Math.max(...order.map((id) => ranked[id] ?? 0));
  const leaders = order.filter((id) => (ranked[id] ?? 0) === top).length;
  // Each headshot as the host cropped it (centred if not); the photo itself is never changed.
  const fill = Object.fromEntries(contestants.map(([id, c]) => [id, c.photo ? cropFill(c.photo, c.crop) : cropFill(blank, undefined)]));
  const pixelated = (c: (typeof contestants)[number][1]) => board?.pixelate !== false && !!c.photo && !(c.uid && players?.[c.uid]);
  const byId = Object.fromEntries(contestants);

  return (
    <div className="scoreboard-stage">
      <div className="scoreboard-main" style={{ transform: `scale(${m})`, left: (box.w - wm * m) / 2 }}>
        {/* The original adds the last contestant first, so each one overlaps the next to its left. */}
        {[...ids].reverse().map((id) => {
          const i = order.indexOf(id);
          const leader = (ranked[id] ?? 0) === top;
          return (
            <div key={id} className="sb-contestant" style={{ transform: `translateX(${275 * i + 30}px)` }}>
              <div className={`sb-frame-scaler${leader ? (leaders > 2 ? " sb-large" : " sb-larger") : ""}`}>
                <div className="sb-frame-container" style={{ animationDelay: `${-(ids.indexOf(id) + 1) * 1.25}s` }}>
                  <Face photo={byId[id]!.photo} crop={byId[id]!.crop} fill={fill[id]!} hidden={pixelated(byId[id]!)} />
                  <img className="sb-frame" src={frame} alt="" />
                </div>
              </div>
              <div className="sb-score-container">
                <img className="sb-seal" src={seal} alt="" />
                <h1 className="sb-score">{shown[id] ?? 0}</h1>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The mosaics a face sharpens through, in blocks across (four down for every three), before the photo itself. */
const REVEAL = [3, 6, 12, 24, 48];
/** How long each one holds: the whole reveal takes 2s, like the scores ticking up. */
const STEP = 400;

/**
 * What's in the frame: the headshot, or while `hidden` its 3 by 4 mosaic. When they check in it sharpens a step
 * at a time to the photo; a face that's sharp from the start never animates.
 */
function Face({ photo, crop, fill, hidden }: { photo?: string; crop?: HeadshotCrop; fill: CSSProperties; hidden: boolean }) {
  const [level, setLevel] = useState(hidden ? 0 : REVEAL.length);
  useEffect(() => {
    if (hidden) return setLevel(0);
    if (level >= REVEAL.length) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return setLevel(REVEAL.length);
    const timer = window.setTimeout(() => setLevel(level + 1), STEP);
    return () => clearTimeout(timer);
  }, [hidden, level]);
  const cols = REVEAL[level];
  return (
    <div className="sb-fill" style={photo && cols ? undefined : fill}>
      {photo && cols && <Mosaic photo={photo} crop={crop} cols={cols} rows={(cols * 4) / 3} />}
      <div className="sb-shadow" />
    </div>
  );
}

/** Lowest first; ties keep their current places (a stable sort, like the original's). */
const byScore = (ids: string[], scores: Record<string, number>) => [...ids].sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0));

function ease(t: number, a: number, b: number) {
  const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  return (b - a) * eased + a;
}
