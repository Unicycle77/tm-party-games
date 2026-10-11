import { useEffect, useState } from "react";
import type { Session } from "../../types";
import { pickEnvelope, useMyTask } from "./data";

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
export function Envelope({ open = false, onOpen, mini = false, label = "Open your secret task" }: { open?: boolean; onOpen?: () => void; mini?: boolean; label?: string }) {
  const body = (
    <>
      <span className="env-back" />
      <span className="env-front" />
      <span className="env-flap" />
      <span className="wax-seal env-seal" aria-hidden="true">TM</span>
    </>
  );
  const cls = mini ? "envelope mini" : "envelope";
  return onOpen && !open
    ? <button className={cls} aria-label={label} onClick={onOpen}>{body}</button>
    : <div className={open ? `${cls} open` : cls} aria-hidden={!onOpen}>{body}</div>;
}

/**
 * The pile of sealed envelopes, scattered where they fell, that a player picks one from. Nothing on the
 * pile says what's inside: the choice is theirs alone, and the first player to take an envelope has it.
 */
function Pile({ code, uid, session, onPicked }: { code: string; uid: string; session: Session; onPicked: () => void }) {
  const pile = Object.entries(session.games?.secretTasks?.pile ?? {});
  const [picked, setPicked] = useState<string>();
  const [error, setError] = useState<string>();
  const gone = !!picked && !session.games?.secretTasks?.pile?.[picked];

  // Taken by someone else first (the envelope vanished and no task came): back to choosing.
  useEffect(() => {
    if (!picked) return;
    const timer = window.setTimeout(() => { if (gone) { setPicked(undefined); setError("Someone got that one first. Pick another."); } }, 2500);
    return () => window.clearTimeout(timer);
  }, [picked, gone]);

  async function pick(id: string) {
    setPicked(id);
    setError(undefined);
    onPicked();
    try { await pickEnvelope(code, id, uid); }
    catch { setPicked(undefined); setError("Couldn't pick that one. Try another."); }
  }

  if (pile.length === 0) {
    return (
      <section className="slot waiting">
        <h2>Secret Tasks</h2>
        <p className="slot-hint">No envelopes on the pile right now. Check back soon, or ask the host.</p>
      </section>
    );
  }
  return (
    <section className="slot envelope-slot">
      <h2>Pick an envelope</h2>
      <p className="slot-hint">{picked ? "Opening it…" : "One secret task each. Choose carefully. Tell no one."}</p>
      <div className="env-pile">
        {pile.map(([id, spot]) => (
          <span key={id} className={id === picked ? "pile-spot picked" : "pile-spot"}
            style={{ left: `${spot.x}%`, top: `${spot.y}%`, transform: `rotate(${spot.r}deg)` }}>
            {picked ? <Envelope mini /> : <Envelope mini label="Pick this envelope" onOpen={() => void pick(id)} />}
          </span>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
    </section>
  );
}

/**
 * A player's secret task. Until they have one: the pile of envelopes to pick from. After: their own
 * envelope, sealed; opening it breaks the seal and the task is typed on the paper that comes out. It can
 * be sealed again, so it's never left open for a neighbour to read.
 */
export function SecretEnvelope({ code, uid, session, onPicked = () => {} }: { code: string; uid: string; session: Session; onPicked?: () => void }) {
  const task = useMyTask(code, uid);
  const [open, setOpen] = useState(false);
  const typed = useTyped(task ?? "", open);

  if (task === undefined) return <section className="slot waiting"><p className="slot-hint">Loading…</p></section>;
  if (task === null) return <Pile code={code} uid={uid} session={session} onPicked={onPicked} />;
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

/** The player's phone for this game: their envelope, or the pile to pick one from. */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  return <SecretEnvelope code={code} uid={uid} session={session} />;
}

/**
 * Wraps a player's phone in any other game. While they have no task, a button always leads to the pile,
 * which comes first when there are envelopes to pick (a player picks on checking in); afterwards the button
 * swaps the game for their envelope and back.
 */
export function SecretTaskArea({ code, uid, session, children }: { code: string; uid: string; session: Session; children: React.ReactNode }) {
  const task = useMyTask(code, uid);
  const [shown, setShown] = useState<boolean>();
  const pickable = task === null && Object.keys(session.games?.secretTasks?.pile ?? {}).length > 0;
  const showing = shown ?? pickable;
  // Anyone without a task can always get to the pile, even while it's empty; it opens by itself only when there's something to pick.
  const available = task !== undefined;
  return (
    <>
      {available && (
        <button className="secret-tab" aria-pressed={showing} onClick={() => setShown(!showing)}>
          {showing ? "← Back" : task ? "✉ My secret task" : "✉ Pick your secret envelope"}
        </button>
      )}
      {showing && available ? <SecretEnvelope code={code} uid={uid} session={session} onPicked={() => setShown(true)} /> : children}
    </>
  );
}
