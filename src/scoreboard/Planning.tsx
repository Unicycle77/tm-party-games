import { useEffect, useRef, useState } from "react";
import { GAMES } from "../games";
import { prizesIn } from "../games/prize/data";
import { removePlayer, useUid } from "../session";
import type { Scoreboard, ScoreboardContestant, ScoreboardTask, Session, TaskGame } from "../types";
import {
  addContestant, addKeptGame, addPlayerToScoreboard, addTask, declareWinner, editTask, editTiebreaker, enterPoints, removeContestant, removeTask,
  renameContestant, reorderTasks, setScoring, uploadHeadshot, type TaskEntry,
} from "./data";
import { TaskTextField, TaskTypeField, TIEBREAKER_TYPE, typeOf } from "./TaskText";
import { isMeasured, overLine } from "./measured";
import { currentTotals } from "./scoring";
import { SongField, SongStrip } from "../SongStrip";
import { draftOf, unitOf, UnitField } from "../conversions/UnitField";
import { gameName, LIGHT, list, scored, sorted, titleOf } from "./tasks";

/**
 * Plan the party: everything set up before the night, off Run of show so nothing on it can be hit mid-show.
 * The task list (≡ to reorder, ✎ to fix a task) and the contestants.
 */
export function PlanParty({ code, session, onBack, onOpen }: {
  code: string; session: Session; onBack: () => void;
  /** Opens a task's page. */
  onOpen: (id: string) => void;
}) {
  const board = session.scoreboard;
  const tasks = sorted(board?.tasks);
  return (
    <div className="box-setup scoreboard-remote plan">
      <button className="link back" onClick={onBack}>← Run of show</button>
      <h2>Plan the party</h2>
      <TaskList code={code} session={session} board={board} tasks={tasks} prizeNote={prizesIn(session, list)} onOpen={onOpen} />
      <Contestants code={code} session={session} board={board} contestants={sorted(board?.contestants)} />
    </div>
  );
}

/**
 * The task list in running order: live tasks the host names and app games. Tap a task for its page;
 * ≡ drags it to a new place; ✎ fixes its name or note, or removes it. Starting a task is Run of show's job.
 */
function TaskList({ code, session, board, tasks, prizeNote, onOpen }: {
  code: string; session: Session; board: Scoreboard | undefined; tasks: [string, ScoreboardTask][];
  /** Whose prizes are in, on the prize task's row. */
  prizeNote?: string;
  onOpen: (id: string) => void;
}) {
  const [adding, setAdding] = useState<"live" | "game">();
  const [editing, setEditing] = useState<string>();
  const ids = tasks.map(([id]) => id);
  // Any time once a task has points. Tapping it again after declaring brings the scoreboard (and the haul button) back.
  const declarable = tasks.some(([, t]) => scored(t));
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
          if (editing === id) {
            return <li key={id} ref={(el) => { rows.current[id] = el; }}><TaskEdit code={code} session={session} id={id} task={t} onClose={() => setEditing(undefined)} /></li>;
          }
          return (
            <li key={id} ref={(el) => { rows.current[id] = el; }}
              className={[dragging?.id === id && "dragging", t.song && "has-song", t.song && "live"].filter(Boolean).join(" ") || undefined}>
              <button className="sb-handle" aria-label={`Move ${titleOf(t)}`}
                onPointerDown={(e) => drag.start(e, id)} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end}>≡</button>
              <button className="sb-task" onClick={() => onOpen(id)}>
                <span className="sb-task-title">{i + 1}&nbsp; {titleOf(t)}{t.game && <span className="muted small"> · app game</span>}</span>
                {t.description && <span className="muted small sb-task-note">"{t.description}"</span>}
                {t.game === "prize" && prizeNote && <span className="muted small">🎁 {prizeNote}</span>}
                {scored(t) && <span className="muted small">scored</span>}
              </button>
              <button className="x" aria-label={`Fix ${titleOf(t)}`} onClick={() => setEditing(id)}>✎</button>
              {t.song && <SongStrip code={code} session={session} song={t.song} />}
            </li>
          );
        })}
        {editing === "tiebreaker" ? <li><TiebreakerEdit code={code} session={session} board={board} onClose={() => setEditing(undefined)} /></li> : (
          // Every party's tiebreaker: always last, outside the running order, played only on a tie.
          <li className={board?.tiebreaker?.song ? "has-song tiebreaker" : undefined}>
            <button className="sb-task sb-tiebreaker" disabled>
              <span className="sb-task-title">{board?.tiebreaker?.name || "Tiebreaker task"}<span className="muted small"> · only if there's a tie</span></span>
              <span className="muted small sb-task-note">{board?.tiebreaker?.description ? `"${board.tiebreaker.description}"` : "Add how it's won with ✎"}</span>
            </button>
            <button className="x" aria-label="Fix the tiebreaker task" onClick={() => setEditing("tiebreaker")}>✎</button>
            {board?.tiebreaker?.song && <SongStrip code={code} session={session} song={board.tiebreaker.song} />}
          </li>
        )}
        {/* The end of the night can come before every task is played: one last update, then the haul. */}
        <li>
          <button className="sb-task sb-declare" disabled={!declarable}
            onClick={() => { void declareWinner(code); window.scrollTo(0, 0); }}>
            <span className="sb-task-title">🏆 Declare the winner</span>
            <span className="muted small sb-task-note">
              {!declarable ? "Once a task has points"
                : board?.final ? "Declared · tap to bring the scoreboard and the haul back up"
                : "The scoreboard for one last update, then the prize haul"}
            </span>
          </button>
        </li>
      </ul>
      {adding === "live" ? <AddLiveTask code={code} board={board} onClose={() => setAdding(undefined)} />
        : adding === "game" ? (
          <div className="sb-add">
            <p className="muted small">Which game?</p>
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

/** Fixing a task in place: its name (optional for an app game, to tell two Photos tasks apart), its note, or taking it off the list. */
function TaskEdit({ code, session, id, task, onClose }: { code: string; session: Session; id: string; task: ScoreboardTask; onClose: () => void }) {
  const [name, setName] = useState(task.name ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [song, setSong] = useState(task.song ?? "");
  const [type, setType] = useState(task.type ?? "");
  const [text, setText] = useState(task.text ?? "");
  const [unit, setUnit] = useState(() => draftOf(task.unit));
  const [scoring, setScoringDraft] = useState(task.scoring);
  const [dqOver, setDqOver] = useState(task.dqOver === undefined ? "" : String(task.dqOver));
  const save = () => {
    const rescored = !task.game && scoring !== task.scoring;
    // By-hand points with no numbers to work from would be lost.
    const lost = rescored && scoring && !isMeasured(task) && Object.keys(task.given ?? task.scores ?? {}).some((c) => !task.dq?.[c] && task.results?.[c] === undefined);
    if (lost && !confirm(`Score "${titleOf(task)}" by its numbers? Points given by hand to anyone without a number are cleared.`)) return;
    const saved = unitOf(unit);
    const line = Number(dqOver.replace(",", "."));
    const over = saved?.kind === "loudness" && dqOver.trim() !== "" && Number.isFinite(line) ? line : undefined;
    void editTask(code, id, name, description, song, { type, text }, saved, over ?? null).then(() => {
      // A new line, or none, applies to the readings already in.
      if (over === task.dqOver) return;
      const now = { ...task, dqOver: over };
      const entry: TaskEntry = { dq: {}, overDq: {} };
      for (const c of new Set([...Object.keys(task.results ?? {}), ...Object.keys(task.overDq ?? {})])) {
        const e = overLine(now, c, task.results?.[c]);
        Object.assign(entry.dq!, e.dq);
        Object.assign(entry.overDq!, e.overDq);
      }
      const board = session.scoreboard && { ...session.scoreboard, tasks: { ...session.scoreboard.tasks, [id]: now } };
      if (Object.keys(entry.dq!).length) void enterPoints(code, board, session.display?.step === "scoreboard", id, entry);
    });
    if (rescored) void setScoring(code, session.scoreboard, session.display?.step === "scoreboard", id, scoring);
    onClose();
  };
  const drop = () => {
    if (scored(task) && !confirm(`Remove "${titleOf(task)}" and its points?`)) return;
    void removeTask(code, id);
    onClose();
  };
  return (
    <div className="sb-add sb-edit">
      {task.game ? (
        <label>{gameName(task.game)}: name it (optional)
          <input value={name} maxLength={80} placeholder="e.g. best costume" onChange={(e) => setName(e.target.value)} />
        </label>
      ) : (
        <label>Task name
          <input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      <label>Note for you (optional)
        <textarea rows={2} value={description} maxLength={600} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <TaskTypeField type={type} fallback={typeOf({ game: task.game }) || undefined} onChange={setType} />
      <TaskTextField text={text} onChange={setText} />
      {!task.game && <ScoringField scoring={scoring} onChange={setScoringDraft} />}
      <SongField session={session} song={song} onChange={setSong} />
      {task.game !== "light" && <UnitField draft={unit} onChange={setUnit} />}
      {unit.kind === "loudness" && (
        <div className="unit-field">
          <span>🔇 DQ if louder than (optional)</span>
          <div className="unit-size after">
            <input inputMode="decimal" value={dqOver} placeholder="60" aria-label="DQ if louder than, in dB" onChange={(e) => setDqOver(e.target.value)} />
            <span className="muted">dB</span>
          </div>
          <p className="muted small">
            {dqOver.trim() ? `A reading over ${dqOver.trim()} dB is a DQ as soon as you type it. Exactly ${dqOver.trim()} is safe.` : "Leave it empty for no limit."} Tap DQ on the points page to undo one.
          </p>
        </div>
      )}
      <div className="row">
        <button disabled={!task.game && !name.trim()} onClick={save}>Save</button>
        <button className="link" onClick={onClose}>Cancel</button>
      </div>
      <button className="link" onClick={drop}>Remove this task</button>
    </div>
  );
}

const SCORING = [["By hand", undefined], ["Highest wins", "highest"], ["Lowest wins", "lowest"]] as const;

/** "Scoring" on a live task's ✎ page: by hand, or points by place from each contestant's number. */
function ScoringField({ scoring, onChange }: { scoring: ScoreboardTask["scoring"]; onChange: (s: ScoreboardTask["scoring"]) => void }) {
  return (
    <div className="sb-scoring">
      <span>Scoring</span>
      <div className="choices">
        {SCORING.map(([label, value]) => (
          <button type="button" key={label} className={scoring === value ? "active" : ""} aria-pressed={scoring === value} onClick={() => onChange(value)}>{label}</button>
        ))}
      </div>
      <p className="muted small">
        {scoring ? `Type each result on the points page: 5 for the ${scoring === "highest" ? "most" : "least"}, then 4, 3, 2, and 1 for everyone else. DQ gets 0.`
          : "Tap each contestant's points on the points page. DQ gets 0."}
      </p>
    </div>
  );
}

/** Fixing the tiebreaker task: its name and note. There's no removing it; every party has one. */
function TiebreakerEdit({ code, session, board, onClose }: { code: string; session: Session; board: Scoreboard | undefined; onClose: () => void }) {
  const [name, setName] = useState(board?.tiebreaker?.name ?? "Tiebreaker task");
  const [description, setDescription] = useState(board?.tiebreaker?.description ?? "");
  const [song, setSong] = useState(board?.tiebreaker?.song ?? "");
  const [type, setType] = useState(board?.tiebreaker?.type ?? "");
  const [text, setText] = useState(board?.tiebreaker?.text ?? "");
  const save = () => { void editTiebreaker(code, name, description, song, { type, text }); onClose(); };
  return (
    <div className="sb-add sb-edit">
      <label>Task name
        <input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
      </label>
      <label>Note for you (optional)
        <textarea rows={2} value={description} maxLength={600} placeholder="How it's played, and how it's won: one winner."
          onChange={(e) => setDescription(e.target.value)} />
      </label>
      <TaskTypeField type={type} fallback={TIEBREAKER_TYPE} onChange={setType} />
      <TaskTextField text={text} onChange={setText} />
      <SongField session={session} song={song} onChange={setSong} />
      <div className="row">
        <button disabled={!name.trim()} onClick={save}>Save</button>
        <button className="link" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

/** The contestants, added before the party. The name field stays open at the bottom: type, Return, next. */
/**
 * Everyone at the party: the guest list (each with "checked in" once their phone is in) and, below it,
 * anyone who joined by typing a name while there was no list yet, ready to be added to the scoreboard.
 */
function Contestants({ code, session, board, contestants }: {
  code: string; session: Session; board: Scoreboard | undefined; contestants: [string, ScoreboardContestant][];
}) {
  const players = session.players ?? {};
  const linked = new Set(contestants.map(([, c]) => c.uid).filter((u) => u && players[u]));
  const loose = Object.entries(players).filter(([uid]) => !linked.has(uid)).sort(([, a], [, b]) => a.joinedAt - b.joinedAt);
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
        {contestants.map(([id, c]) => (
          <ContestantRow key={id} code={code} board={board} id={id} name={c.name} photo={c.photo} hasPoints={id in totals}
            here={c.uid && players[c.uid] ? c.uid : undefined} />
        ))}
      </ul>
      {loose.length > 0 && (
        <>
          <p className="muted small">Here, but not on the scoreboard:</p>
          <ul className="sb-contestant-list">
            {loose.map(([uid, p]) => (
              <li key={uid}>
                <span className="sb-contestant-name sb-loose">{p.name}<span className="muted small">checked in</span></span>
                <button className="sb-start" onClick={() => void addPlayerToScoreboard(code, board, uid, p.name)}>+ Add</button>
              </li>
            ))}
          </ul>
        </>
      )}
      <form className="row" onSubmit={add}>
        <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="Name of the next contestant" aria-label="Name of the next contestant" />
        <button type="submit" disabled={!name.trim()}>Add</button>
      </form>
    </section>
  );
}

function ContestantRow({ code, board, id, name, photo, hasPoints, here }: {
  code: string; board: Scoreboard | undefined; id: string; name: string; photo?: string; hasPoints: boolean;
  /** Their phone's uid, once they've checked in. */
  here?: string;
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
  // Off the scoreboard and, if they've checked in, out of the party too (their phone goes back to joining).
  const drop = () => {
    const what = [hasPoints && "all their points", here && "their phone's entries"].filter(Boolean).join(" and ");
    if ((hasPoints || here) && !confirm(`Remove ${name}${what ? ` and ${what}` : ""}?`)) return;
    void removeContestant(code, board, id);
    if (here) void removePlayer(code, here);
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
