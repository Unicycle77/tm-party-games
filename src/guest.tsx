import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import { GAMES } from "./games";
import { headingOf, partsOf, tiebreakerWords } from "./scoreboard/TaskText";
import { activeTaskId, sorted } from "./scoreboard/tasks";
import type { Session } from "./types";

/**
 * A guest's phone, laid out like the host remote: the top (their name, or their own name tag while
 * waiting), one status line saying where they stand, at most one "To do now" card holding the only gold
 * button, their to-do list as quiet rows, and quiet links at the bottom. Each game's `Player` fills in the
 * status line and the card (or just the status line, when the guest only watches).
 */

/** What a game's card needs from the page around it. */
export interface GuestFrame {
  /** The task that's on, as its card is headed: "Task 2 of 8 · Photos", its name, and its words where they belong on a phone. */
  task?: { label: string; title?: string; text?: string };
  /** How many things are left on the guest's to-do list. */
  left: number;
}
export const GuestContext = createContext<GuestFrame>({ left: 0 });
export const useGuest = () => useContext(GuestContext);

/** Nothing left to do. */
export const PUT_AWAY = "Put your phone away. People are starting to stare.";
export const leftToDo = (n: number) => `${n} ${n === 1 ? "thing" : "things"} left to do`;
/** "Photo sent." and what's next: "Put your phone away…", or how many things are still on the to-do list. */
export const afterwards = (done: string, left: number) => `${done} ${left ? `${leftToDo(left)}.` : PUT_AWAY}`;

/** The run-of-show task that's on, for the head of a guest's card. */
export function taskOn(session: Session): GuestFrame["task"] {
  const game = session.game && GAMES[session.game];
  if (!game) return undefined;
  const tasks = sorted(session.scoreboard?.tasks);
  const id = activeTaskId(session);
  const i = tasks.findIndex(([t]) => t === id);
  const t = tasks[i]?.[1];
  const name = t?.name?.trim();
  return {
    label: i >= 0 ? `Task ${i + 1} of ${tasks.length} · ${game.name}` : game.name,
    title: name ? name[0]!.toUpperCase() + name.slice(1) : undefined,
    text: t?.text?.trim() || undefined,
  };
}

/**
 * The words the host put on every phone, during a live task or the tiebreaker: one part, with its own heading, the
 * task's name and its lines as written. The phone never says "part": the heading is the part's own type.
 */
export function phoneWordsOf(session: Session) {
  const up = session.phoneText;
  if (!up) return undefined;
  const board = session.scoreboard;
  const tiebreaker = up.task === "tiebreaker";
  const part = partsOf(tiebreaker ? board?.tiebreaker && tiebreakerWords(board.tiebreaker) : board?.tasks?.[up.task])[up.part ?? 0];
  if (!part) return undefined;
  const tasks = sorted(board?.tasks);
  const i = tasks.findIndex(([id]) => id === up.task);
  const name = (tiebreaker ? board?.tiebreaker?.name?.trim() || "Tiebreaker task" : board?.tasks?.[up.task]?.name?.trim()) || undefined;
  return {
    label: `${tiebreaker ? "Tiebreaker" : i >= 0 ? `Task ${i + 1} of ${tasks.length}` : "Task"} · ${headingOf(part.type) || "live task"}`,
    title: name && name[0]!.toUpperCase() + name.slice(1),
    lines: part.text.split("\n").map((l) => l.trim()).filter(Boolean),
  };
}

/** The top of every guest screen: a title and the party line under it. */
export function GuestHead({ title, line }: { title: ReactNode; line?: ReactNode }) {
  return (
    <div className="guest-head">
      <h1>{title}</h1>
      {line && <p className="muted">{line}</p>}
    </div>
  );
}

/** The one line under the top saying where the guest stands. `big`: there's nothing more to say. */
export const Status = ({ children, big = false }: { children: ReactNode; big?: boolean }) =>
  <p className={big ? "on-screen big" : "on-screen"}>{children}</p>;

/** The "To do now" card: the host's Up next card, holding the task's own controls. */
export function GuestCard({ label, title, children }: { label: string; title?: ReactNode; children?: ReactNode }) {
  return (
    <section className="slot guest-card">
      <p className="card-label">{label}</p>
      {title && <h3>{title}</h3>}
      {children}
    </section>
  );
}

/** A task's words on a card, exactly as written, in quotes. */
export const Quote = ({ text }: { text: string }) => <p className="quote">“{text}”</p>;

/** A longer text in quotes, a paragraph a line: the quote opens on the first and closes on the last. */
export const QuoteLines = ({ lines }: { lines: string[] }) =>
  <>{lines.map((l, i) => <p className="quote" key={i}>{i === 0 && "“"}{l}{i === lines.length - 1 && "”"}</p>)}</>;

/**
 * A "HELLO my name is" name tag: on the pile a guest finds their name in at check-in, and (`mine`)
 * bigger at the top of their phone while they wait. `here`: already checked in on a phone.
 */
export function NameTag({ name, mine = false, here = false, style, onClick }: {
  name: string; mine?: boolean; here?: boolean; style?: CSSProperties; onClick?: () => void;
}) {
  const body = (
    <>
      <span className="band"><b>HELLO</b><small>my name is</small></span>
      <span className="nm" style={{ fontSize: nameSize(name, mine) }}>{name}</span>
      {here && <span className="tick">✓ here</span>}
    </>
  );
  const cls = ["name-tag", mine && "mine", here && "here"].filter(Boolean).join(" ");
  return onClick ? <button className={cls} style={style} onClick={onClick}>{body}</button>
    : <div className={cls} style={style}>{body}</div>;
}

/** Long names write smaller, so they still fit on one tag. */
function nameSize(name: string, mine: boolean) {
  const base = mine ? 2.3 : 1.6;
  return `${Math.min(base, (base * 8) / Math.max(name.length, 1)).toFixed(2)}rem`;
}

/** One row of the guest's to-do list. */
export interface TodoRow {
  id: string;
  icon: string;
  label: string;
  state: string;
  /** done: muted; next: the one in the card, in gold. */
  tone?: "done" | "next";
  onOpen?: () => void;
}

export function TodoList({ rows }: { rows: TodoRow[] }) {
  if (!rows.length) return null;
  return (
    <>
      <p className="list-label">Your to-do list</p>
      <ul className="run-list">
        {rows.map((r) => {
          const line = <><span>{r.icon}</span><span>{r.label}</span><span className="state">{r.state}</span></>;
          return (
            <li key={r.id} className={r.tone}>
              {r.onOpen ? <button onClick={r.onOpen}>{line}</button> : <span className="row-line">{line}</span>}
            </li>
          );
        })}
      </ul>
    </>
  );
}
