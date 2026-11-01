import { Fragment, useContext, useState } from "react";
import { GameControls, OnScreen, placeOf } from "../HostRemote";
import { GAMES, PICKER_GAMES, activeGame } from "../games";
import { DRAW_GAMES, type DrawGame } from "../games/drawGames";
import { ROUNDS } from "../games/rounds";
import { switchPhotosTask } from "../games/photos/data";
import { showHaul, standing } from "../games/prize/data";
import { PrizesBefore } from "../games/prize/HostControls";
import { setGame } from "../session";
import { SongStrip } from "../SongStrip";
import { OpenClock } from "../clock/ClockStrip";
import { contestantsOf, pickNext, startFromTask, takeTurns, useClock } from "../clock/data";
import { limitsOf, timeLabel } from "../clock/timesIn";
import { useServerOffset } from "../games/noisemaster/data";
import { ReplayStrip } from "./ReplayStrip";
import type { GameId, Session } from "../types";
import { lockedAt, lowerCurtain, setTiebreakerWinner, showOnPhones, showTaskText, startSting, startTask, takeDownPhones } from "./data";
import { Points } from "./Points";
import { LockedLine, TaskLockContext, type TaskLock } from "./partyLock";
import { activeTaskId, list, scored, titleOf } from "./tasks";
import { partsOf, TaskTextCard, tiebreakerWords, typeOf } from "./TaskText";

/**
 * Starts a task from Run of show or its page: the scores come down if they're up, the task before it is caught
 * up on the scoreboard (see startTask), and an app game goes on, bringing its photos if it's a photo task, or settling
 * a drawing task's round from before (see settleOldRound). A live task ends any game still on, so the big screen goes back
 * to the curtain.
 */
export async function beginTask(code: string, session: Session, id: string) {
  const task = session.scoreboard?.tasks?.[id];
  if (!task) return;
  const step = session.display?.step;
  if (task.game && task.game !== "light") {
    await startTask(code, session.scoreboard, false, id);
    if (task.game === "photos") await switchPhotosTask(code, session, id);
    if (isDrawGame(task.game)) await ROUNDS[task.game].settleOldRound(code, session, !wipeDrawings(session, task.game));
    await setGame(code, task.game as GameId);
  } else {
    if (session.game) await setGame(code, null);
    else if (step === "scoreboard" || step === "haul") await lowerCurtain(code);
    await startTask(code, session.scoreboard, false, id);
  }
  // Last, so the sting starts over what starting the task put up. Only when the main screen has its music folder open to play it.
  if ((task.transition || task.transitionImage || task.transitionVideo) && session.jukebox?.open) {
    await startSting(code, id, session.jukebox.state?.playing === true);
  }
}

const isDrawGame = (g: string): g is DrawGame => (DRAW_GAMES as readonly string[]).includes(g);

/** A drawing task's Start, over a round from before with drawings in it: asks before they're wiped (Cancel keeps them for the reveal). */
function wipeDrawings(session: Session, game: DrawGame) {
  const round = ROUNDS[game];
  const names = round.drewIn(session).map((uid) => session.players?.[uid]?.name).filter((n): n is string => !!n);
  if (!round.roundOver(session) || !names.length) return false;
  return confirm(`Start ${GAMES[game].name} fresh? ${list(names)} drew in the last round. ${names.length === 1 ? "Their drawing" : "Their drawings"} will be wiped.`);
}

/** "Show the task": gold, since putting the words up is usually what comes next. Pressed in while they're up; tapping again lowers the curtain. */
function ShowTask({ code, session, task, part = 0, gold, onShown }: { code: string; session: Session; task: string; part?: number; gold: boolean; onShown: () => void }) {
  const up = session.display?.step === "tasktext" && session.display.task === task && (session.display.part ?? 0) === part;
  return (
    <button className={[gold && "big", up && "pressed"].filter(Boolean).join(" ") || undefined} aria-pressed={up}
      onClick={() => { if (up) void lowerCurtain(code); else { onShown(); void showTaskText(code, task, part); } }}>Show the task</button>
  );
}

/**
 * A live task (or the tiebreaker): two rows of radio buttons, one for the big screen and one for the phones, each choosing nothing or
 * one part (each can be set apart from the other), then the cards to read from. Chosen is pressed in, never gold, since
 * putting a part up (or none) is the host's choice. "Part N" is for the host: the cards, the big screen and the phones never say it.
 */
function PartCards({ code, session, task, parts, phones }: { code: string; session: Session; task: string; parts: { type: string; text: string }[]; phones: boolean }) {
  const d = session.display;
  const stage = d?.step === "tasktext" && d.task === task ? d.part ?? 0 : undefined;
  const phone = session.phoneText?.task === task ? session.phoneText.part ?? 0 : undefined;
  return (
    <>
      <PartPick label="Big screen" up={stage} count={parts.length}
        onPick={(i) => { if (i !== undefined) void showTaskText(code, task, i); else if (stage !== undefined) void lowerCurtain(code); }} />
      {phones && <PartPick label="Phones" up={phone} count={parts.length}
        onPick={(i) => void (i === undefined ? takeDownPhones(code) : showOnPhones(code, task, i))} />}
      {parts.map((p, i) => (
        <Fragment key={i}>
          <TaskTextCard type={p.type} text={p.text} />
          <StartClock code={code} session={session} id={task} part={i + 1} />
        </Fragment>
      ))}
    </>
  );
}

/** One row of radio buttons on one line: Nothing, Part 1, Part 2… (or Nothing, The task when there's one part) The chosen one is pressed in (`.choices.marks`). */
function PartPick({ label, up, count, onPick }: { label: string; up: number | undefined; count: number; onPick: (part: number | undefined) => void }) {
  const options: [string, number | undefined][] = [["Nothing", undefined], ...Array.from({ length: count }, (_, i): [string, number] => [count === 1 ? "The task" : `Part ${i + 1}`, i])];
  return (
    <div className="part-pick" role="radiogroup" aria-label={label}>
      <span className="part-pick-label">{label}</span>
      <div className="choices marks">
        {options.map(([name, part]) => (
          <button type="button" key={name} role="radio" aria-checked={up === part} onClick={() => onPick(part)}>{name}</button>
        ))}
      </div>
    </div>
  );
}

/**
 * A live task with a time limit: "▶ Start the clock · 5 min" under its words, which puts the clock on the big screen and starts
 * it in one press, whatever the clock was doing. Always gold: the task may be on paper, so it never waits for the words to be up.
 * Gone while this task's clock counts (the strip above has it); back once it's held (someone finished early: the next press
 * starts afresh, while the strip's ▶ carries on) or done. A task in parts has one under each part's card that has a time.
 * "One player at a time?" makes it name whose turn it is, with the contestants as chips to pick who's next. A live task
 * with no time anywhere has just a quiet "⏱ Time this task" into ⏱.
 */
function StartClock({ code, session, id, part = 1 }: { code: string; session: Session; id: string; part?: number }) {
  const view = useClock(session);
  const offset = useServerOffset();
  const task = session.scoreboard?.tasks?.[id];
  const open = useContext(OpenClock);
  const limit = limitsOf(task).find((l) => l.part === part);
  if (!task || task.game) return null;
  // No time in the words or ✎: a quiet way into ⏱, set up for this task. Once, under the last card.
  if (!limit) return part === Math.max(1, partsOf(task).length) && !limitsOf(task).length
    ? <button className="link" onClick={open}>⏱ Time this task</button> : null;
  if (view.owner || (session.clock?.task === id && view.phase === "running")) return null;
  const turns = session.clock?.turns;
  if (turns?.task === id && turns.part === part) {
    const took = turns.took ?? {};
    const people = contestantsOf(session);
    const next = people.find((c) => c.id === turns.next) ?? people.find((c) => !took[c.id]);
    return (
      <>
        {next
          ? <button className="big" onClick={() => void startFromTask(code, session.clock, limit.ms, id, offset, next.id)}>▶ Start {next.name}'s turn · {timeLabel(limit.ms)}</button>
          : <p className="muted">Everyone has had a turn.</p>}
        <span className="muted small">Who's next · tap to change</span>
        <div className="choices clock-chips">
          {people.map((c) => (
            <button key={c.id} className={c.id === next?.id ? "active" : took[c.id] ? "timed" : ""} aria-pressed={c.id === next?.id}
              onClick={() => void pickNext(code, c.id, !!took[c.id])}>
              {c.name}{took[c.id] && <span className="muted"> · ✓</span>}
            </button>
          ))}
        </div>
        <button className="link" onClick={() => void takeTurns(code, id, part, false)}>Not taking turns</button>
      </>
    );
  }
  return (
    <>
      <button className="big" onClick={() => void startFromTask(code, session.clock, limit.ms, id, offset)}>
        ▶ Start the clock · {timeLabel(limit.ms)}
      </button>
      <p className="muted small">Puts it on the big screen. <button className="link" onClick={() => void takeTurns(code, id, part, true)}>One player at a time?</button></p>
    </>
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
 * screen, "Show the task" (gold for an app game; a live task has radio rows) when it has words, its song and note and the card to read from; then an app game's
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
  // A locked party: this task unlocked on this page only (leaving it locks it again), and a tap on Start while locked.
  const [unlocked, setUnlocked] = useState<string>();
  const [startTapped, setStartTapped] = useState(false);
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
  const parts = partsOf(task);
  // A live task puts its words up by radio rows, never gold (it's the host's choice); only an app game has the gold "Show the task".
  const rows = !task.game && parts.length > 0;
  // Secret Tasks is the reveal: its words are on paper or the guests' phones already, so only Part 2 (the reveal's) can go up, never gold.
  const secret = task.game === "secretTasks";
  // The fruit selfie puts its two parts up itself, part 1 before anyone knows why (see its Round): no "Show the task".
  const ownParts = task.game === "fruit";
  const textFirst = !secret && !ownParts && !!task.text && !rows && !textSeen && !textOn;
  const startable = task.game && task.game !== "light" && !playing;
  const partyLocked = lockedAt(board) !== undefined;
  const lock: TaskLock = {
    locked: partyLocked && unlocked !== id,
    open: partyLocked && unlocked === id,
    title: titleOf(task),
    unlock: () => {
      if (confirm(`Unlock ${titleOf(task)}? Its points${task.game ? " and entries" : ""} can change until you leave this page. The rest of the party stays locked.`)) setUnlocked(id);
    },
    relock: () => setUnlocked(undefined),
  };
  const top = (
    <>
      <button className="link back" onClick={onBack}>← Run of show</button>
      <div className="task-head">
        <h1>{titleOf(task)}</h1>
        <p className="muted">Task {place} of {of} · {task.game ? "app task" : "live task"}</p>
      </div>
      {/* A drawing task's own page has its clock already (the strip would say the same twice). */}
      <OnScreen code={code} session={session} noClock={!!task.game && isDrawGame(task.game)} />
      <LowerIfUp code={code} session={session} />
      {secret ? parts.length > 1 && <ShowTask code={code} session={session} task={id} part={1} gold={false} onShown={() => setTextSeen(true)} />
        : task.text && !rows && !ownParts && <ShowTask code={code} session={session} task={id} gold={textFirst} onShown={() => setTextSeen(true)} />}
      <ReplayStrip code={code} session={session} id={id} task={task} />
      {task.song && <SongStrip code={code} session={session} song={task.song} />}
      {task.description && <p className="muted small sb-note">{task.description}</p>}
      {task.text && !rows && !secret && !ownParts && <TaskTextCard type={typeOf(task)} text={task.text} />}
      {ownParts && parts.map((p, i) => <TaskTextCard key={i} type={p.type} text={p.text} />)}
      {rows && <PartCards code={code} session={session} task={id} parts={parts} phones />}
      {!rows && <StartClock code={code} session={session} id={id} />}
      {startable && (
        <button className={!scored(task) && !textFirst && !lock.locked ? "big" : undefined}
          onClick={() => lock.locked ? setStartTapped(true) : void beginTask(code, session, id)}>
          ▶ Start {titleOf(task)}
        </button>
      )}
      {startable && lock.locked && startTapped && <LockedLine what={`${titleOf(task)} stays as it ended`} to="start it again" />}
      {task.game === "prize" && !playing && <PrizesBefore code={code} session={session} />}
    </>
  );
  return (
    <TaskLockContext.Provider value={lock}>
      <section className="remote task-page">
        {game ? <GameControls code={code} session={session} quiet={textFirst} head={top} /> : top}
        <Points code={code} session={session} board={board} onScreen={session.display?.step === "scoreboard"} id={id} onDone={onBack} onLight={onLight} />
      </section>
    </TaskLockContext.Provider>
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
        <h1>{game && !listed ? game.name : "Play a task"}</h1>
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
  const tbParts = partsOf(tb && tiebreakerWords(tb));
  // On a locked party the winner stays: a tap says so (the tiebreaker has no lock of its own; the party unlocks on Run of show).
  const locked = lockedAt(board) !== undefined;
  const [tapped, setTapped] = useState(false);
  const won = (id: string) => {
    if (locked) { setTapped(true); return; }
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
      {tb?.song && <SongStrip code={code} session={session} song={tb.song} />}
      {tb?.description && <p className="muted small sb-note">{tb.description}</p>}
      {tbParts.length > 0 && <PartCards code={code} session={session} task="tiebreaker" parts={tbParts} phones />}
      {/* Fixed to the bottom, so whoever says it first is one tap away however far the story has scrolled. */}
      <div className="sb-won-bar">
        {locked && tapped
          ? <p className="muted small">🔒 The party is completed, so {tb?.winner ? `the tiebreaker stays with ${nameOf(tb.winner)}` : "the tiebreaker stays as it is"}. Unlock the party on <button className="link" onClick={onBack}>Run of show</button> to change it.</p>
          : <p className="muted small">Tap who won.</p>}
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
