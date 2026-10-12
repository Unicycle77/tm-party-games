import { useEffect, useRef, useState } from "react";
import { GAMES, activeGame } from "../games";
import { noBigScreen, setGame, useUid } from "../session";
import type { GameId, Scoreboard, ScoreboardTask, Session } from "../types";
import {
  addContestant, addTask, editTask, lowerCurtain, removeContestant, removeTask, renameContestant, reorderTasks,
  setPoints, showScoreboard, updateScores, uploadHeadshot,
} from "./data";
import { currentTotals, pendingTasks } from "./scoring";

const sorted = <T extends { order: number }>(items: Record<string, T> | undefined) =>
  Object.entries(items ?? {}).sort(([, a], [, b]) => a.order - b.order);

const titleOf = (t: ScoreboardTask) => t.game ? GAMES[t.game]?.name ?? t.game : t.name || "Untitled task";
const scored = (t: ScoreboardTask) => Object.keys(t.scores ?? {}).length > 0;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * The host remote's 🏆 page: the party's scoreboard, kept apart from the games. Giving points for a task
 * opens first (the next unscored one); "Change task" goes to the task list and the contestants, where
 * the party is set up beforehand. The big screen only moves when the host shows or updates the scoreboard.
 */
export function ScoreboardRemote({ code, session, onStartGame }: { code: string; session: Session; onStartGame: () => void }) {
  const board = session.scoreboard;
  const tasks = sorted(board?.tasks);
  const contestants = sorted(board?.contestants);
  // Up next: the task after the last one with any points. The page opens on that last one while some
  // contestants still have no points for it, so a task half-scored is picked up where it was left.
  const lastScored = tasks.map(([, t]) => scored(t)).lastIndexOf(true);
  const next = tasks[lastScored + 1]?.[0];
  const unfinished = lastScored >= 0 && contestants.some(([c]) => tasks[lastScored]![1].scores?.[c] === undefined)
    ? tasks[lastScored]![0] : undefined;
  const [picked, setPicked] = useState<string>();
  const [page, setPage] = useState<"points" | "list">(() => tasks.length && contestants.length ? "points" : "list");
  const current = (picked && board?.tasks?.[picked] ? picked : undefined) ?? unfinished ?? next ?? tasks[tasks.length - 1]?.[0];

  const open = (id: string) => { setPicked(id); setPage("points"); window.scrollTo(0, 0); };

  return (
    <div className="box-setup scoreboard-remote">
      <h2>🏆 Scoreboard</h2>
      <ShowControls code={code} session={session} />
      {page === "points" && current && contestants.length > 0
        ? <Points code={code} board={board} id={current} tasks={tasks} contestants={contestants}
            onChange={() => setPage("list")} onNext={(id) => setPicked(id)} />
        : (
          <>
            <TaskList code={code} board={board} tasks={tasks} next={next} onOpen={contestants.length ? open : undefined}
              onStart={(game) => { void setGame(code, game); onStartGame(); }} />
            <Contestants code={code} board={board} contestants={contestants} />
          </>
        )}
    </div>
  );
}

/** What the big screen shows, and the one button that moves the scoreboard on it. */
function ShowControls({ code, session }: { code: string; session: Session }) {
  const board = session.scoreboard;
  const up = session.display?.step === "scoreboard";
  const { added, changed } = pendingTasks(board);
  const pending = [added && plural(added, "new task"), changed && `${changed} changed`].filter(Boolean).join(", ");
  const game = activeGame(session);
  const line = noBigScreen(session) ? "not connected yet" : up ? "the scoreboard"
    : session.display?.step === "curtain" || (!game && session.begun) ? "the curtain"
    : !game ? "the welcome" : game.name;

  return (
    <>
      <p className="on-screen">On the big screen: {line}</p>
      {noBigScreen(session) && <p className="muted small">On the night, open the big screen and resume party {code}.</p>}
      {!up ? (
        <>
          <button onClick={() => void showScoreboard(code)}>Show the scoreboard</button>
          {pending && <p className="muted small">At the totals you last showed. {pending} to add when you update.</p>}
        </>
      ) : pending ? (
        <>
          <button className="big" onClick={() => void updateScores(code, board)}>Update the scores · {pending}</button>
          <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
        </>
      ) : <button className="big" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>}
    </>
  );
}

/** Giving points for one task: a row of chips per contestant. Every tap saves; nothing goes on the big screen. */
function Points({ code, board, id, tasks, contestants, onChange, onNext }: {
  code: string; board: Scoreboard | undefined; id: string; tasks: [string, ScoreboardTask][];
  contestants: [string, { name: string }][]; onChange: () => void; onNext: (id: string) => void;
}) {
  const task = board!.tasks![id]!;
  const place = tasks.findIndex(([t]) => t === id);
  const following = tasks[place + 1]?.[0];
  const totals = currentTotals(board);
  const given = contestants.filter(([c]) => task.scores?.[c] !== undefined).length;

  return (
    <section className="sb-points">
      <div className="remote-head">
        <h3>Task {place + 1} of {tasks.length}: {titleOf(task)}</h3>
        <button className="link" onClick={onChange}>Change task</button>
      </div>
      {task.description && <p className="muted small sb-note">{task.description}</p>}
      <p className="muted small">{given} of {contestants.length} scored</p>
      <ul className="sb-rows">
        {contestants.map(([c, con]) => (
          <PointsRow key={c} name={con.name} points={task.scores?.[c]} total={totals[c] ?? 0}
            onSet={(n) => void setPoints(code, id, c, n)} />
        ))}
      </ul>
      {following && <button className="link sb-next" onClick={() => { onNext(following); window.scrollTo(0, 0); }}>Next task →</button>}
    </section>
  );
}

const CHIPS = [0, 1, 2, 3, 4, 5];

/** One contestant: 0 to 5, and "…" for any other number. Tapping the pressed chip takes the points away. */
function PointsRow({ name, points, total, onSet }: { name: string; points?: number; total: number; onSet: (n: number | null) => void }) {
  const [other, setOther] = useState<string>();
  const isOther = points !== undefined && !CHIPS.includes(points);
  const saveOther = () => {
    if (other === undefined) return;
    const n = parseFloat(other.replace(",", "."));
    if (other.trim() === "") { if (isOther) onSet(null); }
    else if (Number.isFinite(n)) onSet(n);
    setOther(undefined);
  };
  return (
    <li>
      <span className="sb-name">{name}</span>
      <div className="choices marks sb-chips">
        {CHIPS.map((n) => (
          <button key={n} aria-pressed={points === n} aria-label={`${n} for ${name}`} onClick={() => onSet(points === n ? null : n)}>{n}</button>
        ))}
        {other !== undefined
          ? <input className="sb-other" type="text" inputMode="decimal" autoFocus value={other} aria-label={`Other points for ${name}`}
              onChange={(e) => setOther(e.target.value)} onBlur={saveOther} onKeyDown={(e) => { if (e.key === "Enter") saveOther(); if (e.key === "Escape") setOther(undefined); }} />
          : <button aria-pressed={isOther} aria-label={`Other points for ${name}`} onClick={() => setOther(isOther ? String(points) : "")}>{isOther ? points : "…"}</button>}
      </div>
      <span className="muted small sb-now">now {total}</span>
    </li>
  );
}

/**
 * The task list in running order: live tasks the host names and app games. Tap a task for its points;
 * ≡ drags it to a new place; ✎ fixes its name or note, or removes it; ▶ Start starts an app game.
 */
function TaskList({ code, board, tasks, next, onOpen, onStart }: {
  code: string; board: Scoreboard | undefined; tasks: [string, ScoreboardTask][]; next?: string;
  onOpen?: (id: string) => void; onStart: (game: GameId) => void;
}) {
  const [adding, setAdding] = useState<"live" | "game">();
  const [editing, setEditing] = useState<string>();
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
      {!onOpen && tasks.length > 0 && <p className="muted small">Add contestants to give points.</p>}
      <ul className="sb-task-list">
        {order.map((id, i) => {
          const t = byId[id]!;
          if (editing === id) {
            return <li key={id} ref={(el) => { rows.current[id] = el; }}><TaskEdit code={code} id={id} task={t} onClose={() => setEditing(undefined)} /></li>;
          }
          return (
            <li key={id} ref={(el) => { rows.current[id] = el; }} className={dragging?.id === id ? "dragging" : undefined}>
              <button className="sb-handle" aria-label={`Move ${titleOf(t)}`}
                onPointerDown={(e) => drag.start(e, id)} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end}>≡</button>
              <button className="sb-task" disabled={!onOpen} onClick={() => onOpen?.(id)}>
                <span className="sb-task-title">{i + 1}&nbsp; {titleOf(t)}{t.game && <span className="muted small"> · app game</span>}</span>
                {t.description && <span className="muted small sb-task-note">"{t.description}"</span>}
                <span className="muted small">{scored(t) ? "scored" : id === next ? "← next" : ""}</span>
              </button>
              {t.game && <button className="sb-start" onClick={() => onStart(t.game!)}>▶ Start</button>}
              <button className="x" aria-label={`Fix ${titleOf(t)}`} onClick={() => setEditing(id)}>✎</button>
            </li>
          );
        })}
      </ul>
      {adding === "live" ? <AddLiveTask code={code} board={board} onClose={() => setAdding(undefined)} />
        : adding === "game" ? (
          <div className="sb-add">
            <p className="muted small">Which game?</p>
            <div className="choices">
              {Object.values(GAMES).map((g) => <button key={g.id} onClick={() => { void addTask(code, board, { game: g.id }); setAdding(undefined); }}>{g.name}</button>)}
            </div>
            <button className="link" onClick={() => setAdding(undefined)}>Cancel</button>
          </div>
        ) : (
          <div className="row">
            <button onClick={() => setAdding("live")}>+ Live task</button>
            <button onClick={() => setAdding("game")}>+ App game</button>
          </div>
        )}
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

/** Fixing a task in place: a live task's name, any task's note, or taking it off the list. */
function TaskEdit({ code, id, task, onClose }: { code: string; id: string; task: ScoreboardTask; onClose: () => void }) {
  const [name, setName] = useState(task.name ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const save = () => { void editTask(code, id, task.game ? undefined : name, description); onClose(); };
  const drop = () => {
    if (scored(task) && !confirm(`Remove "${titleOf(task)}" and its points?`)) return;
    void removeTask(code, id);
    onClose();
  };
  return (
    <div className="sb-add sb-edit">
      {task.game ? <strong>{titleOf(task)}</strong> : (
        <label>Task name
          <input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      <label>Note for you (optional)
        <textarea rows={2} value={description} maxLength={600} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <div className="row">
        <button disabled={!task.game && !name.trim()} onClick={save}>Save</button>
        <button className="link" onClick={onClose}>Cancel</button>
      </div>
      <button className="link" onClick={drop}>Remove this task</button>
    </div>
  );
}

/** The contestants, added before the party. The name field stays open at the bottom: type, Return, next. */
function Contestants({ code, board, contestants }: { code: string; board: Scoreboard | undefined; contestants: [string, { name: string; photo?: string }][] }) {
  const [name, setName] = useState("");
  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    void addContestant(code, board, name);
    setName("");
  };
  const totals = currentTotals(board);
  return (
    <section className="sb-contestants">
      <h3>Contestants ({contestants.length})</h3>
      <ul className="sb-contestant-list">
        {contestants.map(([id, c]) => <ContestantRow key={id} code={code} board={board} id={id} name={c.name} photo={c.photo} hasPoints={id in totals} />)}
      </ul>
      <form className="row" onSubmit={add}>
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Name of the next contestant" aria-label="Name of the next contestant" />
        <button type="submit" disabled={!name.trim()}>Add</button>
      </form>
    </section>
  );
}

function ContestantRow({ code, board, id, name, photo, hasPoints }: {
  code: string; board: Scoreboard | undefined; id: string; name: string; photo?: string; hasPoints: boolean;
}) {
  const uid = useUid();
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number>();
  const [failed, setFailed] = useState(false);
  const [draft, setDraft] = useState<string>();
  useEffect(() => setFailed(false), [photo]);

  async function upload(file: File | undefined) {
    if (!file || !uid) return;
    setFailed(false);
    setProgress(0);
    try { await uploadHeadshot(code, uid, id, file, setProgress); }
    catch { setFailed(true); }
    finally { setProgress(undefined); }
  }
  const drop = () => {
    if (hasPoints && !confirm(`Remove ${name} and all their points?`)) return;
    void removeContestant(code, board, id);
  };

  return (
    <li>
      <button className="sb-photo" aria-label={photo ? `Change ${name}'s headshot` : `Add ${name}'s headshot`} onClick={() => input.current?.click()}>
        {progress !== undefined ? <span className="small">{Math.round(progress * 100)}%</span>
          : photo ? <img src={photo} alt="" /> : <span aria-hidden>+</span>}
      </button>
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      {draft === undefined ? (
        <button className="sb-contestant-name" onClick={() => setDraft(name)}>
          {name}
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
