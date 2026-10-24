import { useEffect, useState } from "react";
import { placeOf } from "../HostRemote";
import { asList, asNums, fmt } from "../JukeboxRemote";
import { useServerOffset } from "../games/noisemaster/data";
import { activeTaskId, titleOf } from "../scoreboard/tasks";
import type { ClockState, Session } from "../types";
import {
  addMinute, contestantsOf, goingOf, pickEveryone, resetClock, setMode, setSong, setTime, showClock, songIn, startClock, stopClock,
  tapContestant, timesOf, useClock, watchLabel, watchTask, type ClockView,
} from "./data";
import { FlipClock } from "./FlipClock";
import { limitsOf, timeLabel } from "./timesIn";

/** The times the host can pick without typing. */
const QUICK = [60_000, 120_000, 300_000, 600_000];

/**
 * The task the clock is for: the one whose page the host came from, else the one whose words are on the big screen, else the game
 * in progress. Its time limits are the presets, and a stopwatch's times go into it.
 */
function sourceOf(session: Session, from: string | undefined) {
  const tasks = session.scoreboard?.tasks ?? {};
  const shown = session.display?.step === "tasktext" ? session.display.task : undefined;
  const id = [from, shown, activeTaskId(session)].find((t) => !!t && !!tasks[t]);
  return id ? { id, task: tasks[id]! } : undefined;
}

/**
 * ⏱ The clock, on the host's phone: a countdown set from the task's time limit (or any time) or a stopwatch, started and held
 * with one button, and put on the big screen on its own. The clock keeps running wherever the host goes (see ClockStrip).
 * Flipchart's clock, while it runs, is the clock in the party: it shows here, and can only be run from the task.
 */
export function ClockRemote({ code, session, from }: { code: string; session: Session; from?: string }) {
  const view = useClock(session);
  const offset = useServerOffset();
  const state = session.clock;
  const source = sourceOf(session, from);
  const limits = limitsOf(source?.task);
  const up = state?.mode === "up";
  const begun = !!state?.begun;
  const locked = begun || !!view.owner;

  // A different task than the clock was last set for: its time limit (for the part on the big screen) is the time to start with, and its song.
  const partUp = session.display?.step === "tasktext" && session.display.task === source?.id ? session.display.part ?? 0 : 0;
  useEffect(() => {
    if (!source || view.owner || begun || up || state?.task === source.id) return;
    const pick = limits.find((l) => l.part === partUp + 1) ?? limits[0];
    if (pick) void setTime(code, pick.ms, source.id);
    if ((source.task.song ?? null) !== (state?.song ?? null) && (source.task.song || state?.song)) void setSong(code, source.task.song ?? null);
  }, [source?.id, begun, up, view.owner]);

  if (view.owner) {
    return (
      <section className="remote converter clock-remote">
        <h2>⏱ The clock</h2>
        <p className="muted">Flipchart's clock is the one running, on the big screen. Run it from the task.</p>
        <div className="clock-face"><FlipClock ms={view.ms} width="215px" /></div>
      </section>
    );
  }

  const shown = view.shown;
  return (
    <section className="remote converter clock-remote">
      <h2>⏱ The clock</h2>
      <button className={shown ? "pressed-in" : undefined} aria-pressed={shown} onClick={() => void showClock(code, state, !shown)}>Show the clock</button>
      <div className="choices two marks" role="radiogroup" aria-label="Kind of clock">
        <button role="radio" aria-checked={!up} aria-pressed={!up} disabled={locked} onClick={() => void setMode(code, state, false, source?.id)}>Count down</button>
        <button role="radio" aria-checked={up} aria-pressed={up} disabled={locked} onClick={() => void setMode(code, state, true, source?.id)}>Stopwatch</button>
      </div>
      {up
        ? <Stopwatch code={code} session={session} view={view} locked={locked} />
        : <Countdown code={code} session={session} state={state} locked={locked} limits={limits} source={source} />}
      <div className="clock-face"><FlipClock ms={view.ms} up={up} width="215px" /></div>
      <Go code={code} view={view} offset={offset} up={up} session={session} />
      <div className="row fc-round-links">
        {!up && (view.phase === "running" || view.phase === "held") && <button className="link" onClick={() => void addMinute(code, view, offset)}>+1 minute</button>}
        {begun && <button className="link" onClick={() => void resetClock(code, state)}>Reset</button>}
      </div>
    </section>
  );
}

/** One button in one place: gold ▶ Start (and to carry on), pressed-in ⏸ Stop while it runs. */
function Go({ code, view, offset, up, session }: { code: string; view: ClockView; offset: number; up: boolean; session: Session }) {
  const state = session.clock;
  if (view.phase === "running") {
    return <button className="pressed-in clock-go" aria-pressed onClick={() => void stopClock(code, view, offset)}>⏸ Stop</button>;
  }
  const nothing = up ? goingOf(session).length === 0 : (state?.ms ?? 0) <= 0;
  const disabled = !state || view.phase === "done" || (view.phase === "held" && !!state.stopped) || (view.phase === "idle" && nothing);
  return <button className="big" disabled={disabled} onClick={() => void startClock(code, view, offset)}>▶ Start</button>;
}

function Countdown({ code, session, state, locked, limits, source }: {
  code: string; session: Session; state: ClockState | undefined; locked: boolean; limits: ReturnType<typeof limitsOf>; source: ReturnType<typeof sourceOf>;
}) {
  const set = state?.set ?? 0;
  const [min, setMin] = useState("");
  const [sec, setSec] = useState("");
  const typed = (m: string, s: string) => {
    setMin(m); setSec(s);
    const ms = ((parseInt(m, 10) || 0) * 60 + (parseInt(s, 10) || 0)) * 1000;
    if (ms > 0) void setTime(code, ms, source?.id);
  };
  const chosen = (ms: number) => !min && !sec && set === ms;
  return (
    <>
      {source && limits.length > 0 && (
        <>
          <span className="muted">From task {placeOf(session, source.id).place}, {titleOf(source.task)}</span>
          <div className="choices tasks">
            {limits.map((l) => (
              <button key={l.part} className={chosen(l.ms) && state?.task === source.id ? "active" : ""} aria-pressed={chosen(l.ms)} disabled={locked}
                onClick={() => { setMin(""); setSec(""); void setTime(code, l.ms, source.id); }}>
                {timeLabel(l.ms)} {(l.of > 1 || l.said) && <span className="muted">· {l.of > 1 && `part ${l.part}`}{l.of > 1 && l.said && ", "}{l.said && `“${l.said.length > 44 ? `${l.said.slice(0, 42).trim()}…` : l.said}”`}</span>}
              </button>
            ))}
          </div>
        </>
      )}
      <span className="muted">{limits.length ? "Or any time" : "Any time"}</span>
      <div className={`choices units${locked ? " idle" : ""}`}>
        {QUICK.map((ms) => (
          <button key={ms} className={chosen(ms) && !limits.some((l) => l.ms === ms) ? "active" : ""} aria-pressed={chosen(ms)} disabled={locked}
            onClick={() => { setMin(""); setSec(""); void setTime(code, ms, source?.id); }}>{timeLabel(ms)}</button>
        ))}
      </div>
      <div className="feet-in">
        <span>Your own</span>
        <label><input inputMode="numeric" placeholder="3" aria-label="minutes" value={min} disabled={locked} onChange={(e) => typed(e.target.value.replace(/\D/g, "").slice(0, 3), sec)} /> min</label>
        <label><input inputMode="numeric" placeholder="30" aria-label="seconds" value={sec} disabled={locked} onChange={(e) => typed(min, e.target.value.replace(/\D/g, "").slice(0, 2))} /> sec</label>
      </div>
      <ClockSong code={code} session={session} state={state} set={set} />
    </>
  );
}

/** "♪ Ends on: title · 0:32": the song that finishes on 0:00, picked from the jukebox's list as the main screen last read it. */
function ClockSong({ code, session, state, set }: { code: string; session: Session; state: ClockState | undefined; set: number }) {
  const [open, setOpen] = useState(false);
  const tracks = asList(session.jukebox?.tracks);
  const durations = asNums(session.jukebox?.durations);
  const song = songIn(session, state?.song);
  if (!state?.song && tracks.length === 0) return <p className="muted small">Open the music folder on the main screen once to pick a song that ends on 0:00.</p>;
  const how = !song ? "" : song.ms === 0 ? "Starts with the clock."
    : song.ms > set ? "Longer than the clock: starts with it and plays on." : `Plays on the big screen from ${fmt(song.ms / 1000)} left, so it finishes on 0:00.`;
  return (
    <>
      {state?.song ? (
        <div className="summary-line">
          <span>{song ? "♪ Ends on:" : <s>♪</s>} {state.song}{song && song.ms > 0 && ` · ${fmt(song.ms / 1000)}`}</span>
          <span className="summary-links">
            <button className="link" disabled={!!state.begun} onClick={() => setOpen(!open)}>Change</button>
            <button className="link x" aria-label="No song" disabled={!!state.begun} onClick={() => { setOpen(false); void setSong(code, null); }}>✕</button>
          </span>
        </div>
      ) : (
        <button type="button" className="chip-add" onClick={() => setOpen(!open)}>+ Song to end on</button>
      )}
      {state?.song && !song && <p className="muted small">Not in the music folder any more. Pick another, or ✕.</p>}
      {state?.song && song && <p className="muted small">{how}</p>}
      {open && (
        <ul className="tracklist">
          {tracks.map((t, n) => (
            <li key={n}>
              <button type="button" className={t === state?.song ? "active" : ""} onClick={() => { setOpen(false); void setSong(code, t); }}>
                <span className="title">{t === state?.song ? "♪ " : ""}{t}</span>
                <span className="dur">{fmt(durations[n])}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Who's going, as chips: pick them, then tap each as they finish. A time stays on the chip, and a tap on it takes it back. */
function Stopwatch({ code, session, view, locked }: { code: string; session: Session; view: ClockView; locked: boolean }) {
  const state = session.clock;
  const times = timesOf(session);
  const going = goingOf(session);
  const task = watchTask(session);
  const named = task ? session.scoreboard!.tasks![task]! : undefined;
  const pickable = !locked || view.phase === "held" && !!state?.stopped;
  return (
    <>
      <span className="muted">
        {named ? `Times go into task ${placeOf(session, task!).place}, ${titleOf(named)} · lowest wins` : "Times stay on this page."}
      </span>
      <div className="clock-who">
        <span className="muted">Who's going · tap them as they finish</span>
        {Object.keys(state?.going ?? {}).length > 0 && pickable && <button className="link" onClick={() => void pickEveryone(code)}>Everyone</button>}
      </div>
      <div className="choices clock-chips">
        {contestantsOf(session).map((c) => {
          const timed = times[c.id] !== undefined;
          const on = going.includes(c.id) && !timed;
          const idle = !timed && !on;
          return (
            <button key={c.id} className={on ? "active" : timed ? "timed" : idle && view.phase === "running" ? "idle" : ""} aria-pressed={on}
              disabled={idle && view.phase === "running"}
              onClick={() => void tapContestant(code, session, view, c.id)}>
              {c.name}{timed && <span className="muted"> · {watchLabel(times[c.id]!)}</span>}
            </button>
          );
        })}
      </div>
    </>
  );
}
