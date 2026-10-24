import { useState } from "react";
import { TaskCard } from "../TaskCard";
import { FitStage } from "./TaskText";

/** What a new party starts with. */
export const STANDARD_RULES = [
  "You must read out all task instructions clearly and immediately.",
  "You must not discuss the tasks with any of your fellow competitors.",
  "You must remove your shoes before entering.",
  "You must not break the law.",
  "THE TASKMASTER'S WORD IS FINAL.",
];
export const STANDARD_LAST = "And remember... THE TASKMASTER IS ALWAYS RIGHT. If there are any queries, quandaries, or quibbles, THE TASKMASTER DECIDES. You are only here to SERVE THE TASKMASTER.";
export const STANDARD_SIGN_OFF = "TASKMASTER";

const linesOf = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

/**
 * "Taskmaster rules · 5 rules" on Plan the party, with Change opening the rules in place: one box with a rule a
 * line (numbered for you), the last paragraph (the standard words until changed) and the sign-off.
 * Draft: kept in this component only, not saved yet.
 */
export function RulesSetup() {
  const [open, setOpen] = useState(false);
  const [rules, setRules] = useState(STANDARD_RULES.join("\n"));
  const [last, setLast] = useState(STANDARD_LAST);
  const [signOff, setSignOff] = useState(STANDARD_SIGN_OFF);
  const n = linesOf(rules).length;
  return (
    <section className="rules-setup">
      <div className="summary-line">
        <span>Taskmaster rules<span className="muted small"> · {n} rules</span></span>
        <button className="link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Change"}</button>
      </div>
      {open && (
        <div className="party-settings">
          <label className="sb-task-text">Rules
            <textarea value={rules} maxLength={3000} rows={5} onChange={(e) => setRules(e.target.value)} />
            <span className="muted small">A rule a line, numbered for you in this order.</span>
          </label>
          <label className="sb-task-text">Last paragraph
            <textarea value={last} maxLength={1000} rows={3} onChange={(e) => setLast(e.target.value)} />
            {last === STANDARD_LAST
              ? <span className="muted small">The standard words.</span>
              : <button type="button" className="link" onClick={() => setLast(STANDARD_LAST)}>Back to the standard words</button>}
          </label>
          <label className="sb-task-text">Sign-off
            <input value={signOff} maxLength={40} onChange={(e) => setSignOff(e.target.value)} />
            <span className="muted small">Under the rules, with the TM seal under it on screen. The printed page leaves room for a real one.</span>
          </label>
        </div>
      )}
    </section>
  );
}

/**
 * The rules on paper: the task card with TASKMASTER RULES centred on top, the rules numbered with the number
 * hanging, the last paragraph, and the sign-off on the right with the TM seal under it. `small` on a phone.
 */
export function RulesCard({ rules = STANDARD_RULES, last = STANDARD_LAST, signOff = STANDARD_SIGN_OFF, small = false }: { rules?: string[]; last?: string; signOff?: string; small?: boolean }) {
  return (
    <TaskCard lines={["Taskmaster rules"]} centred small={small} className="rules">
      <ol>{rules.map((r, i) => <li key={i}>{r}</li>)}</ol>
      {last && <p>{last}</p>}
      {signOff && <p className="sign-off">{signOff}</p>}
    </TaskCard>
  );
}

/** The rules on the big screen: the card on the curtain, shrunk to fit like a task's text. */
export function RulesStage() {
  return (
    <FitStage fitKey={[...STANDARD_RULES, STANDARD_LAST, STANDARD_SIGN_OFF].join("\n")}>
      <RulesCard />
    </FitStage>
  );
}
