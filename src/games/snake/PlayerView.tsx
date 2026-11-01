import { ref, update } from "firebase/database";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import { GuestCard, Status, afterwards, useGuest } from "../../guest";
import type { Session } from "../../types";
import { MARKERS } from "../../drawing/palettes";
import { Pens } from "../../drawing/Pens";
import { usePen } from "../../drawing/usePen";
import { useSavedStrokes } from "../../drawing/useSaved";
import { clipBefore, clipFrom } from "../../drawing/measure";
import { MAX_OUT, ROLL_W, SHEET, closed, dataOf, rollOf, started, tearOf, useRemaining } from "./data";
import { PaperStrip, RollSvg } from "./Roll";

const path = (code: string) => `sessions/${code}/games/snake`;
/** The paper in view: one sheet's height, below the roll. */
const VIEW = SHEET;
/** A flick keeps the roll spinning, slowing like a real one: this is how quickly (ms for the speed to fall to about a third). */
const SPIN = 380;
/** The ✂ shows in the last half minute. */
const SCISSORS_MS = 30_000;
/** How long the torn piece takes to fall before the receipt. */
const TEAR_MS = 1600;

const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** "3:00": the time left, as the status line says it. */
const clockText = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The guest's toilet roll. No task words on the phone (the host reads them; the TV has them), so the roll looks like a
 * roll: the card's label and title, the roll at the top with the first sheet hanging, the four markers and Undo, and the
 * time in the status line. Swiping the roll pulls paper (a flick spins it out) or rolls it back up (only while dragging);
 * the paper itself only ever takes ink. In the last 30 seconds a ✂ in the margin marks the perforation the paper will tear
 * at. At 0:00 whatever's still out below that perforation tears off and falls away, and the card becomes the receipt.
 */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const { task, left } = useGuest();
  const remaining = useRemaining(session);
  const label = task?.label ?? "Toilet roll";
  const title = task?.title ?? "Second longest snake";
  const live = started(session) && !closed(session) && remaining > 0;
  const over = started(session) && !live;
  // Seen drawing when the time ran out: the tear plays here before the receipt. Arriving later, straight to the receipt.
  const wasLive = useRef(live);
  const [tearing, setTearing] = useState(false);
  useEffect(() => {
    if (over && wasLive.current) {
      wasLive.current = false;
      if (tearOf(rollOf(session, uid).out) > 0) {
        setTearing(true);
        const t = window.setTimeout(() => setTearing(false), reduced() ? 700 : TEAR_MS);
        return () => window.clearTimeout(t);
      }
    }
    if (live) wasLive.current = true;
  }, [over, live]);

  if (over && !tearing) return <Receipt code={code} uid={uid} session={session} label={label} title={title} left={left} />;
  return (
    <>
      <Status>{tearing ? "Time's up." : live ? `It's task time. ${clockText(remaining)} left.` : "Your time starts when the host says."}</Status>
      <GuestCard label={label} title={title}>
        <Roll code={code} uid={uid} session={session} live={live} tearing={tearing} remaining={remaining} />
      </GuestCard>
    </>
  );
}

/** The width of an element, kept up to date. */
function useWidth<T extends HTMLElement>() {
  const el = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!el.current) return;
    setW(el.current.getBoundingClientRect().width);
    const ro = new ResizeObserver(([e]) => setW(e!.contentRect.width));
    ro.observe(el.current);
    return () => ro.disconnect();
  }, []);
  return [el, w] as const;
}

function Roll({ code, uid, session, live, tearing, remaining }: { code: string; uid: string; session: Session; live: boolean; tearing: boolean; remaining: number }) {
  const saved = rollOf(session, uid);
  const base = `pages/${uid}`;
  const { strokes, latest, change, keep, flush } = useSavedStrokes(code, path(code), `${base}/p1`, saved.strokes);
  const [out, setOut] = useState(saved.out);
  const outRef = useRef(out);
  const [pulled, setPulled] = useState(saved.out > SHEET);
  const [marker, setMarker] = useState(0);
  const [box, width] = useWidth<HTMLDivElement>();
  const win = useRef<HTMLDivElement>(null);
  // Pixels per roll unit: the paper is 85.333% of the card's width, and 1000 units across.
  const scale = (width * 0.85333) / ROLL_W;

  const moveTo = (next: number) => {
    const v = Math.min(MAX_OUT, Math.max(SHEET, next));
    if (v === outRef.current) return false;
    outRef.current = v;
    setOut(v);
    keep(`${base}/out`, String(Math.round(v)));
    return true;
  };
  // Everything's saved as the time runs out, so what tears is what the phone shows.
  useEffect(() => { if (live && remaining < 1200) flush(); }, [live, remaining < 1200]);

  // The swipe on the roll: follows the finger; a downward flick spins on and slows; rolling up only moves while dragging.
  const swipe = useRef<{ y: number; t: number; v: number }>();
  const spin = useRef<number>();
  const stopSpin = () => { if (spin.current) cancelAnimationFrame(spin.current); spin.current = undefined; };
  useEffect(() => stopSpin, []);
  useEffect(() => { if (!live) stopSpin(); }, [live]);
  const rollDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!live || !scale) return;
    stopSpin();
    e.currentTarget.setPointerCapture(e.pointerId);
    swipe.current = { y: e.clientY, t: performance.now(), v: 0 };
  };
  const rollMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const s = swipe.current;
    if (!s) return;
    const now = performance.now();
    const dy = (e.clientY - s.y) / scale;
    const dt = Math.max(1, now - s.t);
    s.v = s.v * 0.6 + (dy / dt) * 1000 * 0.4;
    s.y = e.clientY; s.t = now;
    if (moveTo(outRef.current + dy) && dy > 0) setPulled(true);
  };
  const rollUp = () => {
    const s = swipe.current;
    swipe.current = undefined;
    if (!s || !live || reduced() || s.v < 400 || performance.now() - s.t > 80) return;
    let v = s.v, last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      v *= Math.exp(-dt / SPIN);
      if (v < 60 || !moveTo(outRef.current + (v * dt) / 1000)) { spin.current = undefined; return; }
      spin.current = requestAnimationFrame(step);
    };
    spin.current = requestAnimationFrame(step);
  };

  // Drawing on the paper in view: y' down from the roll, so along the paper it's out − y'.
  const pen = usePen({
    live: live && scale > 0, marker,
    at: (e) => {
      const r = win.current!.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * ROLL_W, y = ((e.clientY - r.top) / r.width) * ROLL_W;
      if (y < 0 || y > VIEW) return undefined;
      return [Math.round(Math.min(ROLL_W, Math.max(0, x))), Math.round(outRef.current - y)];
    },
    onStroke: (s) => change([...latest.current, s]),
  });

  const tear = tearOf(out);
  const showScissors = live && remaining <= SCISSORS_MS && tear > 0;
  const rollH = (width * 138) / 300;
  const cut = out - tear;
  return (
    <>
      <div className="tp" ref={box}>
        <RollSvg hint={live && !pulled} onPointerDown={rollDown} onPointerMove={rollMove} onPointerUp={rollUp} onPointerCancel={rollUp}
          role="img" aria-label="The roll: swipe down to pull paper, up to roll it up" />
        <div ref={win} className={live ? "tp-win live" : "tp-win"} {...pen.handlers}>
          {tearing && tear > 0
            ? <PaperStrip strokes={clipFrom(strokes, tear)} top={out} bottom={tear} height={VIEW} torn="below" />
            : <PaperStrip strokes={strokes} top={out} bottom={0} height={VIEW} draft={pen.draft} />}
        </div>
        {showScissors && <span className="tp-cut" style={{ top: rollH + cut * scale }} aria-hidden="true">✂</span>}
        {tearing && tear > 0 && cut < VIEW && (
          <div className={reduced() ? "tp-fall fade" : "tp-fall"} style={{ top: rollH + cut * scale, height: (VIEW - cut) * scale } as React.CSSProperties}>
            <PaperStrip strokes={clipBefore(strokes, tear)} top={tear} bottom={Math.max(0, tear - (VIEW - cut))} height={VIEW - cut} torn="above" />
          </div>
        )}
      </div>
      {live && <Pens palette={MARKERS} marker={marker} onMarker={setMarker} canUndo={strokes.length > 0} onUndo={() => change(latest.current.slice(0, -1))} />}
    </>
  );
}

/** The time is up: what was kept is in. The roll small, with what still hangs (ragged if it tore), and the stamp. */
function Receipt({ code, uid, session, label, title, left }: { code: string; uid: string; session: Session; label: string; title: string; left: number }) {
  const sent = !!dataOf(session).submitted?.[uid];
  useEffect(() => {
    if (!sent) update(ref(db(), path(code)), { [`submitted/${uid}`]: true }).catch(() => { /* already final: the round is closed */ });
  }, [sent]);
  const { strokes, out, tear } = rollOf(session, uid);
  const hang = Math.min(VIEW, out - tear);
  return (
    <>
      <Status>{afterwards("Time's up. Snake sent.", left)}</Status>
      <GuestCard label={label} title={title}>
        <div className="tp small">
          <RollSvg aria-hidden="true" />
          <div className="tp-win">
            <PaperStrip strokes={clipFrom(strokes, tear)} top={out} bottom={tear} height={hang} torn={tear > 0 ? "below" : undefined} />
          </div>
        </div>
        <span className="stamp">✓ Submitted</span>
        <p className="slot-hint">🔒 Your snake is locked in. You'll see it on the big screen.</p>
      </GuestCard>
    </>
  );
}
