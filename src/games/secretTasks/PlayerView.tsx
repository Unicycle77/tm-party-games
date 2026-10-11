import { useEffect, useState } from "react";
import type { Session } from "../../types";
import { useMyTask } from "./data";

/** How long each letter of the task takes to be typed. */
const TYPE_MS = 45;

/** The task, typed out one letter at a time (all at once for anyone who prefers reduced motion). */
export function useTyped(text: string, active: boolean): string {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!active) { setN(0); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(text.length); return; }
    setN(0);
    const timer = window.setInterval(() => setN((i) => (i >= text.length ? i : i + 1)), TYPE_MS);
    return () => window.clearInterval(timer);
  }, [text, active]);
  return text.slice(0, n);
}

/** A white envelope sealed with the TM wax seal. `onOpen` makes it a button; without it, it's just a picture. */
export function Envelope({ open = false, onOpen }: { open?: boolean; onOpen?: () => void }) {
  const body = (
    <>
      <span className="env-back" />
      <span className="env-front" />
      <span className="env-flap" />
      <span className="wax-seal env-seal" aria-hidden="true">TM</span>
    </>
  );
  return onOpen && !open
    ? <button className="envelope" aria-label="Open your secret task" onClick={onOpen}>{body}</button>
    : <div className={open ? "envelope open" : "envelope"} aria-hidden={!onOpen}>{body}</div>;
}

/**
 * A player's secret task: a sealed envelope; opening it breaks the seal and the task is typed on the
 * paper that comes out. It can be sealed again, so it's never left open for a neighbour to read.
 */
export function SecretEnvelope({ code, uid }: { code: string; uid: string }) {
  const task = useMyTask(code, uid);
  const [open, setOpen] = useState(false);
  const typed = useTyped(task ?? "", open);

  if (task === undefined) return <section className="slot waiting"><p className="slot-hint">Loading…</p></section>;
  if (task === null) {
    return (
      <section className="slot waiting">
        <h2>Secret Tasks</h2>
        <p className="slot-hint">Your envelope hasn't arrived yet. It will show up here.</p>
      </section>
    );
  }
  return (
    <section className="slot envelope-slot">
      <h2>Your secret task</h2>
      <Envelope open={open} onOpen={() => setOpen(true)} />
      {open ? (
        <>
          <div className="env-letter">
            <p aria-label={task}><span aria-hidden="true">{typed}<span className="env-caret" /></span></p>
          </div>
          <button className="link" onClick={() => setOpen(false)}>Seal it again</button>
        </>
      ) : <p className="slot-hint">Tap the seal to open it. Tell no one.</p>}
    </section>
  );
}

/** The player's phone for this game: their envelope. */
export function PlayerView({ code, uid }: { code: string; uid: string; session: Session }) {
  return <SecretEnvelope code={code} uid={uid} />;
}

/**
 * On a player's phone, in any game: a button that swaps the game for their envelope and back. It only
 * appears once they have been dealt a task.
 */
export function SecretTaskTab({ code, uid, open, onToggle }: { code: string; uid: string; open: boolean; onToggle: () => void }) {
  const task = useMyTask(code, uid);
  if (!task && !open) return null;
  return <button className="secret-tab" aria-pressed={open} onClick={onToggle}>{open ? "← Back to the game" : "✉ My secret task"}</button>;
}
