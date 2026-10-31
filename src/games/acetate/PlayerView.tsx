import { ref, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import { GuestCard, Quote, Status, afterwards, useGuest } from "../../guest";
import type { Session } from "../../types";
import { PageSvg } from "../flipchart/Portrait";
import { MARKERS, MIN_STEP, PAGE_H, PAGE_W, encodePage, type Stroke } from "../flipchart/strokes";
import { SHEET, acetateTask, closed, dataOf, drawOf, sheetOf, started, titleOfDraw, useRemaining } from "./data";

const path = (code: string) => `sessions/${code}/games/acetate`;

/**
 * The guest's acetate: a clear overhead projector sheet lying on the card. Before the host starts the clock it's there but
 * can't be drawn on (no pens yet). While the clock runs: the pens and ↶ Undo. There is no clock and no send button on the
 * phone: when the time is up everyone's goes in at once, and the card stays as the receipt. The phone always shows the
 * acetate the guest's way up; only the projector turns it over.
 */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const { task, left } = useGuest();
  const remaining = useRemaining(session);
  const label = task?.label ?? "Acetate";
  const title = task?.title ?? titleOfDraw(drawOf(acetateTask(session)));
  const live = started(session) && !closed(session) && remaining > 0;
  const over = started(session) && !live;

  if (over) return <Receipt code={code} uid={uid} session={session} label={label} title={title} left={left} />;
  return (
    <>
      <Status>{live ? "It's task time." : "Your time starts when the host says."}</Status>
      <GuestCard label={label} title={title}>
        {task?.text && <Quote text={task.text} />}
        <Acetate code={code} uid={uid} session={session} live={live} />
      </GuestCard>
    </>
  );
}

/** The sheet itself: clear, A4's shape, the card's paper showing through. `small` on the receipt. */
export function Sheet({ children, small = false }: { children?: React.ReactNode; small?: boolean }) {
  return <div className={small ? "acetate-sheet small" : "acetate-sheet"}>{children}</div>;
}

function Acetate({ code, uid, session, live }: { code: string; uid: string; session: Session; live: boolean }) {
  const [strokes, setStrokes] = useState(() => sheetOf(session, uid));
  const [marker, setMarker] = useState(0);
  const [draft, setDraft] = useState<Stroke>();
  const surface = useRef<HTMLDivElement>(null);
  const drawing = useRef<Stroke>();
  const dirty = useRef(false);
  const timer = useRef<number>();
  const latest = useRef(strokes);
  latest.current = strokes;

  // Saved a moment after each stroke, so a reloaded or swapped phone has it, and whatever's saved at 0:00 is what goes in.
  const flush = () => {
    window.clearTimeout(timer.current);
    if (!dirty.current) return;
    dirty.current = false;
    update(ref(db(), path(code)), { [`pages/${uid}/${SHEET}`]: encodePage(latest.current) || null }).catch(() => { /* the time ran out first: the acetate is what was saved */ });
  };
  const changed = (next: Stroke[]) => {
    latest.current = next;
    setStrokes(next);
    dirty.current = true;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 350);
  };
  useEffect(() => () => flush(), []);

  const at = (e: React.PointerEvent): [number, number] => {
    const box = surface.current!.getBoundingClientRect();
    const clamp = (v: number, max: number) => Math.min(max, Math.max(0, Math.round(v)));
    return [clamp(((e.clientX - box.left) / box.width) * PAGE_W, PAGE_W), clamp(((e.clientY - box.top) / box.height) * PAGE_H, PAGE_H)];
  };
  const down = (e: React.PointerEvent) => {
    if (!live) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = { c: marker, p: at(e) };
    setDraft(drawing.current);
  };
  const move = (e: React.PointerEvent) => {
    const s = drawing.current;
    if (!s) return;
    const [x, y] = at(e);
    if (Math.hypot(x - s.p[s.p.length - 2]!, y - s.p[s.p.length - 1]!) < MIN_STEP) return;
    drawing.current = { ...s, p: [...s.p, x, y] };
    setDraft(drawing.current);
  };
  const up = () => {
    const s = drawing.current;
    drawing.current = undefined;
    setDraft(undefined);
    if (s) changed([...latest.current, s]);
  };

  return (
    <>
      <Sheet>
        <div ref={surface} className={live ? "acetate-surface live" : "acetate-surface"} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <PageSvg strokes={strokes} draft={draft} />
        </div>
      </Sheet>
      {live && (
        <div className="fc-tools">
          {MARKERS.map((m, i) => (
            <button key={m.name} className={i === marker ? "ink on" : "ink"} style={{ background: m.colour }} aria-label={m.name} aria-pressed={i === marker} onClick={() => setMarker(i)} />
          ))}
          <button className="undo" disabled={strokes.length === 0} onClick={() => changed(latest.current.slice(0, -1))}>↶ Undo</button>
        </div>
      )}
    </>
  );
}

/** The time is up: everyone's acetate is in. The card stays, with the acetate small (the guest's way up) and the stamp. */
function Receipt({ code, uid, session, label, title, left }: { code: string; uid: string; session: Session; label: string; title: string; left: number }) {
  const sent = !!dataOf(session).submitted?.[uid];
  useEffect(() => {
    if (!sent) update(ref(db(), path(code)), { [`submitted/${uid}`]: true }).catch(() => { /* already final: the round is closed */ });
  }, [sent]);
  return (
    <>
      <Status>{afterwards("Time's up. Acetate in.", left)}</Status>
      <GuestCard label={label} title={title}>
        <Sheet small><PageSvg strokes={sheetOf(session, uid)} /></Sheet>
        <span className="stamp">✓ Submitted</span>
        <p className="slot-hint">🔒 Your acetate is locked in. You'll see it on the projector.</p>
      </GuestCard>
    </>
  );
}
