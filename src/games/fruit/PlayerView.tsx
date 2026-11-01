import { ref, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import { GuestCard, Quote, Status, afterwards, useGuest } from "../../guest";
import type { Session } from "../../types";
import { Pens } from "../../drawing/Pens";
import { Sheet, SheetPad, SheetStrokes } from "../../drawing/surfaces/Sheet";
import { useSavedStrokes } from "../../drawing/useSaved";
import { useServerNow } from "../noisemaster/data";
import { PALETTE, WIDTH, answer, answerOf, dataOf, pageOf, path, running, started, timeText, timeUp, wordsOf } from "./data";

/**
 * The guest's phone, a step at a time. Part 1: the question quoted on the card, minutes and seconds, gold "Send my answer"
 * (no confirm), then the answer locked in. Part 2: the duck's sheet and ten markers with a thicker line, Undo and no send
 * button: no words and no time (the TV has the clock). At their own time the page goes in as drawn, and the card is the receipt.
 */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const { task, left } = useGuest();
  const data = dataOf(session);
  const go = running(session);
  const now = useServerNow(go);
  const head = task?.label.split(" · ")[0];
  const label = (part: number) => head?.startsWith("Task") ? `${head} · Part ${part}` : `Part ${part}`;
  const title = task?.title ?? "Fruit selfie";

  if (started(session)) {
    // Joined after the clock started, with no time of their own: they sit this one out.
    if (answerOf(session, uid) === undefined) {
      return <><Status>It's task time. This one started before you joined, so sit it out.</Status></>;
    }
    if (timeUp(session, uid, now)) return <Receipt code={code} uid={uid} session={session} label={label(2)} title={title} left={left} />;
    return (
      <>
        <Status>It's task time.</Status>
        <GuestCard label={label(2)} title={title}><Selfie code={code} uid={uid} session={session} /></GuestCard>
      </>
    );
  }
  if (!data.asked) {
    return (
      <>
        <Status>It's task time. Listen to the host.</Status>
        <GuestCard label={label(1)} title={title}><p className="slot-hint">The host is about to read it out.</p></GuestCard>
      </>
    );
  }
  const mine = answerOf(session, uid);
  if (mine !== undefined) {
    return (
      <>
        <Status>Waiting for the others.</Status>
        <GuestCard label={label(1)} title={title}>
          <Quote text={wordsOf(session)[0]} />
          <span className="stamp">✓ Sent</span>
          <p className="fruit-answer">{timeText(mine)}</p>
          <p className="slot-hint">🔒 You can't change it now.</p>
        </GuestCard>
      </>
    );
  }
  return (
    <>
      <Status>It's task time.</Status>
      <GuestCard label={label(1)} title={title}>
        <Quote text={wordsOf(session)[0]} />
        <Answer onSend={(ms) => void answer(code, uid, ms)} />
      </GuestCard>
    </>
  );
}

/** Minutes and seconds (the task editor's time-limit fields), and gold "Send my answer" once there's a time in them. */
export function Answer({ onSend, label = "Your answer", button = "Send my answer" }: { onSend: (ms: number) => void; label?: string; button?: string }) {
  const [min, setMin] = useState("");
  const [sec, setSec] = useState("");
  const ms = (Number(min || 0) * 60 + Number(sec || 0)) * 1000;
  return (
    <>
      <div className="time-limit">
        <span>{label}</span>
        <label><input inputMode="numeric" placeholder="0" aria-label="minutes" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, "").slice(0, 3))} /> min</label>
        <label><input inputMode="numeric" placeholder="0" aria-label="seconds" value={sec} onChange={(e) => setSec(e.target.value.replace(/\D/g, "").slice(0, 2))} /> sec</label>
      </div>
      {ms >= 1000 && <button className="big" onClick={() => onSend(ms)}>{button}</button>}
    </>
  );
}

function Selfie({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const { strokes, latest, change } = useSavedStrokes(code, path(code), `pages/${uid}/p1`, pageOf(session, uid));
  const [marker, setMarker] = useState(0);
  // The phone lies flat and nobody touches it with a finger: keep the screen awake while drawing, where the phone allows.
  useWakeLock();
  return (
    <>
      <Sheet look="paper">
        <SheetPad live marker={marker} palette={PALETTE} width={WIDTH} strokes={strokes} onStroke={(s) => change([...latest.current, s])} />
      </Sheet>
      <Pens palette={PALETTE} marker={marker} onMarker={setMarker} canUndo={strokes.length > 0} onUndo={() => change(latest.current.slice(0, -1))} />
    </>
  );
}

function useWakeLock() {
  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    let lock: { release: () => Promise<void> } | undefined;
    let gone = false;
    nav.wakeLock?.request("screen").then((l) => { if (gone) void l.release(); else lock = l; }).catch(() => { /* not allowed: fine */ });
    return () => { gone = true; void lock?.release().catch(() => {}); };
  }, []);
}

/** Their time's up (on the clock, or the host ended it): the card stays, the page small, the stamp. The same words either way. */
function Receipt({ code, uid, session, label, title, left }: { code: string; uid: string; session: Session; label: string; title: string; left: number }) {
  const sent = !!dataOf(session).submitted?.[uid];
  const once = useRef(false);
  useEffect(() => {
    if (sent || once.current) return;
    once.current = true;
    update(ref(db(), path(code)), { [`submitted/${uid}`]: true }).catch(() => { /* already final: the round is closed */ });
  }, [sent]);
  return (
    <>
      <Status>{afterwards("Time's up. Picture sent.", left)}</Status>
      <GuestCard label={label} title={title}>
        <Sheet look="paper" small><SheetStrokes strokes={pageOf(session, uid)} palette={PALETTE} width={WIDTH} /></Sheet>
        <span className="stamp">✓ Time's up</span>
        <p className="slot-hint">🔒 Your picture is locked in. You'll see it on the big screen.</p>
      </GuestCard>
    </>
  );
}
