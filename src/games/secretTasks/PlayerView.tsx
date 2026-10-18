import { useEffect, useRef, useState } from "react";
import type { Session } from "../../types";
import { Status } from "../../guest";
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

/**
 * The pile of sealed envelopes, scattered where they fell, that a player picks one from. Nothing on the
 * pile says what's inside: the choice is theirs alone, and the first player to take an envelope has it.
 * Envelopes can be dragged around first (on this phone only), so none stays hidden under another;
 * a tap picks one.
 * Guests pick at the door, before they can see the big screen, so the phone carries the moment in two
 * steps: first the whole rules card (the Taskmaster task, never paraphrased) with "Got it", then the pile
 * on the curtain. The circled ? by "Pick an envelope" lays the same card over the pile, so nothing below moves.
 */
function Pile({ code, uid, session, onPicked }: { code: string; uid: string; session: Session; onPicked: () => void }) {
  const pile = Object.entries(session.games?.secretTasks?.pile ?? {});
  const [gotIt, setGotIt] = useState(false);
  const [rules, setRules] = useState(false);
  const [picked, setPicked] = useState<string>();
  const [error, setError] = useState<string>();
  // Where this player has dragged envelopes to, and which they touched last (it lies on top).
  const [moved, setMoved] = useState<Record<string, { x: number; y: number }>>({});
  const [top, setTop] = useState<string[]>([]);
  const area = useRef<HTMLDivElement>(null);
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
    setRules(false);
    onPicked();
    try { await pickEnvelope(code, id, uid); }
    catch { setPicked(undefined); setError("Couldn't pick that one. Try another."); }
  }

  if (!gotIt) {
    return (
      <>
        <TaskCard lines={RULES} small />
        <button className="big" onClick={() => setGotIt(true)}>Got it: pick an envelope →</button>
      </>
    );
  }
  return (
    <>
      <div className="pick-head">
        <h2 className="with-help">
          Pick an envelope
          <button className="help-q" aria-label={rules ? "Hide the rules" : "Read the rules again"} aria-expanded={rules}
            onClick={() => setRules(!rules)}>?</button>
        </h2>
        {/* Rare (the host keeps extras), and the host's ✉ is already flagging it. */}
        <p className="muted small">{!pile.length ? "No envelopes left yet. The host knows, and more will appear here."
          : picked ? "Opening it…" : "Move them around if you like, then tap one."}</p>
      </div>
      <div className="env-pile" ref={area}>
        {pile.map(([id, spot]) => (
          <PileEnvelope key={id} spot={{ ...spot, ...moved[id] }} z={top.indexOf(id) + 1} picked={id === picked} disabled={!!picked} area={area}
            onTouch={() => setTop((t) => [...t.filter((x) => x !== id), id])}
            onMove={(x, y) => setMoved((m) => ({ ...m, [id]: { x, y } }))}
            onPick={() => void pick(id)} />
        ))}
        {rules && <div className="pile-rules"><TaskCard lines={RULES} small /></div>}
      </div>
      {error && <p className="error">{error}</p>}
    </>
  );
}

/**
 * A player's secret task. Until they have one: the rules, then the pile of envelopes to pick from. After: their own
 * envelope, sealed. Tap the seal to open it and "Seal it again" to close it, every time (holding it open was
 * too awkward mid-game); it also seals itself when the phone locks or the page is left. While it's sealed,
 * the circled ? beside the heading unfolds the rules card (the Taskmaster task) right under it, and folds it away.
 */
export function SecretEnvelope({ code, uid, session, onPicked = () => {} }: { code: string; uid: string; session: Session; onPicked?: () => void }) {
  const task = useMyTask(code, uid);
  const seen = useSeen(code, uid);
  const [open, setOpen] = useState(false);
  // Typed out only on the first reading. Decided as it opens: opening marks it seen straight away, which
  // would otherwise flip it to "shown at once" mid-typing.
  const [typeIt, setTypeIt] = useState(false);
  const [rules, setRules] = useState(false);
  // Once they've read it, the host phone stops flagging them as "haven't looked yet".
  useEffect(() => { if (open && task) void markSeen(code, uid).catch(() => {}); }, [open, task, code, uid]);
  // A phone put down open seals itself once the screen locks or the page is left.
  useEffect(() => {
    const seal = () => { if (document.hidden) setOpen(false); };
    document.addEventListener("visibilitychange", seal);
    return () => document.removeEventListener("visibilitychange", seal);
  }, []);
  // A task that arrives while the player is choosing from the pile opens by itself: that's the pick paying off.
  const before = useRef(task);
  useEffect(() => {
    if (before.current === null && typeof task === "string") { setTypeIt(true); setOpen(true); }
    before.current = task;
  }, [task]);

  if (task === undefined || seen === undefined) return <p className="muted">Loading…</p>;
  if (task === null) return <Pile code={code} uid={uid} session={session} onPicked={onPicked} />;

  return (
    <section className="slot envelope-slot">
      <h2 className="with-help">
        Your secret task
        <button className="help-q" aria-label={rules ? "Hide the rules" : "Read the rules again"} aria-expanded={rules}
          style={open ? { visibility: "hidden" } : undefined} onClick={() => setRules(!rules)}>?</button>
      </h2>
      {rules && !open && <TaskCard lines={RULES} small />}
      <div className="env-stack">
        <Envelope open={open} onOpen={() => { setTypeIt(!seen); setOpen(true); setRules(false); }} />
        {open && <Letter task={task} instant={!typeIt} />}
      </div>
      {open ? <button className="link" onClick={() => setOpen(false)}>Seal it again</button>
        : <p className="slot-hint">Tap the seal to open it. Tell no one.</p>}
    </section>
  );
}

/**
 * One envelope on the pile: drag it to move it (it lifts while held), tap it to pick it. A press that
 * travels more than a few pixels is a drag, so it never picks.
 */
function PileEnvelope({ spot, z, picked, disabled, area, onTouch, onMove, onPick }: {
  spot: { x: number; y: number; r: number }; z: number; picked: boolean; disabled: boolean; area: React.RefObject<HTMLDivElement>;
  onTouch: () => void; onMove: (x: number, y: number) => void; onPick: () => void;
}) {
  const start = useRef<{ px: number; py: number; x: number; y: number; w: number; h: number; ew: number; eh: number }>();
  const dragged = useRef(false);
  const [lifted, setLifted] = useState(false);
  const end = () => { start.current = undefined; setLifted(false); };
  return (
    <button className={picked ? "pile-spot picked" : lifted ? "pile-spot lifted" : "pile-spot"} disabled={disabled} aria-label="Pick this envelope"
      style={{ left: `${spot.x}%`, top: `${spot.y}%`, transform: `rotate(${spot.r}deg)`, zIndex: picked ? 99 : z }}
      onPointerDown={(e) => {
        const box = area.current?.getBoundingClientRect();
        const me = e.currentTarget.getBoundingClientRect();
        if (!box) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { px: e.clientX, py: e.clientY, x: spot.x, y: spot.y, w: box.width, h: box.height, ew: (me.width / box.width) * 100, eh: (me.height / box.height) * 100 };
        dragged.current = false;
        onTouch();
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s) return;
        const dx = e.clientX - s.px, dy = e.clientY - s.py;
        if (!dragged.current && Math.hypot(dx, dy) < 8) return;
        dragged.current = true;
        setLifted(true);
        const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(max, 0));
        onMove(clamp(s.x + (dx / s.w) * 100, 100 - s.ew), clamp(s.y + (dy / s.h) * 100, 100 - s.eh));
      }}
      onPointerUp={end} onPointerCancel={end} onContextMenu={(e) => e.preventDefault()}
      onClick={() => { if (dragged.current) dragged.current = false; else onPick(); }}>
      <Envelope mini />
    </button>
  );
}

/** The player's phone for this game: their envelope, or the pile to pick one from. */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  return (
    <>
      <Status>It's task time.</Status>
      <SecretEnvelope code={code} uid={uid} session={session} />
    </>
  );
}
