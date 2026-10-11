import { useEffect, useRef, useState } from "react";
import type { Session } from "../../types";
import { TaskCard } from "../../TaskCard";
import { RULES, markSeen, pickEnvelope, useMyTask, useSeen } from "./data";

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
      <span className="env-flap-shade" />
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
 * The task on its paper, typed out. It lies in front of the envelope (put it inside `.env-stack`), so opening
 * one never makes the page taller. The whole task is laid out unseen from the start, so the paper doesn't
 * grow as the letters appear.
 */
export function Letter({ task, big = false, instant = false }: { task: string; big?: boolean; instant?: boolean }) {
  // A quick peek shows the whole task at once; typing it out is for the first reading and the big screen.
  const typed = useTyped(task, !instant);
  return (
    <div className={big ? "env-letter big" : "env-letter"}>
      <p aria-label={task}>
        <span className="env-ghost" aria-hidden="true">{task}</span>
        <span className="env-typed" aria-hidden="true">{instant ? task : typed}</span>
      </p>
    </div>
  );
}

/** The guest is in: the stamp, a welcome, and the rules card, above the pile they pick from. */
function Arrival({ name }: { name: string }) {
  return (
    <>
      <span className="stamp">✓ You're in</span>
      <h2>Welcome, {name}!</h2>
      <TaskCard lines={RULES} small />
    </>
  );
}

/**
 * The pile of sealed envelopes, scattered where they fell, that a player picks one from. Nothing on the
 * pile says what's inside: the choice is theirs alone, and the first player to take an envelope has it.
 * Guests pick at the door, before they can see the big screen, so the phone carries the moment: they're in,
 * the rules, then the pile.
 */
function Pile({ code, uid, session, onPicked }: { code: string; uid: string; session: Session; onPicked: () => void }) {
  const pile = Object.entries(session.games?.secretTasks?.pile ?? {});
  const [picked, setPicked] = useState<string>();
  const [error, setError] = useState<string>();
  const gone = !!picked && !session.games?.secretTasks?.pile?.[picked];
  const name = session.players?.[uid]?.name ?? "";

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
    // Rare (the host keeps extras), and the host's ✉ is already flagging it.
    return (
      <section className="slot envelope-slot arrival">
        <Arrival name={name} />
        <h2>No envelopes left yet.</h2>
        <p className="slot-hint">The host knows. More will appear here.</p>
      </section>
    );
  }
  return (
    <section className="slot envelope-slot arrival">
      <Arrival name={name} />
      <h2>Pick an envelope</h2>
      {picked && <p className="slot-hint">Opening it…</p>}
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
 * envelope, sealed. The first reading (straight after picking) is tap to open, with "Seal it again"; after
 * that it's hold to peek, so a phone put down mid-peek never leaves the task open. While it's sealed,
 * "Read the task again" unfolds the rules card above it.
 */
export function SecretEnvelope({ code, uid, session, onPicked = () => {} }: { code: string; uid: string; session: Session; onPicked?: () => void }) {
  const task = useMyTask(code, uid);
  const seen = useSeen(code, uid);
  const [open, setOpen] = useState(false);
  const [holding, setHolding] = useState(false);
  const [rules, setRules] = useState(false);
  // Once they've read it, the host phone stops flagging them as "haven't looked yet".
  useEffect(() => { if ((open || holding) && task) void markSeen(code, uid).catch(() => {}); }, [open, holding, task, code, uid]);
  // A task that arrives while the player is choosing from the pile opens by itself: that's the pick paying off.
  const before = useRef(task);
  useEffect(() => {
    if (before.current === null && typeof task === "string") setOpen(true);
    before.current = task;
  }, [task]);

  if (task === undefined || seen === undefined) return <section className="slot waiting"><p className="slot-hint">Loading…</p></section>;
  if (task === null) return <Pile code={code} uid={uid} session={session} onPicked={onPicked} />;

  // Tap to open only for the first reading (or while that reading is still open).
  const tapping = !seen || open;
  const showing = open || holding;
  const stop = () => setHolding(false);
  return (
    <section className="slot envelope-slot">
      <h2>Your secret task</h2>
      {rules && !showing && <TaskCard lines={RULES} small />}
      {tapping ? (
        <div className="env-stack">
          <Envelope open={open} onOpen={() => { setOpen(true); setRules(false); }} />
          {open && <Letter task={task} />}
        </div>
      ) : (
        <button className="env-stack env-hold" aria-label="Hold to read your secret task"
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); setHolding(true); setRules(false); }}
          onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onContextMenu={(e) => e.preventDefault()}
          onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") setHolding(true); }} onKeyUp={stop} onBlur={stop}>
          <Envelope open={holding} />
          {holding && <Letter task={task} instant />}
        </button>
      )}
      {open ? <button className="link" onClick={() => setOpen(false)}>Seal it again</button>
        : holding ? <p className="slot-hint">Let go and it seals.</p>
        : <>
            <p className="slot-hint">{tapping ? "Tap the seal to open it. Tell no one." : "Hold the seal to read it. Tell no one."}</p>
            <button className="link" aria-expanded={rules} onClick={() => setRules(!rules)}>{rules ? "Hide the task" : "Read the task again"}</button>
          </>}
    </section>
  );
}

/** The player's phone for this game: their envelope, or the pile to pick one from. */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  return <SecretEnvelope code={code} uid={uid} session={session} />;
}

/**
 * Wraps a player's phone in any other game. While they have no task, the pile comes first (a player picks on
 * checking in) and a button leads back to the game; afterwards the button swaps the game for their envelope and back.
 */
export function SecretTaskArea({ code, uid, session, children }: { code: string; uid: string; session: Session; children: React.ReactNode }) {
  const task = useMyTask(code, uid);
  const [shown, setShown] = useState<boolean>();
  // Anyone without a task arrives at the pile (or, rarely, the empty-pile note) before anything else.
  const showing = shown ?? task === null;
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
