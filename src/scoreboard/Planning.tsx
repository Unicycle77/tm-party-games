import { useEffect, useRef, useState } from "react";
import { GAMES } from "../games";
import { PileSetup, usePileCount } from "../games/secretTasks/TaskPile";
import { PartySummary } from "../PartySetup";
import { removePlayer, useUid } from "../session";
import type { HeadshotCrop, Scoreboard, ScoreboardContestant, ScoreboardTask, Session, TaskGame } from "../types";
import { addContestants, addKeptGame, addPlayerToScoreboard, addTask, removeContestant, renameContestant, reorderTasks, setPixelate, uploadHeadshot } from "./data";
import { cropFill } from "./crop";
import { currentTotals } from "./scoring";
import { SetupFile } from "./SetupFile";
import { PrintGroup } from "./PrintGroup";
import { RulesSetup } from "./RulesSetup";
import { Toggle } from "../Toggle";
import { LIGHT, plural, scored, sorted, titleOf } from "./tasks";

/**
 * Plan the party: everything set up before the night, in the order you'd do it, off Run of show so nothing on it
 * can be hit mid-show. The party (name, portrait, pin), the tasks (≡ to reorder, ✎ to a task's own page), the
 * contestants and the pile of secret envelopes.
 */
export function PlanParty({ code, session, onBack, onEdit, onCrop }: {
  code: string; session: Session; onBack: () => void;
  /** Opens a task's ✎ page: a task's id, or "tiebreaker". */
  onEdit: (id: string) => void;
  /** Opens a contestant's headshot to crop it for the scoreboard. */
  onCrop: (id: string) => void;
}) {
  const board = session.scoreboard;
  const tasks = sorted(board?.tasks);
  return (
    <div className="box-setup scoreboard-remote plan">
      <button className="link back" onClick={onBack}>← Run of show</button>
      <h2>Plan the party</h2>
      <PartySummary code={code} session={session} />
      <RulesSetup />
      <TaskList code={code} session={session} board={board} tasks={tasks} onEdit={onEdit} />
      <Contestants code={code} session={session} board={board} contestants={sorted(board?.contestants)} onCrop={onCrop} />
      <Envelopes code={code} />
      <PrintGroup code={code} session={session} />
      <SetupFile code={code} session={session} />
    </div>
  );
}

/** "✉ Secret envelopes · 12 in the pile" with Change, which opens the pile to load it. */
function Envelopes({ code }: { code: string }) {
  const [open, setOpen] = useState(false);
  const n = usePileCount(code);
  return (
    <section className="envelopes">
      <div className="summary-line">
        <span>✉ Secret envelopes<span className="muted small"> · {n === undefined ? "…" : `${n} in the pile`}</span></span>
        <button className="link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Change"}</button>
      </div>
      {open && <PileSetup code={code} />}
    </section>
  );
}

/**
 * The task list in running order: live tasks the host names and app games. ≡ drags a task to a new place and ✎
 * opens its own page. Starting a task is Run of show's job, so there's no ▶ here. The tiebreaker is a summary line
 * under the list, since it's outside the running order.
 */
function TaskList({ code, session, board, tasks, onEdit }: {
  code: string; session: Session; board: Scoreboard | undefined; tasks: [string, ScoreboardTask][];
  onEdit: (id: string) => void;
}) {
  const [adding, setAdding] = useState<"live" | "game">();
  const ids = tasks.map(([id]) => id);
  const [dragging, setDragging] = useState<{ id: string; order: string[] }>();
  const rows = useRef<Record<string, HTMLLIElement | null>>({});
  const order = dragging?.order ?? ids;
  const byId = Object.fromEntries(tasks);

  const drag = {
    start(e: React.PointerEvent, id: string) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragging({ id, order: ids });
    },
    move(e: React.PointerEvent) {
      if (!dragging) return;
      const others = dragging.order.filter((id) => id !== dragging.id);
      let at = others.length;
      for (let i = 0; i < others.length; i++) {
        const r = rows.current[others[i]!]?.getBoundingClientRect();
        if (r && e.clientY < r.top + r.height / 2) { at = i; break; }
      }
      const moved = [...others.slice(0, at), dragging.id, ...others.slice(at)];
      if (moved.join() !== dragging.order.join()) setDragging({ ...dragging, order: moved });
    },
    end() {
      if (dragging && dragging.order.join() !== ids.join()) void reorderTasks(code, dragging.order);
      setDragging(undefined);
    },
  };

  return (
    <section className="sb-tasks">
      <h3>Tasks ({tasks.length})</h3>
      {tasks.length === 0 && <p className="muted small">No tasks yet. Add them in the order you'll play them.</p>}
      <ul className="sb-task-list">
        {order.map((id, i) => {
          const t = byId[id]!;
          return (
            <li key={id} ref={(el) => { rows.current[id] = el; }} className={dragging?.id === id ? "dragging" : undefined}>
              <button className="sb-handle" aria-label={`Move ${titleOf(t)}`}
                onPointerDown={(e) => drag.start(e, id)} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end}>≡</button>
              <button className="sb-task" disabled>
                <span className="sb-task-title">{i + 1}&nbsp; {titleOf(t)}{t.game && <span className="muted small"> · app task</span>}</span>
                {t.description && <span className="muted small sb-task-note">"{t.description}"</span>}
                {scored(t) && <span className="muted small">{plural(Object.keys(t.scores ?? {}).length, "contestant")} scored</span>}
              </button>
              <button className="x" aria-label={`Fix ${titleOf(t)}`} onClick={() => onEdit(id)}>✎</button>
            </li>
          );
        })}
      </ul>
      {adding === "live" ? <AddLiveTask code={code} board={board} onClose={() => setAdding(undefined)} />
        : adding === "game" ? (
          <div className="sb-add">
            <p className="muted small">Which task?</p>
            <div className="choices">
              {/* each game once (Photos as often as needed): a game already on the list is greyed out */}
              {[...Object.values(GAMES).map((g) => ({ id: g.id as TaskGame, name: g.name, repeatable: g.repeatable })), { id: "light" as const, name: LIGHT, repeatable: false }].map((g) => {
                const listed = !g.repeatable && Object.values(board?.tasks ?? {}).some((t) => t.game === g.id);
                // The light and Noisemaster bring across what was kept while they weren't on the list.
                const add = () => g.id === "light" || g.id === "noisemaster" ? addKeptGame(code, session, g.id) : addTask(code, board, { game: g.id });
                return <button key={g.id} disabled={listed} title={listed ? "Already on the run of show" : undefined}
                  onClick={() => { void add(); setAdding(undefined); }}>{g.name}{listed && <span className="played">on the list</span>}</button>;
              })}
            </div>
            <button className="link" onClick={() => setAdding(undefined)}>Cancel</button>
          </div>
        ) : (
          <div className="row">
            <button onClick={() => setAdding("live")}>+ Live task</button>
            <button onClick={() => setAdding("game")}>+ App task</button>
          </div>
        )}
      {/* Every party's tiebreaker: outside the running order, played only on a tie. */}
      <div className="summary-line">
        <span>{board?.tiebreaker?.name || "Tiebreaker task"}<span className="muted small"> · only if there's a tie</span></span>
        <button className="x" aria-label="Fix the tiebreaker task" onClick={() => onEdit("tiebreaker")}>✎</button>
      </div>
    </section>
  );
}

function AddLiveTask({ code, board, onClose }: { code: string; board: Scoreboard | undefined; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const add = () => { void addTask(code, board, { name, description }); onClose(); };
  return (
    <div className="sb-add">
      <label>Task name
        <input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} placeholder="Build the tallest tower" />
      </label>
      <label>Note for you (optional)
        <textarea rows={2} value={description} maxLength={600} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <button className="big" disabled={!name.trim()} onClick={add}>Add to the list</button>
      <button className="link" onClick={onClose}>Cancel</button>
    </div>
  );
}

/**
 * Everyone at the party: the guest list (each with "checked in" once their phone is in) and, below it,
 * anyone who joined by typing a name while there was no list yet, ready to be added to the scoreboard.
 */
function Contestants({ code, session, board, contestants, onCrop }: {
  code: string; session: Session; board: Scoreboard | undefined; contestants: [string, ScoreboardContestant][]; onCrop: (id: string) => void;
}) {
  const players = session.players ?? {};
  const linked = new Set(contestants.map(([, c]) => c.uid).filter((u) => u && players[u]));
  const loose = Object.entries(players).filter(([uid]) => !linked.has(uid)).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
  const [names, setNames] = useState("");
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!names.trim()) return;
    void addContestants(code, board, names);
    setNames("");
  };
  const totals = currentTotals(board);
  return (
    <section className="sb-contestants">
      <h3>Contestants ({contestants.length})</h3>
      <div className="toggles"><Toggle label="Pixelate until checked in" on={board?.pixelate !== false} onChange={(on) => void setPixelate(code, on)} /></div>
      <p className="muted small">On the big screen's scoreboard only. Each face sharpens as they check in.</p>
      <ul className="sb-contestant-list">
        {contestants.map(([id, c]) => (
          <ContestantRow key={id} code={code} board={board} id={id} name={c.name} photo={c.photo} crop={c.crop} hasPoints={id in totals} onCrop={() => onCrop(id)}
            here={c.uid && players[c.uid] ? c.uid : undefined} />
        ))}
      </ul>
      {loose.length > 0 && (
        <>
          <p className="muted small">Here, but not on the scoreboard:</p>
          <ul className="sb-contestant-list">
            {loose.map(([uid, p]) => (
              <li key={uid}>
                <span className="sb-contestant-name sb-loose">{p.name}<span className="muted small">{p.notPlaying ? "not playing" : "checked in"}</span></span>
                <button className="sb-start" onClick={() => void addPlayerToScoreboard(code, board, uid, p.name)}>+ Add</button>
              </li>
            ))}
          </ul>
        </>
      )}
      <form className="sb-add" onSubmit={add}>
        <label>Add contestants, one per line
          <textarea rows={3} value={names} maxLength={2000} onChange={(e) => setNames(e.target.value)} placeholder={"Sam\nPriya\nAlex"} />
        </label>
        <button type="submit" disabled={!names.trim()}>Add {names.split("\n").filter((n) => n.trim()).length > 1 ? "them" : "contestant"}</button>
      </form>
    </section>
  );
}

function ContestantRow({ code, board, id, name, photo, crop, hasPoints, here, onCrop }: {
  code: string; board: Scoreboard | undefined; id: string; name: string; photo?: string; crop?: HeadshotCrop; hasPoints: boolean; onCrop: () => void;
  /** Their phone's uid, once they've checked in. */
  here?: string;
}) {
  const uid = useUid();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number>();
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<string>();
  // Tapping a headshot that's already there asks what to do with it: frame it for the scoreboard, or pick a new one.
  const [choosing, setChoosing] = useState(false);
  useEffect(() => setFailed(false), [photo]);

  async function upload(file: File | undefined) {
    if (!file || !uid) return;
    setFailed(false);
    setProgress(0);
    try { await uploadHeadshot(code, uid, id, file, setProgress); }
    catch { setFailed(true); }
    finally { setProgress(undefined); }
  }
  // Off the scoreboard and, if they've checked in, out of the party too (their phone goes back to joining).
  const drop = () => {
    const what = [hasPoints && "all their points", here && "their phone's entries"].filter(Boolean).join(" and ");
    if ((hasPoints || here) && !confirm(`Remove ${name}${what ? ` and ${what}` : ""}?`)) return;
    void removeContestant(code, board, id);
    if (here) void removePlayer(code, here);
  };

  return (
    <li>
      <button className="sb-photo" aria-label={photo ? `Change ${name}'s headshot` : `Add ${name}'s headshot`} aria-expanded={photo ? choosing : undefined}
        onClick={() => photo ? setChoosing(!choosing) : input.current?.click()}>
        {progress !== undefined ? <span className="small">{Math.round(progress * 100)}%</span>
          : photo ? <span className="sb-photo-fill" style={cropFill(photo, crop)} /> : <span aria-hidden>+</span>}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      {choosing ? (
        <div className="sb-photo-choice">
          <span className="muted small">{name}'s headshot</span>
          <div className="row">
            <button onClick={() => { setChoosing(false); onCrop(); }}>Crop</button>
            <button onClick={() => { setChoosing(false); input.current?.click(); }}>Replace</button>
            <button className="link" onClick={() => setChoosing(false)}>Cancel</button>
          </div>
        </div>
      ) : draft === undefined ? (
        <button className="sb-contestant-name" onClick={() => setDraft(name)}>
          {name}
          <span className="muted small">{here ? "checked in" : "not yet"}</span>
          {failed && <span className="error small"> That headshot didn't upload. Try again.</span>}
        </button>
      ) : (
        <form className="sb-rename" onSubmit={(e) => { e.preventDefault(); if (draft.trim()) void renameContestant(code, id, draft); setDraft(undefined); }}>
          <input value={draft} maxLength={20} autoFocus onChange={(e) => setDraft(e.target.value)} aria-label={`Rename ${name}`} />
          <button type="submit" disabled={!draft.trim()}>Save</button>
          <button type="button" className="link" onClick={() => setDraft(undefined)}>Cancel</button>
        </form>
      )}
      <button className="x" aria-label={`Remove ${name}`} onClick={drop}>✕</button>
    </li>
  );
}
