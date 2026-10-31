import { useEffect, useRef, useState, type ReactNode } from "react";
import { limitIn, timeLabel } from "../clock/timesIn";
import { endSting } from "../session";
import { draftOf, unitOf, UnitField } from "../conversions/UnitField";
import { asList, asNums, fmt } from "../JukeboxRemote";
import { DEFAULT_DRAW, MINUTES, drawOf, editFlipchart, flipchartWords, minutesOf } from "../games/flipchart/data";
import { DEFAULT_DRAW as ACETATE_DRAW, acetateWords, drawOf as acetateDrawOf, editAcetate } from "../games/acetate/data";
import { SongField } from "../SongStrip";
import type { ScoreboardTask, Session } from "../types";
import { editTask, editTiebreaker, lockedAt, setCheckinTask, editTransition, enterPoints, removeTask, setScoring, type TaskEntry } from "./data";
import { isMeasured, overLine } from "./measured";
import { asParts, gameName, scored, titleOf } from "./tasks";
import { TaskTextField, TaskTypeField, TIEBREAKER_TYPE, typeOf } from "./TaskText";
import { Toggle } from "../Toggle";
import { bare, TransitionField, type TransitionDraft } from "./TransitionField";

/** A task's words are at most this many parts (what the database rules allow). */
const MAX_PARTS = 10;

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
        {scoring ? `Type each result on the task's page: 5 for the ${scoring === "highest" ? "most" : "least"}, then 4, 3, 2, and 1 for everyone else. DQ gets 0.`
          : "Tap each contestant's points on the task's page. DQ gets 0."}
      </p>
    </div>
  );
}

/**
 * "Time limit (optional)" under a part's words: minutes and seconds, as ⏱'s "Your own". Empty, the boxes show the
 * time the words give (greyed) and the line says ⏱ reads it from them; set, it wins, and the line says what ⏱ offers.
 * `part` is the part's place when there are several.
 */
function TimeLimitField({ limit, text, part, onChange }: { limit?: number; text: string; part?: number; onChange: (limit: number | undefined) => void }) {
  const [min, setMin] = useState(limit ? String(Math.floor(limit / 60_000)) : "");
  const [sec, setSec] = useState(limit && limit % 60_000 ? String(Math.round((limit % 60_000) / 1000)) : "");
  const typed = (m: string, s: string) => {
    setMin(m); setSec(s);
    const ms = (Number(m || 0) * 60 + Number(s || 0)) * 1000;
    onChange(ms >= 1000 ? ms : undefined);
  };
  const found = limitIn(text);
  const s = found && Math.round(found.ms / 1000);
  const which = part ? `part ${part}` : "this task";
  return (
    <div className="time-limit">
      <span>Time limit (optional)</span>
      <label><input inputMode="numeric" placeholder={s ? String(Math.floor(s / 60)) : "0"} aria-label="Time limit, minutes" value={min}
        onChange={(e) => typed(e.target.value.replace(/\D/g, "").slice(0, 3), sec)} /> min</label>
      <label><input inputMode="numeric" placeholder={s ? String(s % 60) : "0"} aria-label="Time limit, seconds" value={sec}
        onChange={(e) => typed(min, e.target.value.replace(/\D/g, "").slice(0, 2))} /> sec</label>
      <p className="muted small">
        {limit ? `⏱ offers ${timeLabel(limit)} for ${which}.`
          : found ? `Empty, so ⏱ reads it from the words: ${timeLabel(found.ms)}, “${found.said}”`
          : `Empty: ⏱ offers no time for ${which}.`}
      </p>
    </div>
  );
}

/**
 * An optional part of a task: once it's set it's one summary line with "Change", which opens just that part in
 * place (one at a time, so the page stays short), with ✕ to clear it. Not yet set, it's a "+" chip instead.
 */
/** "♪ Task fanfare · 0:08 · 🖼 Dice tower", or "▶ Drumroll cam · 0:12". */
function transitionSummary(session: Session, t: TransitionDraft): string {
  const jukebox = session.jukebox;
  const len = (list: unknown, lengths: unknown, v: string) => { const n = asNums(lengths)[asList(list).indexOf(v)]; return n ? ` · ${fmt(n)}` : ""; };
  if (t.video) return `▶ ${bare(t.video)}${len(jukebox?.transitionVideos, jukebox?.transitionVideoDurations, t.video)}`;
  return [t.music && `♪ ${t.music}${len(jukebox?.transitions, jukebox?.transitionDurations, t.music)}`, t.picture && `🖼 ${bare(t.picture)}`].filter(Boolean).join(" · ");
}

function Extra({ label, summary, open, onOpen, onClose, onClear, children }: {
  label: string; summary?: ReactNode; open: boolean; onOpen: () => void; onClose: () => void; onClear: () => void; children: ReactNode;
}) {
  if (!open) {
    return summary
      ? <div className="summary-line"><span>{summary}</span><button type="button" className="link" onClick={onOpen}>Change</button></div>
      : <button type="button" className="chip-add" onClick={onOpen}>+ {label}</button>;
  }
  return (
    <section className="extra-open">
      {children}
      <div className="row">
        <button type="button" onClick={onClose}>Done</button>
        {summary && <button type="button" className="link" onClick={onClear}><span className="link-icon">✕</span>Remove {label.toLowerCase()}</button>}
      </div>
    </section>
  );
}

/**
 * A task's ✎ page, its own page so the list never jumps and the form is never squeezed between rows. Always
 * there: the name, the note and, for a live task, how it's scored. Everything optional (the task's words, its
 * song, what it's measured in) is a summary line once set, and a "+" chip until then. Save is gold, Cancel quiet.
 * `id` is a task's id, or "tiebreaker".
 */
export function TaskEditPage({ code, session, id, onBack }: { code: string; session: Session; id: string; onBack: () => void }) {
  const board = session.scoreboard;
  const tiebreaker = id === "tiebreaker";
  const task: ScoreboardTask | undefined = tiebreaker
    ? { order: 0, name: board?.tiebreaker?.name ?? "Tiebreaker task", description: board?.tiebreaker?.description, song: board?.tiebreaker?.song, type: board?.tiebreaker?.type, text: board?.tiebreaker?.text, limit: board?.tiebreaker?.limit, parts: board?.tiebreaker?.parts }
    : board?.tasks?.[id];
  const [name, setName] = useState(task?.name ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [song, setSong] = useState(task?.song ?? "");
  const [type, setType] = useState(task?.type ?? "");
  const [text, setText] = useState(task?.text ?? "");
  const [limit, setLimit] = useState(task?.limit);
  // Parts 2, 3…: each with a key of its own, so removing one in the middle doesn't hand its boxes to the next.
  const [parts, setParts] = useState(() => asParts(task?.parts).map((p, k) => ({ k, type: p.type ?? "", text: p.text, limit: p.limit })));
  const nextKey = useRef(parts.length);
  const [unit, setUnit] = useState(() => draftOf(task?.unit));
  const [scoring, setScoringDraft] = useState(task?.scoring);
  const [dqOver, setDqOver] = useState(task?.dqOver === undefined ? "" : String(task.dqOver));
  const [draw, setDraw] = useState(task?.draw ?? "");
  const [minutes, setMinutes] = useState(minutesOf(task));
  const [transition, setTransition] = useState<TransitionDraft>({ music: task?.transition ?? "", picture: task?.transitionImage ?? "", video: task?.transitionVideo ?? "" });
  const [checkin, setCheckin] = useState(!!task?.checkin);
  const [open, setOpen] = useState<"text" | "song" | "transition" | "unit">();
  // A "Try it" still on when the host leaves this page (Save, Cancel, ←) ends with it: a lone picture would otherwise stay on the big screen.
  const trying = useRef(false);
  trying.current = !!session.sting?.draft && session.sting.task === id;
  useEffect(() => () => { if (trying.current) void endSting(code); }, [code]);
  if (!task) {
    return (
      <div className="box-setup scoreboard-remote plan">
        <button className="link back" onClick={onBack}>← Plan the party</button>
        <p className="muted">This task is no longer on the run of show.</p>
      </div>
    );
  }

  const saved = unitOf(unit);
  const locked = lockedAt(board) !== undefined;
  const loud = unit.kind === "loudness";
  const flip = task.game === "flipchart";
  const acetate = task.game === "acetate";
  // The words follow what they draw, until the host has written their own.
  const followed = flip && text.trim() === flipchartWords(drawOf(task)) ? flipchartWords(draw)
    : acetate && text.trim() === acetateWords(acetateDrawOf(task)) ? acetateWords(draw) : text;
  const words = { type, text: followed, limit, parts: parts.map(({ type, text, limit }) => ({ type, text, limit })) };
  const save = () => {
    if (tiebreaker) { void editTiebreaker(code, name, description, song, words); onBack(); return; }
    const rescored = !task.game && scoring !== task.scoring;
    // By-hand points with no numbers to work from would be lost.
    const lost = rescored && scoring && !isMeasured(task) && Object.keys(task.given ?? task.scores ?? {}).some((c) => !task.dq?.[c] && task.results?.[c] === undefined);
    if (lost && !confirm(`Score "${titleOf(task)}" by its numbers? Points given by hand to anyone without a number are cleared.`)) return;
    const line = Number(dqOver.replace(",", "."));
    const over = saved?.kind === "loudness" && dqOver.trim() !== "" && Number.isFinite(line) ? line : undefined;
    // A locked party: the words and the song can change, but scoring it another way asks first.
    if (locked && (rescored || over !== task.dqOver) && !confirm(`The party is completed. Saving changes how "${titleOf(task)}" is scored, so its points can change. Save anyway?`)) return;
    if (flip) void editFlipchart(code, id, draw, minutes);
    if (acetate) void editAcetate(code, id, draw);
    void editTransition(code, id, transition);
    if (checkin !== !!task.checkin) void setCheckinTask(code, board, id, checkin && !!text.trim());
    void editTask(code, id, name, description, song, words, saved, over ?? null).then(() => {
      // A new line, or none, applies to the readings already in.
      if (over === task.dqOver) return;
      const now = { ...task, dqOver: over };
      const entry: TaskEntry = { dq: {}, overDq: {} };
      for (const c of new Set([...Object.keys(task.results ?? {}), ...Object.keys(task.overDq ?? {})])) {
        const e = overLine(now, c, task.results?.[c]);
        Object.assign(entry.dq!, e.dq);
        Object.assign(entry.overDq!, e.overDq);
      }
      const next = board && { ...board, tasks: { ...board.tasks, [id]: now } };
      if (Object.keys(entry.dq!).length) void enterPoints(code, next, session.display?.step === "scoreboard", id, entry);
    });
    if (rescored) void setScoring(code, board, session.display?.step === "scoreboard", id, scoring);
    onBack();
  };
  const drop = () => {
    if (scored(task) && !confirm(`Remove "${titleOf(task)}" and its points?`)) return;
    void removeTask(code, id);
    onBack();
  };

  const tracks = asList(session.jukebox?.tracks);
  const songAt = tracks.indexOf(song);
  const heading = tiebreaker ? `${type || TIEBREAKER_TYPE}`.toUpperCase() : typeOf({ type, game: task.game }).toUpperCase();
  const firstLine = text.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const typed = parts.filter((p) => p.text.trim());
  const count = (text.trim() ? 1 : 0) + typed.length;
  const headings = [...(text.trim() ? [heading] : []), ...typed.map((p) => p.type.trim().toUpperCase())].filter(Boolean);
  // What ⏱ will offer, a part each: the limit set on it, else the one its words give.
  const times = [{ text, limit }, ...typed].filter((p) => p.text.trim()).flatMap((p) => { const ms = p.limit ?? limitIn(p.text)?.ms; return ms ? [timeLabel(ms)] : []; });
  const timed = !flip && times.length > 0 && <span className="nowrap"> · ⏱ {times.join(", ")}</span>;
  const atCheckin = checkin && <span className="nowrap"> · at check-in</span>;
  const clear = (f: () => void) => () => { f(); setOpen(undefined); };

  return (
    <div className="box-setup scoreboard-remote plan task-edit-page sb-add">
      <button className="link back" onClick={onBack}>← Plan the party</button>
      <h2>{tiebreaker ? "Tiebreaker task" : titleOf(task)}</h2>
      {task.game ? (
        <label>{gameName(task.game)}: name it (optional)
          <input value={name} maxLength={80} placeholder="e.g. best costume" onChange={(e) => setName(e.target.value)} />
        </label>
      ) : (
        <label>Task name
          <input value={name} maxLength={80} autoFocus={!task.name} onChange={(e) => setName(e.target.value)} />
        </label>
      )}
      <label>Note for you (optional)
        <textarea rows={2} value={description} maxLength={600} placeholder={tiebreaker ? "How it's played, and how it's won: one winner." : undefined}
          onChange={(e) => setDescription(e.target.value)} />
      </label>
      {flip && (
        <>
          <label>What they draw
            <input value={draw} maxLength={120} placeholder={DEFAULT_DRAW} onChange={(e) => setDraw(e.target.value)} />
          </label>
          <div className="sb-scoring">
            <span>Time limit</span>
            <div className="choices">
              {MINUTES.map((m) => <button type="button" key={m} className={minutes === m ? "active" : ""} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>{m} min</button>)}
            </div>
          </div>
        </>
      )}
      {acetate && (
        <label>What they draw
          <input value={draw} maxLength={120} placeholder={ACETATE_DRAW} onChange={(e) => setDraw(e.target.value)} />
        </label>
      )}
      {!task.game && !tiebreaker && <ScoringField scoring={scoring} onChange={setScoringDraft} />}

      <div className="extras">
        <Extra label="Task text" open={open === "text"} onOpen={() => setOpen("text")} onClose={() => setOpen(undefined)}
          onClear={clear(() => { setText(""); setType(""); setLimit(undefined); setParts([]); })}
          summary={count > 1
            ? <>Task text<span className="muted small"> · {count} parts · {headings.join(", ") || "no headings"}{timed}{atCheckin}</span></>
            : text.trim() ? <>Task text<span className="muted small"> · {heading || "no heading"} · {firstLine.length > 40 ? `${firstLine.slice(0, 40)}…` : firstLine}{timed}{atCheckin}</span></> : undefined}>
          <div className="sb-part">
            {parts.length > 0 && <p className="part-label">Part 1</p>}
            <TaskTypeField type={type} fallback={(tiebreaker ? TIEBREAKER_TYPE : typeOf({ game: task.game })) || undefined} onChange={setType} />
            <TaskTextField text={text} onChange={setText} />
            {/* Flipchart's clock is its own (its time limit above). */}
            {!flip && <TimeLimitField limit={limit} text={text} part={parts.length > 0 ? 1 : undefined} onChange={setLimit} />}
          </div>
          {parts.map((p, i) => (
            <div className="sb-part" key={p.k}>
              <p className="part-label">Part {i + 2}</p>
              <TaskTypeField type={p.type} onChange={(t) => setParts(parts.map((x) => x.k === p.k ? { ...x, type: t } : x))} />
              <TaskTextField text={p.text} onChange={(t) => setParts(parts.map((x) => x.k === p.k ? { ...x, text: t } : x))} />
              <TimeLimitField limit={p.limit} text={p.text} part={i + 2} onChange={(l) => setParts(parts.map((x) => x.k === p.k ? { ...x, limit: l } : x))} />
              <button type="button" className="link" onClick={() => setParts(parts.filter((x) => x.k !== p.k))}><span className="link-icon">✕</span>Remove this part</button>
            </div>
          ))}
          {/* App tasks have one part, except Secret Tasks: the rules, then the reveal. */}
          {(task.game === "secretTasks" ? parts.length === 0 : parts.length + 1 < MAX_PARTS && !task.game) && (
            <button type="button" className="link" onClick={() => setParts([...parts, { k: nextKey.current++, type: "", text: "", limit: undefined }])}>+ Add a part</button>
          )}
          {/* The arrival task: a live task's words, as the last step of check-in. */}
          {!task.game && !tiebreaker && (
            <div className="toggles">
              <Toggle label="Give it to guests at check-in" on={checkin} disabled={!text.trim()} onChange={setCheckin} />
              <p className="muted small">{checkin ? "The last step of check-in, word for word." : "Off: guests see it only when you put it up."}</p>
            </div>
          )}
        </Extra>
        <Extra label="Song" open={open === "song"} onOpen={() => setOpen("song")} onClose={() => setOpen(undefined)} onClear={clear(() => setSong(""))}
          summary={song ? <>♪ Song<span className="muted small"> · {songAt < 0 ? <s>{song}</s> : song}{songAt >= 0 && ` · ${fmt(asNums(session.jukebox?.durations)[songAt])}`}</span></> : undefined}>
          <SongField session={session} song={song} onChange={setSong} />
        </Extra>
        {!tiebreaker && task.game !== "light" && (
          <Extra label="Transition" open={open === "transition"} onOpen={() => setOpen("transition")} onClose={() => setOpen(undefined)}
            onClear={clear(() => setTransition({ music: "", picture: "", video: "" }))}
            summary={transition.music || transition.picture || transition.video ? <>Transition<span className="muted small"> · {transitionSummary(session, transition)}</span></> : undefined}>
            <TransitionField code={code} id={id} session={session} draft={transition} onChange={setTransition} />
          </Extra>
        )}
        {!tiebreaker && task.game !== "light" && (
          <Extra label="📏 Unit" open={open === "unit"} onOpen={() => setOpen("unit")} onClose={() => setOpen(undefined)}
            onClear={clear(() => { setUnit(draftOf(undefined)); setDqOver(""); })}
            summary={saved ? <>📏 Measured in<span className="muted small"> · {loud ? `🔊 dB meter${dqOver.trim() ? ` · DQ if louder than ${dqOver.trim()} dB` : ""}` : `${saved.name} · one is ${saved.amount} ${saved.unit}`}</span></> : undefined}>
            <UnitField draft={unit} onChange={setUnit} />
            {loud && (
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
          </Extra>
        )}
      </div>

      <div className="save-row">
        <button className="big" disabled={!task.game && !name.trim()} onClick={save}>Save</button>
        <button className="link" onClick={onBack}>Cancel</button>
      </div>
      {!tiebreaker && (locked
        ? <p className="muted small locked-line">🔒 The party is completed, so this task stays on the list. Unlock the party on Run of show to remove it.</p>
        : <button className="link" onClick={drop}>Remove this task</button>)}
    </div>
  );
}
