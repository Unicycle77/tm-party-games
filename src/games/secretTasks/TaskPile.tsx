import { useEffect, useState } from "react";
import { useUid } from "../../session";
import type { Session } from "../../types";
import { addTasks, clearLeftovers, dealRest, editTask, needsOf, removeTask, undealtOf, useLeftovers, useSecretTasks } from "./data";

/**
 * The host's phone, behind ✉ in the header whichever game is on: load the pile of secret tasks (any number,
 * one per line), take in envelopes left over from earlier parties, and correct a task in place. Each task is
 * an envelope on the pile that players pick from when they check in. What needs the host (someone who hasn't
 * looked, or is waiting for an envelope) comes first, and "Who has what" shows one task at a time, while held.
 * The pile itself comes last, folded.
 */
const PILE_KEY = "ba.pileOpen";

export function TaskPile({ code, session }: { code: string; session: Session }) {
  const uid = useUid();
  const tasks = useSecretTasks(code);
  const leftovers = useLeftovers(code, uid, tasks);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [pileOpen, setPileOpen] = useState(() => { try { return localStorage.getItem(PILE_KEY) === "open"; } catch { return false; } });
  const togglePile = () => setPileOpen((o) => { try { localStorage.setItem(PILE_KEY, o ? "closed" : "open"); } catch { /* fine */ } return !o; });
  const [note, setNote] = useState<string>();
  const [error, setError] = useState<string>();

  // The receipt for an add fades after a few seconds; it's only for the host, not a stamp.
  useEffect(() => {
    if (!note) return;
    const t = window.setTimeout(() => setNote(undefined), 4000);
    return () => window.clearTimeout(t);
  }, [note]);

  const players = Object.entries(session.players ?? {}).sort(([, x], [, y]) => (x.joinedAt ?? 0) - (y.joinedAt ?? 0));
  const undealt = undealtOf(tasks);
  const needing = players.filter(([id]) => !tasks?.assigned?.[id]).length;
  const needs = needsOf(session, tasks);
  const nameOf = (id: string) => session.players?.[id]?.name ?? "?";

  async function add(lines: string[], after?: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    setNote(undefined);
    try {
      const added = await addTasks(code, lines);
      const given = lines.filter((l) => l.trim()).length;
      await after?.();
      setNote(added === given ? `Added ${added}.` : `Added ${added}. ${given - added} ${given - added === 1 ? "was" : "were"} already in the pile.`);
      return true;
    } catch {
      setError("Couldn't add them. Try again.");
      return false;
    } finally { setBusy(false); }
  }

  return (
    <div className="box-setup">
      <h2>✉ Secret tasks</h2>
      <p className="muted small">
        {tasks === undefined ? "Loading…"
          : undealt.length === 0 ? "The pile is empty."
          : `${undealt.length} ${undealt.length === 1 ? "envelope" : "envelopes"} in the pile, ready to pick.`}
      </p>
      {needs.unseen.length > 0 && (
        <section className="move-request">
          <p><strong>Haven't looked yet:</strong> {needs.unseen.map(nameOf).join(", ")}</p>
          <p className="muted small">Tell them to open their envelope.</p>
        </section>
      )}
      {needs.waiting.length > 0 && (
        <section className="move-request">
          <p><strong>Waiting for an envelope:</strong> {needs.waiting.map(nameOf).join(", ")}</p>
          <p className="muted small">The pile is empty. Add {needs.waiting.length} more.</p>
        </section>
      )}
      {note && <p className="muted small fade-note">{note}</p>}
      {error && <p className="error">{error}</p>}

      {uid && leftovers && leftovers.length > 0 && (
        <section className="leftovers">
          <h3>Left over from your last party ({leftovers.length})</h3>
          <ul className="task-list">{leftovers.map((t) => <li key={t}><span>{t}</span></li>)}</ul>
          <button disabled={busy} onClick={() => void add(leftovers, () => clearLeftovers(code, uid))}>
            Add {leftovers.length === 1 ? "it" : `all ${leftovers.length}`} to the pile
          </button>
          <button className="link" onClick={() => void clearLeftovers(code, uid)}>Forget these</button>
        </section>
      )}

      <label>New tasks, one per line
        <textarea rows={4} value={text} maxLength={3000} onChange={(e) => setText(e.target.value)}
          placeholder={"Make someone say \"banana\"\nGet three people to high-five"} />
      </label>
      <button className="big" disabled={busy || !text.trim()} onClick={() => void add(text.split("\n")).then((ok) => ok && setText(""))}>
        {busy ? "Adding…" : "Add to the pile"}
      </button>
      {/* Quiet: telling someone to pick is better, and a dealt guest still hasn't looked. */}
      {needing > 0 && undealt.length > 0 && (
        <button className="link" onClick={() => void dealRest(code, session, tasks)}>Deal at random to anyone who hasn't picked</button>
      )}

      <h3>Who has what</h3>
      {players.length > 0 && <p className="muted small">Tap a name to see their task, and again to hide it.</p>}
      <ul className="picker running">
        {players.map(([id, p]) => {
          const task = tasks?.assigned?.[id];
          const state = task ? (tasks?.seen?.[id] ? "✉ looked" : "✉ hasn't looked") : undealt.length ? "hasn't picked" : "waiting for an envelope";
          return <WhoRow key={id} code={code} name={p.name} task={task} state={state} />;
        })}
      </ul>

      {/* below the guests, folded away unless the host opens it (remembered on this device) */}
      <h3 className="fold-head">
        <button aria-expanded={pileOpen} onClick={() => togglePile()}>{pileOpen ? "▾" : "▸"} The pile ({undealt.length})</button>
      </h3>
      {pileOpen && (
        <>
          {undealt.length > 0 && <p className="muted small">Tap a task to fix it.</p>}
          <ul className="task-list">
            {undealt.map(([id, t]) => <PileTask key={id} code={code} text={t} onRemove={() => void removeTask(code, id)} />)}
          </ul>
        </>
      )}
    </div>
  );
}

/**
 * One guest in "Who has what": tap the name to show their task in the row, and tap again to hide it
 * (holding was too awkward mid-game). ✎ opens the task to fix it.
 */
function WhoRow({ code, name, task, state }: { code: string; name: string; task?: string; state: string }) {
  const [showing, setShowing] = useState(false);
  const [editing, setEditing] = useState(false);
  if (editing && task) {
    return <li className="stacked"><strong>{name}</strong><EditableTask code={code} text={task} editing onClose={() => setEditing(false)} /></li>;
  }
  return (
    <li>
      <button className={showing ? "peek holding" : "peek"} disabled={!task} aria-pressed={showing}
        aria-label={task ? `${showing ? "Hide" : "Show"} ${name}'s task` : name} onClick={() => setShowing(!showing)}>
        <span>{name}</span>
        {showing && task
          ? <span className="peek-task">"{task}"<small>Tap again to hide it.</small></span>
          : <span className="muted small">{state}</span>}
      </button>
      {task && <button className="x" aria-label={`Fix ${name}'s task`} onClick={() => setEditing(true)}>✎</button>}
    </li>
  );
}

/** One task in the pile: tap to fix it in place, ✕ to take it out. */
function PileTask({ code, text, onRemove }: { code: string; text: string; onRemove: () => void }) {
  return (
    <li>
      <EditableTask code={code} text={text} />
      <button aria-label={`Remove: ${text}`} onClick={onRemove}>✕</button>
    </li>
  );
}

/**
 * A task that becomes a box to correct it when tapped, with Save and Cancel. Anyone already dealt it keeps
 * it, corrected.
 */
export function EditableTask({ code, text, children, editing = false, onClose }: { code: string; text: string; children?: React.ReactNode; editing?: boolean; onClose?: () => void }) {
  const [draft, setDraftState] = useState<string | undefined>(editing ? text : undefined);
  const setDraft = (d: string | undefined) => { setDraftState(d); if (d === undefined) onClose?.(); };
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  if (draft === undefined) {
    return <button className="task-text" onClick={() => { setDraft(text); setError(undefined); }}>{children ?? text}</button>;
  }
  async function save() {
    setSaving(true);
    try {
      if (draft!.trim() === text.trim() || await editTask(code, text, draft!)) setDraft(undefined);
      else setError("That's already in the pile. Change it, or cancel.");
    } catch { setError("Couldn't save it. Try again."); }
    finally { setSaving(false); }
  }
  return (
    <span className="task-edit">
      <textarea rows={2} value={draft} maxLength={300} autoFocus onChange={(e) => setDraft(e.target.value)} />
      {error && <span className="error">{error}</span>}
      <span className="row">
        <button disabled={saving || !draft.trim()} onClick={() => void save()}>{saving ? "Saving…" : "Save"}</button>
        <button className="link" onClick={() => setDraft(undefined)}>Cancel</button>
      </span>
    </span>
  );
}
