import { useEffect } from "react";
import { setDisplay } from "../../session";
import { useStageBarVisible } from "../../stageBar";
import type { Display, Session } from "../../types";
import { currentOf, revealOf } from "./data";
import { Envelope, Letter } from "./PlayerView";

/**
 * Main screen: "What was [NAME]'s secret?" over a sealed envelope. When the host unseals it the envelope
 * opens and the task is typed out. Between reveals (or before one starts) it's just a sealed envelope.
 */
export function Stage({ code, session, viewOnly }: { code: string; session: Session; display: Display; viewOnly: boolean }) {
  const reveal = revealOf(session);
  const current = reveal && currentOf(session, reveal);
  return (
    <main className="stage envelopes">
      {reveal && current
        // A new envelope starts sealed, with the new name.
        ? <Opening key={`${reveal.startedAt}-${current.pos}`} name={session.players?.[current.uid]?.name ?? "?"} task={reveal.task} />
        : reveal ? <Finale session={session} shown={reveal.shown} order={reveal.order} /> : (
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
 * "That's everyone!": every envelope that was opened, tossed in a pile, each with its player's task card
 * lying on it. They fall on a loose grid (so none hides another), in the order they were opened, each a
 * little off-centre and tilted.
 */
function Finale({ session, shown, order }: { session: Session; shown?: Record<string, string>; order: string[] }) {
  const cards = order.filter((uid) => shown?.[uid] && session.players?.[uid]);
  const cols = Math.max(1, Math.ceil(Math.sqrt(cards.length * 2.4)));
  const rows = Math.max(1, Math.ceil(cards.length / cols));
  return (
    <>
      <h1 className="box-title">That's everyone!</h1>
      <div className="finale" style={{ "--cols": cols } as React.CSSProperties}>
        {cards.map((uid, i) => {
          // A last row that isn't full sits in the middle.
          const row = Math.floor(i / cols);
          const inRow = Math.min(cols, cards.length - row * cols);
          const left = ((i % cols) + (cols - inRow) / 2 + 0.5 + (hash(uid, 1) - 0.5) * 0.3) / cols * 100;
          const top = (row + 0.45 + (hash(uid, 2) - 0.5) * 0.3) / rows * 100;
          return (
            <div key={uid} className="finale-spot" style={{ left: `${left}%`, top: `${top}%`, zIndex: i }}>
              <div className="finale-envelope" style={{ transform: `rotate(${(hash(uid, 3) - 0.5) * 50}deg)` }}><Envelope open /></div>
              <div className="finale-card" style={{ transform: `rotate(${(hash(uid, 4) - 0.5) * 12}deg)` }}>
                <strong>{session.players![uid]!.name}</strong>
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
    <div className={visible ? "stage-controls show" : "stage-controls"} aria-hidden={!visible}>
      <button onClick={back} tabIndex={visible ? 0 : -1}>← Players</button>
    </div>
  );
}
