import { ref, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import { GuestCard, Status, afterwards, useGuest } from "../../guest";
import type { Session } from "../../types";
import { Pens } from "../../drawing/Pens";
import { StrokesSvg } from "../../drawing/StrokesSvg";
import { boxAt, usePen } from "../../drawing/usePen";
import { useSavedStrokes } from "../../drawing/useSaved";
import { PAGE_H, PAGE_W, PALETTE, closed, dataOf, pageOf, started, useRemaining } from "./data";

const path = (code: string) => `sessions/${code}/games/duck`;

/** "1:40": the time left, as the status line says it. */
const clockText = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The guest's sheet of paper. No task words on the phone (the host reads them out): the card's label and title, a plain
 * white A4 sheet, the ten markers in two rows with Undo, and the time in the status line. Gold "Send my duck" once there's
 * something on the page, asking first; at 0:00 whatever's drawn goes in on its own. Then the card is the receipt.
 */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const { task, left } = useGuest();
  const remaining = useRemaining(session);
  const label = task?.label ?? "Paper";
  const title = task?.title ?? "Median duck";
  const live = started(session) && !closed(session) && remaining > 0;
  const over = started(session) && !live;
  const sent = !!dataOf(session).submitted?.[uid];

  if (sent || over) return <Receipt code={code} uid={uid} session={session} sent={sent} label={label} title={title} left={left} />;
  return (
    <>
      <Status>{live ? `It's task time. ${clockText(remaining)} left.` : "Your time starts when the host says."}</Status>
      <GuestCard label={label} title={title}>
        <Duck code={code} uid={uid} session={session} live={live} />
      </GuestCard>
    </>
  );
}

/** Plain paper: a white A4 sheet. `small` on the receipt. */
export function Paper({ children, small = false }: { children?: React.ReactNode; small?: boolean }) {
  return <div className={small ? "paper-sheet small" : "paper-sheet"}>{children}</div>;
}

function Duck({ code, uid, session, live }: { code: string; uid: string; session: Session; live: boolean }) {
  const { strokes, latest, change, flush } = useSavedStrokes(code, path(code), `pages/${uid}/p1`, pageOf(session, uid));
  const [marker, setMarker] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const surface = useRef<HTMLDivElement>(null);
  const pen = usePen({ live, marker, at: (e) => boxAt(surface.current, PAGE_W, PAGE_H)(e), onStroke: (s) => change([...latest.current, s]) });
  const sendIt = () => flush({ [`submitted/${uid}`]: true, [`unlocked/${uid}`]: null });

  return (
    <>
      <Paper>
        <div ref={surface} className={live ? "paper-surface live" : "paper-surface"} {...pen.handlers}>
          <StrokesSvg w={PAGE_W} h={PAGE_H} strokes={strokes} draft={pen.draft} palette={PALETTE} />
        </div>
      </Paper>
      {live && <Pens palette={PALETTE} marker={marker} onMarker={setMarker} canUndo={strokes.length > 0} onUndo={() => change(latest.current.slice(0, -1))} />}
      {live && strokes.length > 0 && (confirming ? (
        <div className="fc-confirm">
          <p><b>Send your duck?</b> You can't change it after.</p>
          <div className="row">
            <button onClick={() => setConfirming(false)}>Keep drawing</button>
            <button className="big" onClick={sendIt}>Yes, send it</button>
          </div>
        </div>
      ) : <button className="big" onClick={() => setConfirming(true)}>Send my duck</button>)}
    </>
  );
}

/** Sent, or the time ran out (which sends whatever is drawn): the card stays, the page small, and the stamp. */
function Receipt({ code, uid, session, sent, label, title, left }: { code: string; uid: string; session: Session; sent: boolean; label: string; title: string; left: number }) {
  const timesUp = useRef(!sent).current;
  useEffect(() => {
    if (!sent) update(ref(db(), path(code)), { [`submitted/${uid}`]: true }).catch(() => { /* already final: the round is closed */ });
  }, [sent]);
  return (
    <>
      <Status>{afterwards(timesUp ? "Time's up. Duck sent." : "Duck sent.", left)}</Status>
      <GuestCard label={label} title={title}>
        <Paper small><StrokesSvg w={PAGE_W} h={PAGE_H} strokes={pageOf(session, uid)} palette={PALETTE} /></Paper>
        <span className="stamp">✓ Submitted</span>
        <p className="slot-hint">🔒 Your duck is locked in. You'll see it on the big screen.</p>
      </GuestCard>
    </>
  );
}
