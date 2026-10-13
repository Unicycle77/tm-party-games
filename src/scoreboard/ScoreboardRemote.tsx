import { useEffect, useRef, useState } from "react";
import { GAMES, activeGame } from "../games";
import { switchPhotosTask } from "../games/photos/data";
import { haulState, prizesIn, showHaul } from "../games/prize/data";
import { noBigScreen, removePlayer, setGame, useUid } from "../session";
import type { GameId, Scoreboard, ScoreboardContestant, ScoreboardTask, Session } from "../types";
import {
  addContestant, addPlayerToScoreboard, addTask, editTask, editTiebreaker, lowerCurtain, removeContestant, removeTask, renameContestant, reorderTasks,
  setPoints, setTiebreakerWinner, showScoreboard, updateScores, uploadHeadshot,
} from "./data";
import { currentTotals, pendingTasks } from "./scoring";

const sorted = <T extends { order: number }>(items: Record<string, T> | undefined) =>
  Object.entries(items ?? {}).sort(([, a], [, b]) => a.order - b.order);

/** A live task goes by its name; an app game by the game's, plus the host's name for it when there are several. */
const titleOf = (t: ScoreboardTask) => {
  if (!t.game) return t.name || "Untitled task";
  const game = GAMES[t.game]?.name ?? t.game;
  return t.name ? `${game}: ${t.name}` : game;
};
const scored = (t: ScoreboardTask) => Object.keys(t.scores ?? {}).length > 0;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "Priya and Sam", "Priya, Sam and Mei". */
const list = (names: string[]) => names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] ?? "";

/**
 * The host remote's home, the run of show (🏆 in the header always comes back here): the scoreboard's
 * buttons, the task list and the contestants. Tapping a task opens its points, and the points page stays
 * on that task until the host moves on. The big screen only moves when the host shows or updates the
 * scoreboard, or starts a game. Games not on the list are behind a quiet link at the bottom.
 */
export function ScoreboardRemote({ code, session, onStartGame, onOpenGame, onAdHoc }: {
  code: string; session: Session; onStartGame: () => void; onOpenGame: () => void; onAdHoc: () => void;
}) {
  const board = session.scoreboard;
  const tasks = sorted(board?.tasks);
  const contestants = sorted(board?.contestants);
  // Up next: the task after the last one with any points. The page opens on that last one while some
  // contestants still have no points for it, so a task half-scored is picked up where it was left.
  const lastScored = tasks.map(([, t]) => scored(t)).lastIndexOf(true);
  const next = tasks[lastScored + 1]?.[0];
  const unfinished = lastScored >= 0 && contestants.some(([c]) => tasks[lastScored]![1].scores?.[c] === undefined)
    ? tasks[lastScored]![0] : undefined;
  // The task whose points are open. Pinned when opened, so scoring everyone never moves the page on.
  const [picked, setPicked] = useState<string>();
  // The tiebreaker task's page, opened from the gold button when the last update leaves a tie.
  const [tiebreak, setTiebreak] = useState<string[]>();
  // Who's tied at the top once every task is in and shown (still so once the tiebreaker has a winner).
  const tied = haulState(session)?.tied;
  const upNext = unfinished ?? next;
  const open = (id: string) => { setPicked(id); window.scrollTo(0, 0); };
  const game = activeGame(session);
  const gameTask = game?.id === "photos" && session.games?.photos?.task ? board?.tasks?.[session.games.photos.task] : undefined;

  return (
    <div className="box-setup scoreboard-remote">
      <h2>Run of show</h2>
      {game && (
        <div className="sb-now-playing">
          <span>Now playing: <strong>{gameTask ? titleOf(gameTask) : game.name}</strong></span>
          <button onClick={onOpenGame}>Open →</button>
        </div>
      )}
      <ShowControls code={code} session={session} onTiebreak={(tied) => { setTiebreak(tied); window.scrollTo(0, 0); }} />
      {tiebreak ? <Tiebreaker code={code} board={board} tied={tiebreak} onClose={() => setTiebreak(undefined)} />
      : picked && board?.tasks?.[picked] && contestants.length > 0
        ? <Points code={code} board={board} id={picked} tasks={tasks} contestants={contestants}
            onChange={() => setPicked(undefined)} onNext={open} />
        : (
          <>
            {upNext && contestants.length > 0 && (
              <button className="sb-give" onClick={() => open(upNext)}>
                Give points: {tasks.findIndex(([t]) => t === upNext) + 1}&nbsp; {titleOf(board!.tasks![upNext]!)} →
              </button>
            )}
            <TaskList code={code} board={board} tasks={tasks} next={next} prizeNote={prizesIn(session, list)} onOpen={contestants.length ? open : undefined}
              onTiebreak={tied ? () => { setTiebreak(tied); window.scrollTo(0, 0); } : undefined}
              onStart={(id, game) => void (async () => {
                // A photo task brings its own photos (see switchPhotosTask).
                if (game === "photos") await switchPhotosTask(code, session, id);
                await setGame(code, game);
              })().then(onStartGame)} />
            <Contestants code={code} session={session} board={board} contestants={contestants} />
            <button className="link" onClick={onAdHoc}>Play a game that's not on the list</button>
          </>
        )}
    </div>
  );
}

/** What the big screen shows, and the one button that moves the scoreboard on it. */
function ShowControls({ code, session, onTiebreak }: { code: string; session: Session; onTiebreak: (tied: string[]) => void }) {
  const board = session.scoreboard;
  const up = session.display?.step === "scoreboard";
  const { added, changed } = pendingTasks(board);
  const pending = [added && plural(added, "new task"), changed && `${changed} changed`].filter(Boolean).join(", ");
  const game = activeGame(session);
  // A tie settled by the tiebreaker task can go to the haul from the curtain too: the tiebreaker
  // was played with the scoreboard down.
  const settled = haulState(session);
  const haul = up || (settled && "winner" in settled && settled.tied) ? settled : undefined;
  const nameOf = (id: string) => board?.contestants?.[id]?.name ?? "";
  const haulUp = session.display?.step === "haul";
  const line = noBigScreen(session) ? "not connected yet" : up ? "the scoreboard" : haulUp ? "the prize haul"
    : session.display?.step === "curtain" || (!game && session.begun) ? "the curtain"
    : !game ? "the welcome" : game.name;

  return (
    <>
      <p className="on-screen">On the big screen: {line}</p>
      {noBigScreen(session) && <p className="muted small">On the night, open the big screen and resume party {code}.</p>}
      {haulUp ? (
        <>
          <button className="big" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
          <button className="link" onClick={() => void showScoreboard(code)}>Back to the scoreboard</button>
        </>
      ) : !up && !haul ? (
        <>
          <button onClick={() => void showScoreboard(code)}>Show the scoreboard</button>
          {pending && <p className="muted small">At the totals you last showed. {pending} to add when you update.</p>}
        </>
      ) : pending ? (
        <>
          <button className="big" onClick={() => void updateScores(code, board)}>Update the scores · {pending}</button>
          <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
        </>
      ) : haul && "winner" in haul ? (
        // The end of the party: the winner's haul is the one next thing.
        <>
          <button className="big" onClick={() => void showHaul(code)}>🎁 Show the prize haul · {nameOf(haul.winner)}</button>
          {up && <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>}
        </>
      ) : haul ? (
        // A tie at the top: the tiebreaker, for just the tied contestants, is the one next thing. It's a
        // live task, so the curtain comes down while it's played.
        <>
          <button className="big" onClick={() => { void lowerCurtain(code); onTiebreak(haul.tied); }}>Play the tiebreaker task · {list(haul.tied.map(nameOf))}</button>
          <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
        </>
      ) : (
        <button className="big" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
      )}
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
        <button className="link" onClick={onChange}>← All tasks</button>
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

/**
 * The tiebreaker task's page: just the tied contestants, and a tap on whoever won. It has one winner
 * and no points, so nobody's total changes, and nothing goes on the big screen from here.
 */
function Tiebreaker({ code, board, tied, onClose }: {
  code: string; board: Scoreboard | undefined; tied: string[]; onClose: () => void;
}) {
  const tb = board?.tiebreaker;
  const nameOf = (id: string) => board?.contestants?.[id]?.name ?? "";
  return (
    <section className="sb-points">
      <div className="remote-head">
        <h3>{tb?.name || "Tiebreaker task"}: {list(tied.map(nameOf))}</h3>
        <button className="link" onClick={onClose}>← All tasks</button>
      </div>
      {tb?.description && <p className="muted small sb-note">{tb.description}</p>}
      <p className="muted small">Tap who won.</p>
      <ul className="picker running">
        {tied.map((id) => (
          <li key={id} className={tb?.winner === id ? "up" : ""}>
            <button aria-pressed={tb?.winner === id} onClick={() => void setTiebreakerWinner(code, tb?.winner === id ? null : id)}>
              <span>{nameOf(id)}</span>
              <span className="muted small">{tb?.winner === id ? "won the tiebreaker" : ""}</span>
            </button>
          </li>
        ))}
      </ul>
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
function TaskList({ code, board, tasks, next, prizeNote, onOpen, onTiebreak, onStart }: {
  code: string; board: Scoreboard | undefined; tasks: [string, ScoreboardTask][]; next?: string;
  /** Whose prizes are in, on the prize task's row. */
  prizeNote?: string;
  onOpen?: (id: string) => void; onStart: (id: string, game: GameId) => void;
  /** Opens the tiebreaker task's page, once there's a tie at the top. */
  onTiebreak?: () => void;
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
                {t.game === "prize" && prizeNote && <span className="muted small">🎁 {prizeNote}</span>}
                <span className="muted small">{scored(t) ? "scored" : id === next ? "← next" : ""}</span>
              </button>
              {t.game && <button className="sb-start" onClick={() => onStart(id, t.game!)}>▶ Start</button>}
              <button className="x" aria-label={`Fix ${titleOf(t)}`} onClick={() => setEditing(id)}>✎</button>
            </li>
          );
        })}
        {editing === "tiebreaker" ? <li><TiebreakerEdit code={code} board={board} onClose={() => setEditing(undefined)} /></li> : (
          // Every party's tiebreaker: always last, outside the running order, played only on a tie.
          <li>
            <button className="sb-task" disabled={!onTiebreak} onClick={onTiebreak}>
              <span className="sb-task-title">{board?.tiebreaker?.name || "Tiebreaker task"}<span className="muted small"> · only if there's a tie</span></span>
              <span className="muted small sb-task-note">{board?.tiebreaker?.description ? `"${board.tiebreaker.description}"` : "Add how it's won with ✎"}</span>
            </button>
            <button className="x" aria-label="Fix the tiebreaker task" onClick={() => setEditing("tiebreaker")}>✎</button>
          </li>
        )}
      </ul>
      {adding === "live" ? <AddLiveTask code={code} board={board} onClose={() => setAdding(undefined)} />
        : adding === "game" ? (
          <div className="sb-add">
            <p className="muted small">Which game?</p>
            <div className="choices">
              {/* each game once (Photos as often as needed): a game already on the list is greyed out */}
              {Object.values(GAMES).map((g) => {
                const listed = !g.repeatable && Object.values(board?.tasks ?? {}).some((t) => t.game === g.id);
                return <button key={g.id} disabled={listed} title={listed ? "Already on the run of show" : undefined}
                  onClick={() => { void addTask(code, board, { game: g.id }); setAdding(undefined); }}>{g.name}{listed && <span className="played">on the list</span>}</button>;
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
function TaskEdit({ code, id, task, onClose }: { code: string; id: string; task: ScoreboardTask; onClose: () => void }) {
  const [name, setName] = useState(task.name ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const save = () => { void editTask(code, id, name, description); onClose(); };
  const drop = () => {
    if (scored(task) && !confirm(`Remove "${titleOf(task)}" and its points?`)) return;
    void removeTask(code, id);
    onClose();
  };
  return (
    <div className="sb-add sb-edit">
      {task.game ? (
        <label>{GAMES[task.game]?.name ?? task.game}: name it (optional)
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
      <div className="row">
        <button disabled={!task.game && !name.trim()} onClick={save}>Save</button>
        <button className="link" onClick={onClose}>Cancel</button>
      </div>
      <button className="link" onClick={drop}>Remove this task</button>
    </div>
  );
}

/** Fixing the tiebreaker task: its name and note. There's no removing it; every party has one. */
function TiebreakerEdit({ code, board, onClose }: { code: string; board: Scoreboard | undefined; onClose: () => void }) {
  const [name, setName] = useState(board?.tiebreaker?.name ?? "Tiebreaker task");
  const [description, setDescription] = useState(board?.tiebreaker?.description ?? "");
  const save = () => { void editTiebreaker(code, name, description); onClose(); };
  return (
    <div className="sb-add sb-edit">
      <label>Task name
        <input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
      </label>
      <label>Note for you (optional)
        <textarea rows={2} value={description} maxLength={600} placeholder="How it's played, and how it's won: one winner."
          onChange={(e) => setDescription(e.target.value)} />
      </label>
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
