import { useEffect, useRef, useState } from "react";
import { GAMES, activeGame } from "../games";
import { switchPhotosTask } from "../games/photos/data";
import { prizesIn, showHaul, standing } from "../games/prize/data";
import { noBigScreen, removePlayer, setGame, useUid } from "../session";
import type { GameId, Scoreboard, ScoreboardContestant, ScoreboardTask, Session, TaskGame } from "../types";
import {
  addContestant, addKeptGame, addPlayerToScoreboard, addTask, editTask, editTiebreaker, lowerCurtain, removeContestant, removeTask, renameContestant, reorderTasks,
  declareWinner, enterPoints, setScoring, setTiebreakerWinner, showScoreboard, startTask, updateScores, uploadHeadshot, type TaskEntry,
} from "./data";
import { isMeasured, ordinal, parseClock, workOut } from "./measured";
import { formatTime } from "../games/noisemaster/data";
import { currentTotals, pendingTasks } from "./scoring";
import { SongField, SongStrip } from "../SongStrip";
import { draftOf, unitOf, UnitField } from "../conversions/UnitField";

export const sorted = <T extends { order: number }>(items: Record<string, T> | undefined) =>
  Object.entries(items ?? {}).sort(([, a], [, b]) => a.order - b.order);

/** An app game's name on the task list. */
const LIGHT = "💡 The light";
const gameName = (g: TaskGame) => g === "light" ? LIGHT : GAMES[g]?.name ?? g;

/** A live task goes by its name; an app game by the game's, plus the host's name for it when there are several. */
export const titleOf = (t: ScoreboardTask) => {
  if (!t.game) return t.name || "Untitled task";
  const game = gameName(t.game);
  return t.name ? `${game}: ${t.name}` : game;
};
export const scored = (t: ScoreboardTask) => Object.keys(t.scores ?? {}).length > 0;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/** "Priya and Sam", "Priya, Sam and Mei". */
const list = (names: string[]) => names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] ?? "";

/**
 * The host remote's home, the run of show (🏆 in the header always comes back here): the scoreboard's
 * buttons, the task list and the contestants. Tapping a task opens its points, and the points page stays
 * on that task until the host moves on. The big screen only moves when the host shows or updates the
 * scoreboard, or starts a game. Games not on the list are behind a quiet link at the bottom.
 */
export function ScoreboardRemote({ code, session, onStartGame, onOpenGame, onAdHoc, onLight }: {
  code: string; session: Session; onStartGame: () => void; onOpenGame: () => void; onAdHoc: () => void;
  /** Opens 💡 the light, where its order is marked. */
  onLight: () => void;
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
  const tied = standing(session)?.tied;
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
      {tiebreak ? <Tiebreaker code={code} session={session} board={board} tied={tiebreak} onClose={() => setTiebreak(undefined)} />
      : picked && board?.tasks?.[picked] && contestants.length > 0
        ? <Points code={code} session={session} board={board} onScreen={session.display?.step === "scoreboard"} id={picked} tasks={tasks} contestants={contestants}
            onChange={() => setPicked(undefined)} onNext={open} onLight={onLight} />
        : (
          <>
            {upNext && contestants.length > 0 && (
              <button className="sb-give" onClick={() => open(upNext)}>
                Give points: {tasks.findIndex(([t]) => t === upNext) + 1}&nbsp; {titleOf(board!.tasks![upNext]!)} →
              </button>
            )}
            <TaskList code={code} session={session} board={board} tasks={tasks} next={next} prizeNote={prizesIn(session, list)} onOpen={contestants.length ? open : undefined}
              onTiebreak={tied ? () => { setTiebreak(tied); window.scrollTo(0, 0); } : undefined}
              onStart={(id, game) => void (async () => {
                await startTask(code, board, session.display?.step === "scoreboard", id);
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
  const now = standing(session);
  // Still tied at the top: the tiebreaker task is the next thing.
  const tied = now && !("winner" in now) ? now.tied : undefined;
  // The haul goes up from the scoreboard, or from the curtain once a tiebreaker has been won (it's
  // played with the scoreboard down).
  const winner = now && "winner" in now && !pending && (up || now.tied) ? now.winner : undefined;
  // The tasks still without points: the haul waits for them, unless the host declares the winner first.
  const unscored = sorted(board?.tasks).filter(([, t]) => !scored(t)).map(([, t]) => titleOf(t));
  const final = !!board?.final;
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
      ) : !up && !winner ? (
        <>
          <button onClick={() => void showScoreboard(code)}>Show the scoreboard</button>
          {pending && <p className="muted small">At the totals you last showed. {pending} to add when you update.</p>}
        </>
      ) : up && pending ? (
        <>
          <button className="big" onClick={() => void updateScores(code, board)}>Update the scores · {pending}</button>
          <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
        </>
      ) : winner ? (
        // The end of the party: the winner's haul is the one next thing.
        <>
          <button className="big" onClick={() => void showHaul(code)}>🎁 Show the prize haul · {nameOf(winner)}</button>
          {up && <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>}
        </>
      ) : tied ? (
        // A tie at the top: the tiebreaker, for just the tied contestants, is the one next thing. It's a
        // live task, so the curtain comes down while it's played.
        <>
          <button className="big" onClick={() => { void lowerCurtain(code); onTiebreak(tied); }}>Play the tiebreaker task · {list(tied.map(nameOf))}</button>
          <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
        </>
      ) : (
        <button className="big" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
      )}
      {!haulUp && unscored.length > 0 && (final ? (
        <p className="muted small">
          Declaring the winner with {list(unscored)} unscored. <button className="link" onClick={() => void declareWinner(code, false)}>Not yet</button>
        </p>
      ) : up && !pending && (
        <p className="muted small">The prize haul comes once every task has points. Still none for {list(unscored)}. Or declare the winner from the task list.</p>
      ))}
    </>
  );
}

/**
 * Giving points for one task. By hand: a row of chips per contestant. Measured: a box for each contestant's
 * number, and the points by place. Every tap saves; nothing goes on the big screen.
 */
function Points({ code, session, board, onScreen, id, tasks, contestants, onChange, onNext, onLight }: {
  code: string; session: Session; board: Scoreboard | undefined; onScreen: boolean; id: string; tasks: [string, ScoreboardTask][];
  contestants: [string, { name: string }][]; onChange: () => void; onNext: (id: string) => void; onLight: () => void;
}) {
  const task = board!.tasks![id]!;
  const place = tasks.findIndex(([t]) => t === id);
  const following = tasks[place + 1]?.[0];
  const totals = currentTotals(board);
  const worked = workOut(task);
  const measured = isMeasured(task);
  const timed = task.game === "noisemaster";
  // The light's order comes from 💡, where it's marked: here it's only shown.
  const light = task.game === "light";
  const enter = (entry: TaskEntry) => void enterPoints(code, board, onScreen, id, entry);
  const nameOf = (c: string) => board?.contestants?.[c]?.name ?? "";
  // The DQs that change anyone else's points: those with points or a number of their own.
  const outs = contestants.map(([c]) => c).filter((c) => task.dq?.[c] && (measured ? task.results?.[c] : (task.given ?? task.scores)?.[c]) !== undefined);
  const before = Object.keys(worked.before).length > 0;
  const status = light
    ? `Fastest wins · order from the light · ${contestants.filter(([c]) => task.results?.[c] !== undefined).length} of ${contestants.length} got it`
    : measured
    ? `${timed ? "Fastest wins · times from the soundboard" : task.scoring === "lowest" ? "Lowest wins" : "Highest wins"} · ${
      contestants.filter(([c]) => task.results?.[c] !== undefined || task.dq?.[c]).length} of ${contestants.length} ${timed ? "played" : "measured"}`
    : `${contestants.filter(([c]) => worked.points[c] !== undefined).length} of ${contestants.length} scored`;
  const bonuses = contestants.filter(([c]) => task.bonus?.[c]).length;

  return (
    <section className="sb-points">
      <div className="remote-head">
        <h3>Task {place + 1} of {tasks.length}: {titleOf(task)}</h3>
        <button className="link" onClick={onChange}>← All tasks</button>
      </div>
      {task.description && <p className="muted small sb-note">{task.description}</p>}
      {task.song && <SongStrip code={code} session={session} song={task.song} />}
      <p className="muted small">{status}{bonuses > 0 && ` · ${plural(bonuses, "bonus point", "bonus points")}`}</p>
      {outs.length > 0 && worked.moved > 0 && (
        <p className="muted small sb-dq-line">
          {list(outs.map(nameOf))}'s {outs.length === 1 ? "DQ" : "DQs"}{" "}
          {task.dqStays ? <>{outs.length === 1 ? "doesn't" : "don't"} move anyone. <button className="link" onClick={() => enter({ dqStays: null })}>Move them up</button></>
            : <>moved {plural(worked.moved, "person", "people")} up. <button className="link" onClick={() => enter({ dqStays: true })}>Don't move them</button></>}
        </p>
      )}
      <ul className={measured ? "sb-rows sb-measured" : "sb-rows"}>
        {contestants.map(([c, con]) => measured
          ? <MeasuredRow key={c} name={con.name} total={totals[c] ?? 0} timed={timed} light={light} unit={task.unit?.name}
              result={task.results?.[c]} restarts={task.restarts?.[c]} dq={!!task.dq?.[c]} given={task.given?.[c]} bonus={!!task.bonus?.[c]}
              points={worked.points[c]} auto={worked.auto[c]} place={worked.place[c]} before={worked.before[c]} onEnter={(entry) => enter(entry(c))} />
          : <PointsRow key={c} name={con.name} total={totals[c] ?? 0} points={worked.points[c]} given={(task.given ?? task.scores)?.[c]}
              dq={!!task.dq?.[c]} bonus={!!task.bonus?.[c]} before={worked.before[c]} onEnter={(entry) => enter(entry(c))} />)}
      </ul>
      {before && <p className="muted small sb-before-key"><span className="sb-before" aria-hidden="true" /> before the DQ</p>}
      {light && <p className="muted small">Change the order on <button className="link" onClick={onLight}>{LIGHT}</button>.</p>}
      {following && <button className="link sb-next" onClick={() => { onNext(following); window.scrollTo(0, 0); }}>Next task →</button>}
    </section>
  );
}

/** One contestant's entry, made for them: `(c) => ({ given: { [c]: 3 } })`. */
type EntryFor = (entry: (c: string) => TaskEntry) => void;
const one = <T,>(c: string, v: T) => ({ [c]: v });

/**
 * The tiebreaker task's page: just the tied contestants, and a tap on whoever won. It has one winner
 * and no points, so nobody's total changes, and nothing goes on the big screen from here.
 */
function Tiebreaker({ code, session, board, tied, onClose }: {
  code: string; session: Session; board: Scoreboard | undefined; tied: string[]; onClose: () => void;
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
      {tb?.song && <SongStrip code={code} session={session} song={tb.song} />}
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

const CHIPS = [1, 2, 3, 4, 5];

/** The +1 at the end of a points row: a bonus point on top of whatever they scored. A DQ keeps it. */
function BonusChip({ name, bonus, onEnter }: { name: string; bonus: boolean; onEnter: EntryFor }) {
  return (
    <div className="choices marks sb-bonus">
      <button aria-pressed={bonus} aria-label={`Bonus point for ${name}`} onClick={() => onEnter((c) => ({ bonus: one(c, bonus ? null : true) }))}>+1</button>
    </div>
  );
}

/**
 * One contestant on a by-hand task: DQ by the name, then 1 to 5, and +1 for a bonus point on top. Tapping the
 * pressed chip takes the points away. A DQ keeps the points they were given, struck through; a dashed chip
 * is what they had before someone else's DQ moved them up. Points typed in before there was a bonus (0, 6, 2.5)
 * show as one more pressed chip, until tapped away.
 */
function PointsRow({ name, total, points, given, dq, bonus, before, onEnter }: {
  name: string; total: number; points?: number; given?: number; dq: boolean; bonus: boolean; before?: number; onEnter: EntryFor;
}) {
  // What a tap means: the points they end up with, so take off what the DQs moved them up by.
  const moved = !dq && points !== undefined && given !== undefined ? points - given : 0;
  const set = (n: number | null) => onEnter((c) => ({ given: one(c, n === null ? null : n - moved), ...(dq ? { dq: one(c, null) } : {}) }));
  const shown = dq ? undefined : points;
  const odd = dq ? (given !== undefined && !CHIPS.includes(given) ? given : undefined) : shown !== undefined && !CHIPS.includes(shown) ? shown : undefined;
  const cls = (n: number) => dq && given === n ? "was" : before === n ? "before" : undefined;
  return (
    <li>
      <span className="sb-name">{name}<span className="muted small sb-now">now {total}</span></span>
      <div className="choices marks sb-dq">
        <button aria-pressed={dq} aria-label={`Disqualify ${name}`} onClick={() => onEnter((c) => ({ dq: one(c, dq ? null : true) }))}>DQ</button>
      </div>
      <div className="choices marks sb-chips">
        {CHIPS.map((n) => (
          <button key={n} className={cls(n)} aria-pressed={shown === n} aria-label={`${n} for ${name}`} onClick={() => set(shown === n ? null : n)}>{n}</button>
        ))}
        {odd !== undefined && (
          <button className={dq ? "was" : undefined} aria-pressed={!dq} aria-label={dq ? `${odd} for ${name}` : `${odd} for ${name}. Take it away`} onClick={() => set(dq ? odd : null)}>{odd}</button>
        )}
      </div>
      <BonusChip name={name} bonus={bonus} onEnter={onEnter} />
    </li>
  );
}

/**
 * One contestant on a measured task: DQ by the name, their number (a time, for Noisemaster), and their points
 * with the place under them, then +1 for a bonus point. Tapping the points opens the chips, to set them by hand;
 * a point set by hand sticks.
 */
function MeasuredRow({ name, total, timed, light, unit, result, restarts, dq, given, bonus, points, auto, place, before, onEnter }: {
  name: string; total: number; timed: boolean; light: boolean; unit?: string; result?: number; restarts?: number; dq: boolean; given?: number; bonus: boolean;
  points?: number; auto?: number; place?: number; before?: number; onEnter: EntryFor;
}) {
  const format = (n: number) => timed ? formatTime(n) : String(n);
  const [typing, setTyping] = useState<string>();
  const [open, setOpen] = useState(false);
  const type = (text: string) => {
    setTyping(text);
    const n = timed ? parseClock(text) : parseFloat(text.replace(",", "."));
    if (text.trim() === "") onEnter((c) => ({ results: one(c, null) }));
    else if (n !== undefined && Number.isFinite(n)) onEnter((c) => ({ results: one(c, n) }));
  };
  const give = (n: number | null) => onEnter((c) => ({ given: one(c, n) }));
  const overridden = given !== undefined && !dq;
  const autoLine = auto !== undefined && place !== undefined ? `${auto} for ${ordinal(place)}` : undefined;
  return (
    <li className={dq ? "dq" : undefined}>
      <div className="sb-measure">
        <span className="sb-name">{name}<span className="muted small sb-now">now {total}</span></span>
        <div className="choices marks sb-dq">
          <button aria-pressed={dq} aria-label={`Disqualify ${name}`} onClick={() => { setOpen(false); onEnter((c) => ({ dq: one(c, dq ? null : true) })); }}>DQ</button>
        </div>
        {light ? <span className={`sb-got${result === undefined ? " muted" : ""}`}>{result === undefined ? "not yet" : `got it ${ordinal(result)}`}</span> : (
          <input className="sb-result" type="text" inputMode="decimal" value={typing ?? (result === undefined ? "" : format(result))}
            placeholder={timed ? "not played" : "—"} aria-label={`${name}'s ${timed ? "time" : unit ?? "result"}`}
            onChange={(e) => type(e.target.value)} onBlur={() => setTyping(undefined)} />
        )}
        <span className="sb-unit muted">{timed ? (restarts !== undefined ? `↺ ${restarts}` : "") : unit ?? ""}</span>
        {points !== undefined
          ? <button className={`sb-pts${open ? " open" : ""}`} aria-expanded={open} aria-label={`${name}'s points: ${points}. Change them`}
              disabled={dq} onClick={() => setOpen(!open)}>
              <b>{points}{overridden && <span className="sb-hand">✎</span>}{before !== undefined && <span className="sb-before">{before}</span>}</b>
              <span className="small">{dq ? "DQ" : place !== undefined ? ordinal(place) : ""}</span>
            </button>
          : <span />}
        <BonusChip name={name} bonus={bonus} onEnter={onEnter} />
      </div>
      {open && !dq && (
        <div className="sb-override">
          <div className="choices marks sb-chips">
            {CHIPS.map((n) => <button key={n} aria-pressed={points === n} aria-label={`${n} for ${name}`} onClick={() => give(n)}>{n}</button>)}
          </div>
          {overridden
            ? autoLine && <button className="link small" onClick={() => give(null)}>Back to {autoLine}</button>
            : autoLine && <span className="muted small">Automatic: {autoLine}. Tap a chip to change it.</span>}
        </div>
      )}
    </li>
  );
}

/**
 * The task list in running order: live tasks the host names and app games. Tap a task for its points;
 * ≡ drags it to a new place; ✎ fixes its name or note, or removes it; ▶ Start starts an app game.
 */
function TaskList({ code, session, board, tasks, next, prizeNote, onOpen, onTiebreak, onStart }: {
  code: string; session: Session; board: Scoreboard | undefined; tasks: [string, ScoreboardTask][]; next?: string;
  /** Whose prizes are in, on the prize task's row. */
  prizeNote?: string;
  onOpen?: (id: string) => void; onStart: (id: string, game: GameId) => void;
  /** Opens the tiebreaker task's page, once there's a tie at the top. */
  onTiebreak?: () => void;
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
      {!onOpen && tasks.length > 0 && <p className="muted small">Add contestants to give points.</p>}
      <ul className="sb-task-list">
        {order.map((id, i) => {
          const t = byId[id]!;
          if (editing === id) {
            return <li key={id} ref={(el) => { rows.current[id] = el; }}><TaskEdit code={code} session={session} id={id} task={t} onClose={() => setEditing(undefined)} /></li>;
          }
          return (
            <li key={id} ref={(el) => { rows.current[id] = el; }}
              className={[dragging?.id === id && "dragging", t.song && "has-song", t.song && !t.game && "live"].filter(Boolean).join(" ") || undefined}>
              <button className="sb-handle" aria-label={`Move ${titleOf(t)}`}
                onPointerDown={(e) => drag.start(e, id)} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end}>≡</button>
              <button className="sb-task" disabled={!onOpen} onClick={() => onOpen?.(id)}>
                <span className="sb-task-title">{i + 1}&nbsp; {titleOf(t)}{t.game && <span className="muted small"> · app game</span>}</span>
                {t.description && <span className="muted small sb-task-note">"{t.description}"</span>}
                {t.game === "prize" && prizeNote && <span className="muted small">🎁 {prizeNote}</span>}
                <span className="muted small">{scored(t) ? "scored" : id === next ? "← next" : ""}</span>
              </button>
              {/* the light runs all evening from 💡, so there's nothing to start */}
              {t.game && t.game !== "light" && <button className="sb-start" onClick={() => onStart(id, t.game as GameId)}>▶ Start</button>}
              <button className="x" aria-label={`Fix ${titleOf(t)}`} onClick={() => setEditing(id)}>✎</button>
              {t.song && <SongStrip code={code} session={session} song={t.song} />}
            </li>
          );
        })}
        {editing === "tiebreaker" ? <li><TiebreakerEdit code={code} session={session} board={board} onClose={() => setEditing(undefined)} /></li> : (
          // Every party's tiebreaker: always last, outside the running order, played only on a tie.
          <li className={board?.tiebreaker?.song ? "has-song tiebreaker" : undefined}>
            <button className="sb-task sb-tiebreaker" disabled={!onTiebreak} onClick={onTiebreak}>
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
  const [unit, setUnit] = useState(() => draftOf(task.unit));
  const [scoring, setScoringDraft] = useState(task.scoring);
  const save = () => {
    const rescored = !task.game && scoring !== task.scoring;
    // By-hand points with no numbers to work from would be lost.
    const lost = rescored && scoring && !isMeasured(task) && Object.keys(task.given ?? task.scores ?? {}).some((c) => !task.dq?.[c] && task.results?.[c] === undefined);
    if (lost && !confirm(`Score "${titleOf(task)}" by its numbers? Points given by hand to anyone without a number are cleared.`)) return;
    void editTask(code, id, name, description, song, unitOf(unit));
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
      {!task.game && <ScoringField scoring={scoring} onChange={setScoringDraft} />}
      <SongField session={session} song={song} onChange={setSong} />
      {task.game !== "light" && <UnitField draft={unit} onChange={setUnit} />}
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
  const save = () => { void editTiebreaker(code, name, description, song); onClose(); };
  return (
    <div className="sb-add sb-edit">
      <label>Task name
        <input value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} />
      </label>
      <label>Note for you (optional)
        <textarea rows={2} value={description} maxLength={600} placeholder="How it's played, and how it's won: one winner."
          onChange={(e) => setDescription(e.target.value)} />
      </label>
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
