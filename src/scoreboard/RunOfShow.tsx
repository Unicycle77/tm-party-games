import type { ReactNode } from "react";
import { JoinQr, OnScreen } from "../HostRemote";
import { activeGame } from "../games";
import { prizesIn, showHaul, standing } from "../games/prize/data";
import { noBigScreen } from "../session";
import type { Session } from "../types";
import { cropFill } from "./crop";
import { declareWinner, lowerCurtain, showScoreboard, updateScores } from "./data";
import { beginTask } from "./TaskPage";
import { activeTaskId, allScored, list, pendingIds, scored, sorted, titleOf, upNextOf } from "./tasks";

/**
 * The host remote's home: the party line with a small "Show QR" chip, one line saying what's on the big screen with
 * a small "Show scores" chip, then the one next thing in gold (the scoreboard's next step while it's up, or else the
 * "Up next" card), and the task list to see where the night is. Tapping a task opens its page. Building the party is
 * behind "Plan the party".
 */
export function RunOfShow({ code, session, onOpen, onTiebreak, footer }: {
  code: string; session: Session;
  /** Opens a task's page: a task's id, or "adhoc" for a game that's not on the list. */
  onOpen: (id: string) => void;
  /** Opens the tiebreaker task's page, once the last update leaves a tie. */
  onTiebreak: () => void;
  /** The quiet links at the bottom. */
  footer: ReactNode;
}) {
  const board = session.scoreboard;
  const tasks = sorted(board?.tasks);
  const up = session.display?.step === "scoreboard";
  const haulUp = session.display?.step === "haul";
  const pending = pendingIds(board);
  const now = standing(session);
  const tied = now && !("winner" in now) ? now.tied : undefined;
  // The haul goes up from the scoreboard, or from the curtain once a tiebreaker has been won (it's played with the scoreboard down).
  const winner = now && "winner" in now && !pending.length && (up || now.tied) ? now.winner : undefined;
  const nameOf = (id: string) => board?.contestants?.[id]?.name ?? "";
  const unscored = tasks.filter(([, t]) => !scored(t)).map(([, t]) => titleOf(t));
  const final = !!board?.final;
  const adHoc = !activeTaskId(session) ? activeGame(session) : undefined;
  // Until the first task starts (its first points, or ▶ Start) the page is about who's here.
  const arrivals = !tasks.some(([, t]) => scored(t)) && !activeTaskId(session) && !up && !haulUp;
  const finale = tasks.length > 0 && unscored.length === 0 && !final && !haulUp && !winner;

  // The scoreboard's next step takes the top slot, so there's only ever one gold button.
  const scores = haulUp ? (
    <>
      <button className="big" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
      <button className="link" onClick={() => void showScoreboard(code)}>Back to the scoreboard</button>
    </>
  ) : up && pending.length ? (
    <>
      <button className="big" onClick={() => void updateScores(code, board)}>Update the scores</button>
      <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
    </>
  ) : winner ? (
    // The end of the party: the winner's haul is the one next thing.
    <>
      <button className="big" onClick={() => void showHaul(code)}>🎁 Show the prize haul · {nameOf(winner)}</button>
      {up && <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>}
    </>
  ) : tied && up ? (
    // A tie at the top: the tiebreaker, for just the tied contestants. It's a live task, so the curtain comes down while it's played.
    <>
      <button className="big" onClick={() => { void lowerCurtain(code); onTiebreak(); }}>Play the tiebreaker task · {list(tied.map(nameOf))}</button>
      <button className="link" onClick={() => void lowerCurtain(code)}>Lower the curtain</button>
    </>
  ) : up ? <button className="big" onClick={() => void lowerCurtain(code)}>Lower the curtain</button> : undefined;

  return (
    <div className="box-setup scoreboard-remote run-of-show">
      <h2>Run of show</h2>
      <div className="line-chip">
        <p className="muted small party-line">{session.name ? `${session.name} · ` : ""}{code}</p>
        <JoinQr code={code} session={session} />
      </div>
      <OnScreen code={code} session={session} chip={!up && !haulUp && !winner
        ? <button className="line-chip-button" onClick={() => void showScoreboard(code)}>Show scores</button> : undefined} />
      {noBigScreen(session) && <p className="muted small">On the night, open the big screen and resume party {code}.</p>}
      {scores}
      {!haulUp && unscored.length > 0 && (final ? (
        <p className="muted small">
          Declaring the winner with {list(unscored)} unscored. <button className="link" onClick={() => void declareWinner(code, false)}>Not yet</button>
        </p>
      ) : up && !pending.length && (
        <p className="muted small">The prize haul comes once every task has points. Still none for {list(unscored)}. Or end the night now, below the list.</p>
      ))}
      {arrivals && <Arrivals code={code} session={session} />}
      {finale ? <Finale code={code} count={tasks.length} quiet={!!scores} />
        : <UpNext code={code} session={session} quiet={!!scores} onOpen={onOpen} />}
      <TaskList session={session} onOpen={onOpen} />
      {/* The night can end before every task is played: one last update, then the haul. */}
      {!final && !haulUp && unscored.length > 0 && tasks.some(([, t]) => scored(t)) && (
        <button className="link end-night" onClick={() => { void declareWinner(code); window.scrollTo(0, 0); }}>End the night now: declare the winner</button>
      )}
      <div className="run-links">
        {/* A game that's not on the list is played on the same page, with no number and no points. */}
        <button className="link" onClick={() => onOpen("adhoc")}>
          {adHoc ? `Back to ${adHoc.name} (not on the list)` : "Play a game that's not on the list"}
        </button>
        {footer}
      </div>
    </div>
  );
}

/**
 * "Up next": the task after the last one scored, with the night's gold button. Paper while the scores are up,
 * so the gold stays on the scoreboard's next step; starting it then brings the scores down too.
 */
function UpNext({ code, session, quiet, onOpen }: { code: string; session: Session; quiet: boolean; onOpen: (id: string) => void }) {
  const board = session.scoreboard;
  const next = upNextOf(board);
  const task = next && board?.tasks?.[next.id];
  if (!next || !task) return null;
  const tasks = sorted(board?.tasks);
  const n = tasks.findIndex(([id]) => id === next.id) + 1;
  const playing = activeTaskId(session) === next.id;
  // Half-scored, already on, or the light (which runs all evening): just open it.
  const open = next.unfinished || playing || task.game === "light";
  const label = open ? `Open task ${n} →` : task.game ? `▶ Start ${titleOf(task)}` : `Start task ${n} →`;
  const go = () => {
    if (open) onOpen(next.id);
    else void beginTask(code, session, next.id).then(() => onOpen(next.id));
  };
  return (
    <section className="up-next">
      <p className="up-next-label">Up next · task {n} of {tasks.length} · {task.game ? "app game" : "live task"}</p>
      <h3>{titleOf(task)}</h3>
      {task.description && <p className="up-next-note">"{task.description}"</p>}
      <button className={quiet ? undefined : "big"} onClick={go}>{label}</button>
    </section>
  );
}

/** The night's tasks in order, read-only: a number, the name and one short state. Tapping a row opens that task. */
function TaskList({ session, onOpen }: { session: Session; onOpen: (id: string) => void }) {
  const board = session.scoreboard;
  const tasks = sorted(board?.tasks);
  const contestants = Object.keys(board?.contestants ?? {}).length;
  const next = upNextOf(board)?.id;
  const playing = activeTaskId(session);
  const prizes = prizesIn(session, list)?.split(" · ")[0];
  const stateOf = (id: string) => {
    const t = board!.tasks![id]!;
    if (allScored(board, t)) return "scored";
    if (id === playing) return "playing";
    if (t.game === "light") return `${Object.keys(t.results ?? {}).length} of ${contestants} got it`;
    if (scored(t)) return `${Object.keys(t.scores ?? {}).length} of ${contestants} scored`;
    if (t.game === "prize" && prizes) return prizes.toLowerCase();
    return id === next ? "next" : "";
  };
  return (
    <section className="sb-tasks">
      <h3>All tasks</h3>
      {tasks.length === 0 && <p className="muted small">No tasks yet. Add them on Plan the party.</p>}
      <ul className="run-list">
        {tasks.map(([id, t], i) => {
          const state = stateOf(id);
          return (
            <li key={id} className={state === "scored" ? "done" : id === next ? "next" : undefined}>
              <button onClick={() => onOpen(id)}>
                <span className="n">{i + 1}</span>
                <span className="name">{titleOf(t)}</span>
                <span className="state">{state}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Before the first task: who's here, in guest-list order, read-only (changing the list is on Plan the party).
 */
function Arrivals({ code, session }: { code: string; session: Session }) {
  const board = session.scoreboard;
  const contestants = Object.entries(board?.contestants ?? {}).sort(([, a], [, b]) => a.order - b.order);
  if (!contestants.length) return null;
  const here = (uid?: string) => !!uid && !!session.players?.[uid];
  const count = contestants.filter(([, c]) => here(c.uid)).length;
  return (
    <section className="arrivals">
      <h3>Here so far · {count} of {contestants.length}</h3>
      <ul className="arrivals-list">
        {contestants.map(([id, c]) => (
          <li key={id} className={here(c.uid) ? undefined : "away"}>
            <span className="face" aria-hidden>{c.photo ? <span className="fill" style={cropFill(c.photo, c.crop)} /> : null}</span>
            <span className="name">{c.name}</span>
            <span className="muted small">{!here(c.uid) ? "not yet" : c.photo ? "checked in" : "checked in · no headshot yet"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Once every task has points, the "Up next" card becomes the night's last gold button. */
function Finale({ code, count, quiet }: { code: string; count: number; quiet: boolean }) {
  return (
    <section className="up-next the-finale">
      <p className="up-next-label">The finale</p>
      <h3>All {count} tasks scored</h3>
      <p className="up-next-note">One last update on the scoreboard, then the haul.</p>
      <button className={quiet ? undefined : "big"} onClick={() => { void declareWinner(code); window.scrollTo(0, 0); }}>🏆 Declare the winner</button>
    </section>
  );
}
