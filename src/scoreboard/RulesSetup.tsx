import { useState } from "react";

/** What a new party starts with. */
export const STANDARD_RULES = [
  "You must read out all task instructions clearly and immediately.",
  "You must not discuss the tasks with any of your fellow competitors.",
  "You must remove your shoes when entering.",
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
