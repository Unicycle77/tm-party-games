import { useState } from "react";
import { GameControls, OnScreen, placeOf } from "../HostRemote";
import { PICKER_GAMES, activeGame } from "../games";
import { switchPhotosTask } from "../games/photos/data";
import { showHaul, standing } from "../games/prize/data";
import { setGame } from "../session";
import { SongStrip } from "../SongStrip";
import type { GameId, Session } from "../types";
import { lowerCurtain, setTiebreakerWinner, showTaskText, startTask } from "./data";
import { Points } from "./Points";
import { activeTaskId, list, scored, titleOf } from "./tasks";
import { TaskTextCard, TIEBREAKER_TYPE, typeOf } from "./TaskText";

/**
 * Starts a task from Run of show or its page: the scores come down if they're up, the task before it is caught
 * up on the scoreboard (see startTask), and an app game goes on, bringing its photos if it's a photo task. A live
 * task ends any game still on, so the big screen goes back to the curtain.
 */
export async function beginTask(code: string, session: Session, id: string) {
  const task = session.scoreboard?.tasks?.[id];
  if (!task) return;
  const step = session.display?.step;
  if (task.game && task.game !== "light") {
    await startTask(code, session.scoreboard, false, id);
    if (task.game === "photos") await switchPhotosTask(code, session, id);
    await setGame(code, task.game as GameId);
    return;
  }
  if (session.game) await setGame(code, null);
  else if (step === "scoreboard" || step === "haul") await lowerCurtain(code);
  await startTask(code, session.scoreboard, false, id);
}

/** "Show the task": gold, since putting the words up is usually what comes next. Pressed in while they're up; tapping again lowers the curtain. */
function ShowTask({ code, session, task, gold, onShown }: { code: string; session: Session; task: string; gold: boolean; onShown: () => void }) {
  const up = session.display?.step === "tasktext" && session.display.task === task;
  return (
    <button className={[gold && "big", up && "pressed"].filter(Boolean).join(" ") || undefined} aria-pressed={up}
      onClick={() => { if (up) void lowerCurtain(code); else { onShown(); void showTaskText(code, task); } }}>Show the task</button>
  );
}

/** The scores or the haul up while a task's page is open: the way back to the curtain. */
function LowerIfUp({ code, session }: { code: string; session: Session }) {
  const step = session.display?.step;
  return step === "scoreboard" || step === "haul"
    ? <button onClick={() => void lowerCurtain(code)}>Lower the curtain</button> : null;
}

/**
 * One page for every task, live or app game (reached from Run of show): the task as the title, what's on the big
 * screen, gold "Show the task" when it has words, its song and note and the card to read from; then an app game's
 * own controls; then the points, always open, ending in gold "Done" once everyone has them.
 */
export function TaskPage({ code, session, id, onBack, onLight }: {
  code: string; session: Session; id: string; onBack: () => void;
  /** Opens 💡 the light, where its order is marked. */
  onLight: () => void;
}) {
  const board = session.scoreboard;
  const task = board?.tasks?.[id];
  const textOn = session.display?.step === "tasktext" && session.display.task === id;
  // Once the words have been up, the gold moves on to the game's next step.
  const [textSeen, setTextSeen] = useState(textOn);
  if (!task) {
    return (
      <section className="remote task-page">
        <button className="link back" onClick={onBack}>← Run of show</button>
        <p className="muted">This task is no longer on the run of show.</p>
      </section>
    );
  }
  const { place, of } = placeOf(session, id);
  const playing = activeTaskId(session) === id;
  const game = playing ? activeGame(session) : undefined;
  const textFirst = !!task.text && !textSeen && !textOn;
  const startable = task.game && task.game !== "light" && !playing;
  const top = (
    <>
      <button className="link back" onClick={onBack}>← Run of show</button>
      <div className="task-head">
        <h1>{titleOf(task)}</h1>
        <p className="muted">Task {place} of {of} · {task.game ? "app game" : "live task"}</p>
      </div>
      <OnScreen code={code} session={session} />
      <LowerIfUp code={code} session={session} />
      {task.text && <ShowTask code={code} session={session} task={id} gold={!task.game || textFirst} onShown={() => setTextSeen(true)} />}
      {task.song && <SongStrip code={code} session={session} song={task.song} />}
      {task.description && <p className="muted small sb-note">{task.description}</p>}
      {task.text && <TaskTextCard type={typeOf(task)} text={task.text} />}
      {startable && (
        <button className={!scored(task) && !textFirst ? "big" : undefined} onClick={() => void beginTask(code, session, id)}>
          ▶ Start {titleOf(task)}
        </button>
      )}
    </>
  );
  return (
    <section className="remote task-page">
      {game ? <GameControls code={code} session={session} quiet={textFirst} head={top} /> : top}
      <Points code={code} session={session} board={board} onScreen={session.display?.step === "scoreboard"} id={id} onDone={onBack} onLight={onLight} />
    </section>
  );
}

/**
 * A game that's not on the run of show, played ad hoc: the same page with no number and no points. With no game
 * on, it's the picker.
 */
export function AdHocPage({ code, session, onBack }: { code: string; session: Session; onBack: () => void }) {
  const game = activeGame(session);
  const listed = activeTaskId(session);
  const top = (
    <>
      <button className="link back" onClick={onBack}>← Run of show</button>
      <div className="task-head">
        <h1>{game && !listed ? game.name : "Play a game"}</h1>
        <p className="muted">Not on the run of show, so it isn't scored</p>
      </div>
      <OnScreen code={code} session={session} />
      <LowerIfUp code={code} session={session} />
    </>
  );
  if (!game || listed) {
    return (
      <section className="remote task-page">
        {top}
        <div className="steps">
          {PICKER_GAMES.map((g) => <button key={g.id} onClick={() => void setGame(code, g.id)}>{g.name}</button>)}
        </div>
      </section>
    );
  }
  return (
    <section className="remote task-page">
      <GameControls code={code} session={session} head={top} />
      <button className="link" onClick={() => void setGame(code, null)}>End {game.name}</button>
    </section>
  );
}

/**
 * The tiebreaker task's page, opened when the last update leaves a tie: just the tied contestants, and a tap on
 * whoever won. It has one winner and no points, so nobody's total changes, and nothing goes on the big screen from here.
 */
export function TiebreakerPage({ code, session, onBack }: { code: string; session: Session; onBack: () => void }) {
  const board = session.scoreboard;
  const tb = board?.tiebreaker;
  const tied = standing(session)?.tied ?? [];
  const nameOf = (id: string) => board?.contestants?.[id]?.name ?? "";
  const now = standing(session);
  const winner = now && "winner" in now ? now.winner : undefined;
  const won = (id: string) => {
    void setTiebreakerWinner(code, tb?.winner === id ? null : id);
    // Back up to the haul, which is what's next.
    if (tb?.winner !== id) window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return (
    <section className="remote task-page has-bar">
      <button className="link back" onClick={onBack}>← Run of show</button>
      <div className="task-head">
        <h1>{tb?.name || "Tiebreaker task"}</h1>
        <p className="muted">Tiebreaker · {list(tied.map(nameOf))}</p>
      </div>
      <OnScreen code={code} session={session} />
      <LowerIfUp code={code} session={session} />
      {/* Once someone has won, their haul is the one next thing. */}
      {winner && <button className="big" onClick={() => { void showHaul(code); onBack(); }}>🎁 Show the prize haul · {nameOf(winner)}</button>}
      {tb?.text && <ShowTask code={code} session={session} task="tiebreaker" gold={!winner} onShown={() => {}} />}
      {tb?.song && <SongStrip code={code} session={session} song={tb.song} />}
      {tb?.description && <p className="muted small sb-note">{tb.description}</p>}
      {tb?.text && <TaskTextCard type={tb.type || TIEBREAKER_TYPE} text={tb.text} />}
      {/* Fixed to the bottom, so whoever says it first is one tap away however far the story has scrolled. */}
      <div className="sb-won-bar">
        <p className="muted small">Tap who won.</p>
        <ul className="picker running">
          {tied.map((id) => (
            <li key={id} className={tb?.winner === id ? "up" : ""}>
              <button aria-pressed={tb?.winner === id} onClick={() => won(id)}>
                <span>{nameOf(id)}</span>
                <span className="muted small">{tb?.winner === id ? "won the tiebreaker" : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
