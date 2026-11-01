import { Fragment, useState } from "react";
import { formatTime } from "../games/noisemaster/data";
import { ReadOut } from "../conversions/ReadOut";
import type { Scoreboard, Session } from "../types";
import { enterPoints, type TaskEntry } from "./data";
import { LockedLine, LockState, useTaskLock } from "./partyLock";
import { bonusOf, isMeasured, LO, ordinal, overLine, parseClock, targetOf, workOut } from "./measured";
import { currentTotals } from "./scoring";
import { allScored, LIGHT, list, plural } from "./tasks";

/**
 * Giving points for one task, always open at the bottom of its page. By hand: a row of chips per contestant.
 * Measured: a box for each contestant's number, and the points by place. Every tap saves; nothing goes on the
 * big screen. Once everyone has points, gold "Done" goes back to Run of show, where the next task and the
 * choice to show the scores are waiting. On a locked party the chips fade back to the points given, and a tap says
 * so under that row instead of changing anything (see partyLock).
 */
export function Points({ code, session, board, onScreen, id, onDone, onLight }: {
  code: string; session: Session; board: Scoreboard | undefined; onScreen: boolean; id: string; onDone: () => void;
  /** Opens 💡 the light, where its order is marked. */
  onLight: () => void;
}) {
  const contestants = Object.entries(board?.contestants ?? {}).sort(([, a], [, b]) => a.order - b.order);
  const task = board!.tasks![id]!;
  const totals = currentTotals(board);
  const worked = workOut(task);
  const measured = isMeasured(task);
  const timed = task.game === "noisemaster";
  const loud = task.unit?.kind === "loudness";
  // The light's order comes from 💡, where it's marked: here it's only shown.
  const light = task.game === "light";
  // The snake and the duck: one rank wins, measured from the drawings (see ranked.ts).
  const target = targetOf(task);
  const unit = task.unit?.name ?? (target === "second" ? "in" : target === "median" ? "sq in" : undefined);
  // Whose number was typed last, for "Read it out".
  const [last, setLast] = useState<string>();
  const lock = useTaskLock();
  // Whose row was tapped while locked: the line under it says why nothing changed.
  const [tapped, setTapped] = useState<string>();
  const enter = (entry: TaskEntry) => {
    const typed = Object.entries(entry.results ?? {}).find(([, n]) => n !== null)?.[0];
    if (typed) setLast(typed);
    void enterPoints(code, board, onScreen, id, entry);
  };
  const nameOf = (c: string) => board?.contestants?.[c]?.name ?? "";
  const stays = (c: string) => task.dq?.[c] ? `${nameOf(c)}'s DQ stays`
    : worked.points[c] !== undefined ? `${nameOf(c)} stays on ${worked.points[c]}` : `${nameOf(c)} stays without points`;
  const onEnterFor = (c: string): EntryFor => (entry) => lock.locked ? setTapped(c) : enter(entry(c));
  // The DQs that change anyone else's points: those with points or a number of their own.
  const outs = contestants.map(([c]) => c).filter((c) => task.dq?.[c] && (measured ? task.results?.[c] : (task.given ?? task.scores)?.[c]) !== undefined);
  const before = Object.keys(worked.before).length > 0;
  const status = light
    ? `Fastest wins · order from the light · ${contestants.filter(([c]) => task.results?.[c] !== undefined).length} of ${contestants.length} got it`
    : measured
    ? `${timed ? "Fastest wins · times from the soundboard" : target === "second" ? "Second longest wins · lengths from the rolls"
      : target === "median" ? "The median wins · sizes from the pages" : task.scoring === "lowest" ? "Lowest wins" : "Highest wins"}${
      loud && task.dqOver !== undefined ? ` · over ${task.dqOver} dB is a DQ` : ""} · ${
      contestants.filter(([c]) => task.results?.[c] !== undefined || task.dq?.[c]).length} of ${contestants.length} ${timed ? "played" : "measured"}`
    : `${contestants.filter(([c]) => worked.points[c] !== undefined).length} of ${contestants.length} scored`;
  const bonuses = contestants.reduce((n, [c]) => n + bonusOf(task, c), 0);

  // Secret Tasks scores itself: the reveal works the points out, and they land here when the host lowers the curtain.
  if (task.game === "secretTasks") {
    return (
      <section className="sb-points">
        <h2>Points</h2>
        <p className="muted small">{status} · from the reveal, when you lower the curtain<LockState /></p>
        {allScored(board, task) && <button className="big" onClick={onDone}>Done: back to Run of show →</button>}
      </section>
    );
  }
  if (!contestants.length) {
    return <section className="sb-points"><h2>Points</h2><p className="muted small">No contestants yet. Add them on Plan the party.</p></section>;
  }
  return (
    <section className={lock.locked ? "sb-points locked" : "sb-points"}>
      <h2>Points</h2>
      <p className="muted small">{status}{bonuses > 0 && ` · ${plural(bonuses, "bonus point", "bonus points")}`}<LockState /></p>
      {outs.length > 0 && worked.moved > 0 && (
        <p className="muted small sb-dq-line">
          {list(outs.map(nameOf))}'s {outs.length === 1 ? "DQ" : "DQs"}{" "}
          {task.dqStays ? <>{outs.length === 1 ? "doesn't" : "don't"} move anyone.{!lock.locked && <> <button className="link" onClick={() => enter({ dqStays: null })}>Move them up</button></>}</>
            : <>moved {plural(worked.moved, "person", "people")} up.{!lock.locked && <> <button className="link" onClick={() => enter({ dqStays: true })}>Don't move them</button></>}</>}
        </p>
      )}
      <ul className={measured ? "sb-rows sb-measured" : "sb-rows"}>
        {contestants.map(([c, con]) => <Fragment key={c}>{measured
          ? <MeasuredRow name={con.name} total={totals[c] ?? 0} timed={timed} light={light} unit={unit}
              lo={loud && task.scoring === "lowest"} over={task.overDq?.[c] ? task.dqOver : undefined}
              line={loud ? (reading) => overLine(task, c, reading) : undefined}
              result={task.results?.[c]} restarts={task.restarts?.[c]} dq={!!task.dq?.[c]} given={task.given?.[c]} bonus={bonusOf(task, c)}
              points={worked.points[c]} auto={worked.auto[c]} place={worked.place[c]} before={worked.before[c]} onEnter={onEnterFor(c)}
              locked={lock.locked} onLocked={() => setTapped(c)} />
          : <PointsRow name={con.name} total={totals[c] ?? 0} points={worked.points[c]} given={(task.given ?? task.scores)?.[c]}
              dq={!!task.dq?.[c]} bonus={bonusOf(task, c)} before={worked.before[c]} onEnter={onEnterFor(c)} />}
          {lock.locked && tapped === c && <li className="sb-locked"><LockedLine what={stays(c)} /></li>}
        </Fragment>)}
      </ul>
      {before && <p className="muted small sb-before-key"><span className="sb-before" aria-hidden="true" /> before the DQ</p>}
      {light && <p className="muted small">Change the order on <button className="link" onClick={onLight}>{LIGHT}</button>.</p>}
      {measured && task.unit && !light && <ReadOut code={code} session={session} board={board} id={id} last={last} />}
      {allScored(board, task) && <button className="big" onClick={onDone}>Done: back to Run of show →</button>}
    </section>
  );
}

/** One contestant's entry, made for them: `(c) => ({ given: { [c]: 3 } })`. */
type EntryFor = (entry: (c: string) => TaskEntry) => void;
const one = <T,>(c: string, v: T) => ({ [c]: v });

const CHIPS = [1, 2, 3, 4, 5];

/**
 * The +1 at the end of a points row: bonus points on top of whatever they scored. Each tap goes +1, +2, then
 * none, so a task with two bonus points needs no other chip. A DQ keeps them.
 */
function BonusChip({ name, bonus, onEnter }: { name: string; bonus: number; onEnter: EntryFor }) {
  const next = bonus >= 2 ? null : bonus + 1;
  return (
    <div className="choices marks sb-bonus">
      <button aria-pressed={bonus > 0} aria-label={`Bonus points for ${name}: ${bonus}. Tap for ${next ?? "none"}`}
        onClick={() => onEnter((c) => ({ bonus: one(c, next) }))}>+{bonus || 1}</button>
    </div>
  );
}

/**
 * One contestant on a by-hand task: DQ by the name, then 1 to 5, and +1 (or +2) for bonus points on top. Tapping the
 * pressed chip takes the points away. A DQ keeps the points they were given, struck through; a dashed chip
 * is what they had before someone else's DQ moved them up. Points typed in before there was a bonus (0, 6, 2.5)
 * show as one more pressed chip, until tapped away.
 */
function PointsRow({ name, total, points, given, dq, bonus, before, onEnter }: {
  name: string; total: number; points?: number; given?: number; dq: boolean; bonus: number; before?: number; onEnter: EntryFor;
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
 * with the place under them, then +1 (or +2) for bonus points. Tapping the points opens the chips, to set them by hand;
 * a point set by hand sticks. On a dB task, `line` is what its DQ line makes of a reading (see overLine), `over` the
 * line they went over, and `lo` offers LO, under the box while it's being typed in.
 */
function MeasuredRow({ name, total, timed, light, unit, lo, over, line, result, restarts, dq, given, bonus, points, auto, place, before, onEnter, locked, onLocked }: {
  name: string; total: number; timed: boolean; light: boolean; unit?: string; lo?: boolean; over?: number; line?: (reading: number | undefined) => Omit<TaskEntry, "results">;
  result?: number; restarts?: number; dq: boolean; given?: number; bonus: number; points?: number; auto?: number; place?: number; before?: number; onEnter: EntryFor;
  /** A locked party: the box can't be typed in, and tapping it says why. */
  locked: boolean; onLocked: () => void;
}) {
  const format = (n: number) => timed ? formatTime(n) : n === LO ? "LO" : String(n);
  const [typing, setTyping] = useState<string>();
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const enterResult = (n: number | undefined) => onEnter((c) => ({ results: one(c, n ?? null), ...line?.(n) }));
  const type = (text: string) => {
    setTyping(text);
    const n = timed ? parseClock(text) : parseFloat(text.replace(",", "."));
    if (text.trim() === "") enterResult(undefined);
    else if (n !== undefined && Number.isFinite(n)) enterResult(n);
  };
  const give = (n: number | null) => onEnter((c) => ({ given: one(c, n) }));
  const overridden = given !== undefined && !dq;
  const autoLine = auto !== undefined && place !== undefined ? `${auto} for ${ordinal(place)}` : undefined;
  return (
    <li className={dq ? "dq" : undefined}>
      <div className="sb-measure">
        <span className="sb-name">{name}<span className="muted small sb-now">now {total}</span></span>
        <div className="choices marks sb-dq">
          <button aria-pressed={dq} aria-label={`Disqualify ${name}`} onClick={() => { setOpen(false); onEnter((c) => ({ dq: one(c, dq ? null : true), overDq: one(c, null) })); }}>DQ</button>
        </div>
        {light ? <span className={`sb-got${result === undefined ? " muted" : ""}`}>{result === undefined ? "not yet" : `got it ${ordinal(result)}`}</span> : (
          <input className="sb-result" type="text" inputMode="decimal" value={typing ?? (result === undefined ? "" : format(result))}
            placeholder={timed ? "not played" : "—"} aria-label={`${name}'s ${timed ? "time" : unit ?? "result"}`}
            readOnly={locked} onChange={(e) => type(e.target.value)} onFocus={() => locked ? onLocked() : setFocused(true)}
            onBlur={() => { setTyping(undefined); setFocused(false); }} />
        )}
        <span className="sb-unit muted">{timed ? (restarts !== undefined ? `↺ ${restarts}` : "") : unit ?? ""}</span>
        {points !== undefined
          ? <button className={`sb-pts${open ? " open" : ""}`} aria-expanded={open} aria-label={`${name}'s points: ${points}. Change them`}
              disabled={dq} onClick={() => setOpen(!open)}>
              <b>{points}{overridden && <span className="sb-hand">✎</span>}{before !== undefined && <span className="sb-before">{before}</span>}</b>
              <span className="small">{dq ? (over !== undefined ? `over ${over}` : "DQ") : place !== undefined ? ordinal(place) : ""}</span>
            </button>
          : <span />}
        <BonusChip name={name} bonus={bonus} onEnter={onEnter} />
      </div>
      {lo && focused && (
        <div className="sb-override sb-lo">
          {/* On pointer down, so the box doesn't lose focus (and this go away) before the tap lands. */}
          <div className="choices marks sb-chips">
            <button aria-label={`LO for ${name}`} onPointerDown={(e) => { e.preventDefault(); setTyping(undefined); enterResult(LO); }}>LO</button>
          </div>
          <span className="muted small">The meter shows LO: quieter than it can read. Everyone on LO ties.</span>
        </div>
      )}
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

