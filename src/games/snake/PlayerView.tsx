import { ref, update } from "firebase/database";
import { useEffect, useRef, useState } from "react";
import { db } from "../../firebase";
import { GuestCard, Status, afterwards, useGuest } from "../../guest";
import type { Session } from "../../types";
import { MARKERS } from "../../drawing/palettes";
import { Pens } from "../../drawing/Pens";
import { useSavedStrokes } from "../../drawing/useSaved";
import { RollPad, RollStill, tearOf } from "../../drawing/surfaces/Roll";
import { closed, dataOf, rollOf, started, useRemaining } from "./data";

const path = (code: string) => `sessions/${code}/games/snake`;
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

function Roll({ code, uid, session, live, tearing, remaining }: { code: string; uid: string; session: Session; live: boolean; tearing: boolean; remaining: number }) {
  const saved = rollOf(session, uid);
  const base = `pages/${uid}`;
  const { strokes, latest, change, keep, flush } = useSavedStrokes(code, path(code), `${base}/p1`, saved.strokes);
  const [marker, setMarker] = useState(0);
  // Everything's saved as the time runs out, so what tears is what the phone shows.
  useEffect(() => { if (live && remaining < 1200) flush(); }, [live, remaining < 1200]);

  return (
    <>
      <RollPad live={live} marker={marker} palette={MARKERS} strokes={strokes} onStroke={(s) => change([...latest.current, s])}
        initialOut={saved.out} onOut={(out) => keep(`${base}/out`, String(Math.round(out)))}
        tearing={tearing} scissors={live && remaining <= SCISSORS_MS} />
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
  const { strokes, out } = rollOf(session, uid);
  return (
    <>
      <Status>{afterwards("Time's up. Snake sent.", left)}</Status>
      <GuestCard label={label} title={title}>
        <RollStill strokes={strokes} palette={MARKERS} out={out} small />
        <span className="stamp">✓ Submitted</span>
        <p className="slot-hint">🔒 Your snake is locked in. You'll see it on the big screen.</p>
      </GuestCard>
    </>
  );
}
