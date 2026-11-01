import { ref, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import { MARKERS } from "../../drawing/palettes";
import { Pens } from "../../drawing/Pens";
import { boxAt, usePen } from "../../drawing/usePen";
import { useSavedStrokes } from "../../drawing/useSaved";
import { GuestCard, Quote, Status, afterwards, useGuest } from "../../guest";
import type { Session } from "../../types";
import { PageSvg } from "../flipchart/Portrait";
import { PAGE_H, PAGE_W } from "../flipchart/strokes";
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
  const { strokes, latest, change } = useSavedStrokes(code, path(code), `pages/${uid}/${SHEET}`, sheetOf(session, uid));
  const [marker, setMarker] = useState(0);
  const surface = useRef<HTMLDivElement>(null);
  const pen = usePen({ live, marker, at: (e) => boxAt(surface.current, PAGE_W, PAGE_H)(e), onStroke: (s) => change([...latest.current, s]) });

  return (
    <>
      <Sheet>
        <div ref={surface} className={live ? "acetate-surface live" : "acetate-surface"} {...pen.handlers}>
          <PageSvg strokes={strokes} draft={pen.draft} />
        </div>
      </Sheet>
      {live && <Pens palette={MARKERS} marker={marker} onMarker={setMarker} canUndo={strokes.length > 0} onUndo={() => change(latest.current.slice(0, -1))} />}
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
