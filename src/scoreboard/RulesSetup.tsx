import { useEffect, useState } from "react";
import { rulesCount, rulesField, saveRulesField, STANDARD_LAST, type Rules } from "../rules";
import { TaskCard } from "../TaskCard";
import type { PartyRules, Session } from "../types";
import { FitStage } from "./TaskText";

/** A box for one field of the rules, saved when the host leaves it. Another remote's change shows unless it's being edited. */
function useField(code: string, session: Session, field: keyof PartyRules) {
  const saved = rulesField(session, field);
  const [value, setValue] = useState(saved);
  const [editing, setEditing] = useState(false);
  useEffect(() => { if (!editing) setValue(saved); }, [saved, editing]);
  return {
    value,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => { setValue(e.target.value); setEditing(true); },
    onBlur: () => { if (value !== saved) void saveRulesField(code, field, value); setEditing(false); },
    set: (v: string) => { setValue(v); void saveRulesField(code, field, v); },
  };
}

/**
 * "Taskmaster rules · 5 rules" on Plan the party, with Change opening the rules in place: one box with a rule a
 * line (numbered for you), the last paragraph (the standard words until changed) and the sign-off. Each box is
 * saved when the host leaves it. Emptying the rules and the last paragraph leaves the party with none.
 */
export function RulesSetup({ code, session }: { code: string; session: Session }) {
  const [open, setOpen] = useState(false);
  const rules = useField(code, session, "text");
  const last = useField(code, session, "last");
  const signOff = useField(code, session, "signOff");
  return (
    <section className="rules-setup">
      <div className="summary-line">
        <span>Taskmaster rules<span className="muted small"> · {rulesCount(session)}</span></span>
        <button className="link" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Close" : "Change"}</button>
      </div>
      {open && (
        <div className="party-settings">
          <label className="sb-task-text">Rules
            <textarea value={rules.value} maxLength={3000} rows={5} onChange={rules.onChange} onBlur={rules.onBlur} />
            <span className="muted small">A rule a line, numbered for you in this order.</span>
          </label>
          <label className="sb-task-text">Last paragraph
            <textarea value={last.value} maxLength={1000} rows={3} onChange={last.onChange} onBlur={last.onBlur} />
            {last.value === STANDARD_LAST
              ? <span className="muted small">The standard words.</span>
              : <button type="button" className="link" onClick={() => last.set(STANDARD_LAST)}>Back to the standard words</button>}
          </label>
          <label className="sb-task-text">Sign-off
            <input value={signOff.value} maxLength={40} onChange={signOff.onChange} onBlur={signOff.onBlur} />
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
export function RulesCard({ rules, small = false }: { rules: Rules; small?: boolean }) {
  return (
    <TaskCard lines={["Taskmaster rules"]} centred small={small} className="rules">
      {rules.rules.length > 0 && <ol>{rules.rules.map((r, i) => <li key={i}>{r}</li>)}</ol>}
      {rules.last && <p>{rules.last}</p>}
      {rules.signOff && <p className="sign-off">{rules.signOff}</p>}
    </TaskCard>
  );
}

/** The rules on the big screen: the card on the curtain, shrunk to fit like a task's text. */
export function RulesStage({ rules }: { rules: Rules }) {
  return (
    <FitStage fitKey={JSON.stringify(rules)}>
      <RulesCard rules={rules} />
    </FitStage>
  );
}
