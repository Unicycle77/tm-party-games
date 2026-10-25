import { GameBar } from "../../StageBar";
import { useEffect } from "react";
import { setDisplay } from "../../session";
import { useStageBarVisible } from "../../stageBar";
import type { Display, Session } from "../../types";
import { currentOf, pointsOf, revealOf } from "./data";
import { Envelope, Letter } from "./PlayerView";
import { Tally } from "./Tally";

/**
 * Main screen: "What was [NAME]'s secret?" over a sealed envelope. When the host unseals it the envelope
 * opens and the task is typed out. Between reveals (or before one starts) it's just a sealed envelope.
 */
export function Stage({ code, session, viewOnly }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const reveal = revealOf(session);
  const current = reveal && currentOf(session, reveal);
  return (
    <main className="stage envelopes">
      {reveal && current && reveal.title
        ? <Title session={session} order={reveal.order} />
        : reveal && current
        // A new envelope starts sealed, with the new name.
        ? <Opening key={`${reveal.startedAt}-${current.pos}`} name={session.players?.[current.uid]?.name ?? "?"} task={reveal.task} />
        : reveal ? <Finale session={session} shown={reveal.shown} order={reveal.order} points={pointsOf(reveal)} /> : (
          <>
            <h1 className="box-title">Secret Tasks</h1>
            <Envelope />
          </>
        )}
      {!viewOnly && <StageControls code={code} />}
    </main>
  );
}

function Opening({ name, task }: { name: string; task?: string }) {
  return (
    <>
      <h1 className="box-title">What was {name}'s secret?</h1>
      <div className="env-stack">
        <Envelope open={task !== undefined} />
        {task !== undefined && <Letter task={task} big />}
      </div>
    </>
  );
}

/** A number from a name, the same every time, so a card always lands in the same place. */
const hash = (text: string, salt: number) => {
  let h = salt;
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 1000) / 1000;
};

/**
 * Where each of `n` things lands on a loose grid filling the board (so none hides another), a little off-centre
 * and tilted, the same every time for the same key. A last row that isn't full sits in the middle.
 */
function scatter(keys: string[]) {
  const n = keys.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * 2.4)));
  const rows = Math.max(1, Math.ceil(n / cols));
  const spots = keys.map((key, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, n - row * cols);
    return {
      left: ((i % cols) + (cols - inRow) / 2 + 0.5 + (hash(key, 1) - 0.5) * 0.2) / cols * 100,
      top: (row + 0.45 + (hash(key, 2) - 0.5) * 0.2) / rows * 100,
      tilt: (hash(key, 3) - 0.5) * 50,
    };
  });
  return { cols, rows, spots };
}

/**
 * The reveal's opening: "Can everyone keep a secret?" (the rules' deadline) over the pile of sealed envelopes,
 * one per player with a task, hanging in one after another. The finish screen shows the same pile, opened.
 */
function Title({ session, order }: { session: Session; order: string[] }) {
  const uids = order.filter((uid) => session.players?.[uid]);
  const { cols, rows, spots } = scatter(uids);
  return (
    <>
      <h1 className="box-title">Can everyone keep a secret?</h1>
      <div className="finale" style={{ "--cols": cols, "--rows": rows } as React.CSSProperties}>
        {uids.map((uid, i) => (
          <div key={uid} className="finale-spot sealed" style={{ left: `${spots[i]!.left}%`, top: `${spots[i]!.top}%`, zIndex: i, animationDelay: `${i * 0.15}s` }}>
            <div className="finale-envelope" style={{ transform: `rotate(${spots[i]!.tilt}deg)` }}><Envelope /></div>
          </div>
        ))}
      </div>
    </>
  );
}

/**
 * "That's everyone!": every envelope that was opened, tossed in a pile, each with its player's task card
 * lying on it. They fall on a loose grid (so none hides another), in the order they were opened, each a
 * little off-centre and tilted. Each card carries its player's points as tally marks: the only place the
 * big screen shows a score.
 */
function Finale({ session, shown, order, points }: { session: Session; shown?: Record<string, string>; order: string[]; points: Record<string, number> }) {
  const cards = order.filter((uid) => shown?.[uid] && session.players?.[uid]);
  const cols = Math.max(1, Math.ceil(Math.sqrt(cards.length * 2.4)));
  const rows = Math.max(1, Math.ceil(cards.length / cols));
  return (
    <>
      <h1 className="box-title">That's everyone!</h1>
      <div className="finale" style={{ "--cols": cols, "--rows": rows } as React.CSSProperties}>
        {cards.map((uid, i) => {
          // A last row that isn't full sits in the middle.
          const row = Math.floor(i / cols);
          const inRow = Math.min(cols, cards.length - row * cols);
          const left = ((i % cols) + (cols - inRow) / 2 + 0.5 + (hash(uid, 1) - 0.5) * 0.2) / cols * 100;
          const top = (row + 0.45 + (hash(uid, 2) - 0.5) * 0.2) / rows * 100;
          return (
            <div key={uid} className="finale-spot" style={{ left: `${left}%`, top: `${top}%`, zIndex: i }}>
              <div className="finale-envelope" style={{ transform: `rotate(${(hash(uid, 3) - 0.5) * 50}deg)` }}><Envelope open /></div>
              <div className="finale-card" style={{ transform: `rotate(${(hash(uid, 4) - 0.5) * 12}deg)` }}>
                <strong>{session.players![uid]!.name} <Tally n={points[uid] ?? 0} /></strong>
                {shown![uid]}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/** Backup controls for the main screen (the host phone does the same). Keys: Esc or Backspace = back to the curtain. */
function StageControls({ code }: { code: string }) {
  const visible = useStageBarVisible();
  const back = () => void setDisplay(code, { step: "list" });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || (e.key !== "Escape" && e.key !== "Backspace")) return;
      e.preventDefault();
      back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return (
    <GameBar>
      <button onClick={back} tabIndex={visible ? 0 : -1}>← Players</button>
    </GameBar>
  );
}
