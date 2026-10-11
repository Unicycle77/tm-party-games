import { useState } from "react";
import type { Session } from "../../types";
import { addTasks, dealRest, removeTask, undealtOf, useSecretTasks } from "./data";

/**
 * The host's phone, in its own tab whichever game is on: type the pool of secret tasks (any number, one
 * per line) and see who has been dealt what. Each task is an envelope on the pile that players pick from when they check in.
 */
export function TaskPile({ code, session }: { code: string; session: Session }) {
  const tasks = useSecretTasks(code);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string>();
  const [error, setError] = useState<string>();

  const players = Object.entries(session.players ?? {}).sort(([, x], [, y]) => (x.joinedAt ?? 0) - (y.joinedAt ?? 0));
  const undealt = undealtOf(tasks);
  const needing = players.filter(([uid]) => !tasks?.assigned?.[uid]).length;

  async function add() {
    setBusy(true);
    setError(undefined);
    setNote(undefined);
    try {
      const lines = text.split("\n");
      const added = await addTasks(code, lines, tasks);
      const given = lines.filter((l) => l.trim()).length;
      setText("");
      setNote(added === given ? `Added ${added}.` : `Added ${added}. ${given - added} already in the list.`);
    } catch { setError("Couldn't add them. Try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="box-setup">
      <h2>✉ Secret tasks</h2>
      <p className="muted small">
        {tasks === undefined ? "Loading…" : `${undealt.length} waiting for someone, ${Object.keys(tasks?.assigned ?? {}).length} dealt.`}
        {needing > undealt.length && tasks && ` ${needing} ${needing === 1 ? "player needs" : "players need"} one: add ${needing - undealt.length} more.`}
      </p>
      <label>Add tasks, one per line
        <textarea rows={4} value={text} maxLength={3000} onChange={(e) => setText(e.target.value)}
          placeholder={"Make someone say \"banana\"\nGet three people to high-five"} />
      </label>
      <button className="big" disabled={busy || !text.trim()} onClick={() => void add()}>{busy ? "Adding…" : "Add to the pile"}</button>
      {needing > 0 && undealt.length > 0 && (
        <button onClick={() => void dealRest(code, session, tasks)}>
          Deal {Math.min(needing, undealt.length)} at random to {needing === 1 ? "the player who hasn't" : "players who haven't"} picked
        </button>
      )}
      {note && <p className="muted small">{note}</p>}
      {error && <p className="error">{error}</p>}

      {undealt.length > 0 && (
        <details className="fold" open>
          <summary><h3>Not dealt yet ({undealt.length})</h3></summary>
          <ul className="task-list">
            {undealt.map(([id, t]) => (
              <li key={id}><span>{t}</span><button aria-label={`Remove: ${t}`} onClick={() => void removeTask(code, id)}>✕</button></li>
            ))}
          </ul>
        </details>
      )}
      <details className="fold">
        <summary><h3>Who has what</h3></summary>
        <ul className="task-list">
          {players.map(([uid, p]) => (
            <li key={uid}><span><strong>{p.name}</strong>: {tasks?.assigned?.[uid] ?? <span className="muted">no task yet</span>}</span></li>
          ))}
        </ul>
      </details>

    </div>
  );
}
