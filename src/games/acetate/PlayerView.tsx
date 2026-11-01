import { ref, update } from "firebase/database";
import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { MARKERS } from "../../drawing/palettes";
import { Pens } from "../../drawing/Pens";
import { Sheet, SheetPad, SheetStrokes } from "../../drawing/surfaces/Sheet";
import { useSavedStrokes } from "../../drawing/useSaved";
import { GuestCard, Quote, Status, afterwards, useGuest } from "../../guest";
import type { Session } from "../../types";
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

function Acetate({ code, uid, session, live }: { code: string; uid: string; session: Session; live: boolean }) {
  const { strokes, latest, change } = useSavedStrokes(code, path(code), `pages/${uid}/${SHEET}`, sheetOf(session, uid));
  const [marker, setMarker] = useState(0);

  return (
    <>
      <Sheet look="acetate">
        <SheetPad live={live} marker={marker} palette={MARKERS} strokes={strokes} onStroke={(s) => change([...latest.current, s])} />
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
        <Sheet look="acetate" small><SheetStrokes strokes={sheetOf(session, uid)} palette={MARKERS} /></Sheet>
        <span className="stamp">✓ Submitted</span>
        <p className="slot-hint">🔒 Your acetate is locked in. You'll see it on the projector.</p>
      </GuestCard>
    </>
  );
}
