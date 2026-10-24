import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { TaskCard } from "../TaskCard";
import type { Scoreboard, TaskGame } from "../types";
import { asParts } from "./tasks";

/** The types every party uses; anything else ("Arrival") is typed under Other…. */
const TYPES = ["Individual", "Team"];
/** App games already know what kind of task they are. */
const GAME_TYPES: Partial<Record<TaskGame, string>> = { headshots: "Headshot", prize: "Prize", secretTasks: "Secret" };
export const TIEBREAKER_TYPE = "Tiebreaker";

/** "Individual" → "Individual task", as it heads the card (in capitals there). A type that already ends in "task" or "tasks" ("Arrival task", "Secret Tasks") is left as it is. */
export const headingOf = (type: string | undefined) => {
  const t = type?.trim();
  return t ? (/\s+tasks?$/i.test(t) ? t : `${t} task`) : "";
};

/** A task's type: the host's, or the one its app game already has. */
export const typeOf = (task: { type?: string; game?: TaskGame }) => task.type || (task.game && GAME_TYPES[task.game]) || "";

/** The text's lines, a paragraph each; blank lines are just space when typing. */
const linesOf = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

/** The task's words, a part each: its own type and text, for the parts that have any. A task with no parts has one. */
export function partsOf(t: { type?: string; game?: TaskGame; text?: string; limit?: number; parts?: unknown } | undefined): { type: string; text: string; limit?: number }[] {
  if (!t) return [];
  return [{ type: typeOf(t), text: t.text ?? "", limit: t.limit }, ...asParts(t.parts).map((p) => ({ type: p.type ?? "", text: p.text, limit: p.limit }))].filter((p) => p.text.trim());
}

/** The tiebreaker's words as a task's: its type is "Tiebreaker" unless the host gave it one. */
export const tiebreakerWords = (tb: NonNullable<Scoreboard["tiebreaker"]>) => ({ ...tb, type: tb.type || TIEBREAKER_TYPE });

/** The words of a task (a task's id, or "tiebreaker"), for `partsOf`. */
export const wordsOfTask = (board: Scoreboard | undefined, task: string | undefined) =>
  task === "tiebreaker" ? board?.tiebreaker && tiebreakerWords(board.tiebreaker) : task ? board?.tasks?.[task] : undefined;

/** The words up on the big screen (part `part` of them, the first when absent), if the task (or the tiebreaker) still has any. */
export const textUp = (board: Scoreboard | undefined, task: string | undefined, part = 0) => partsOf(wordsOfTask(board, task))[part];

/**
 * "Task type (optional)" in a task's ✎: Individual and Team, or Other… for a word of the host's own. The
 * picked chip is gold, and a muted line spells out the heading it makes. `fallback` is the type a task has
 * with none picked (an app game's, or the tiebreaker's).
 */
export function TaskTypeField({ type, fallback, onChange }: { type: string; fallback?: string; onChange: (type: string) => void }) {
  const [other, setOther] = useState(() => !!type && !TYPES.includes(type));
  const shown = type || fallback;
  return (
    <div className="sb-type">
      <span>Task type (optional)</span>
      <div className="choices">
        {TYPES.map((t) => (
          <button type="button" key={t} className={!other && type === t ? "active" : ""} aria-pressed={!other && type === t}
            onClick={() => { setOther(false); onChange(type === t ? "" : t); }}>{t}</button>
        ))}
        <button type="button" className={other ? "active" : ""} aria-pressed={other}
          onClick={() => { setOther(!other); onChange(""); }}>Other…</button>
      </div>
      {other && (
        <input value={type} maxLength={30} autoFocus placeholder={fallback ?? "Arrival"} aria-label="Your own task type"
          onChange={(e) => onChange(e.target.value)} />
      )}
      <p className="muted small">{shown ? `Heads the task text: ${headingOf(shown).toUpperCase()}.` : "No heading on the task text."}</p>
    </div>
  );
}

/** "Task text (optional)" in a task's ✎: a plain box that grows with what's pasted. */
export function TaskTextField({ text, onChange }: { text: string; onChange: (text: string) => void }) {
  return (
    <label className="sb-task-text">Task text (optional)
      <textarea value={text} maxLength={5000} rows={3} placeholder="What you read out. Each line is its own paragraph."
        onChange={(e) => onChange(e.target.value)} />
      <span className="muted small">Read out from the task's page, on paper, a line per paragraph. It's only on the big screen if you put it up.</span>
    </label>
  );
}

/** The task's text on its page, on the paper task card, a step bigger for reading out. */
export const TaskTextCard = ({ type, text }: { type: string; text: string }) =>
  <TaskCard lines={[headingOf(type), ...linesOf(text)]} small centred className="reading" />;

/**
 * The task's text on the big screen: the task card centred on the curtain. The type shrinks until the whole
 * text fits, so the screen never scrolls; short text keeps the card's usual size.
 */
export function TaskTextStage({ type, text }: { type: string; text: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(3);
  useLayoutEffect(() => {
    const fit = () => {
      const el = box.current;
      const card = el?.firstElementChild as HTMLElement | null;
      if (!el || !card) return;
      let vh = 3;
      el.style.setProperty("--text-size", `${vh}vh`);
      while (vh > 1.2 && card.offsetHeight > el.clientHeight * 0.92) {
        vh -= 0.1;
        el.style.setProperty("--text-size", `${vh}vh`);
      }
      setSize(vh);
    };
    fit();
    void document.fonts?.ready.then(fit);
    addEventListener("resize", fit);
    return () => removeEventListener("resize", fit);
  }, [type, text]);
  return (
    <div className="stage task-text-stage" ref={box} style={{ "--text-size": `${size}vh` } as CSSProperties}>
      <TaskCard lines={[headingOf(type), ...linesOf(text)]} centred />
    </div>
  );
}
