import { ref, set } from "firebase/database";
import { db } from "./firebase";
import type { PartyRules, Session } from "./types";

/** What a party has until the host changes it: Jeffrey's house rules. */
export const STANDARD_RULES = [
  "You must read out all task instructions clearly and immediately.",
  "You must not discuss the tasks with any of your fellow competitors.",
  "You must remove your shoes before entering.",
  "You must not break the law.",
  "THE TASKMASTER'S WORD IS FINAL.",
].join("\n");
export const STANDARD_LAST = "And remember... THE TASKMASTER IS ALWAYS RIGHT. If there are any queries, quandaries, or quibbles, THE TASKMASTER DECIDES. You are only here to SERVE THE TASKMASTER.";
export const STANDARD_SIGN_OFF = "TASKMASTER";
const STANDARD: Required<PartyRules> = { text: STANDARD_RULES, last: STANDARD_LAST, signOff: STANDARD_SIGN_OFF };

/** The rules as shown: a rule a line, the last paragraph and the sign-off. */
export interface Rules { rules: string[]; last: string; signOff: string }

const linesOf = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

/** A field as the party has it: the host's words, or the standard ones when they haven't changed it. */
export const rulesField = (session: Session, field: keyof PartyRules) => session.rules?.[field] ?? STANDARD[field];

/** The party's rules, or none when the host emptied both the rules and the last paragraph. */
export function rulesOf(session: Session): Rules | undefined {
  const rules = linesOf(rulesField(session, "text"));
  const last = rulesField(session, "last").trim();
  if (!rules.length && !last) return undefined;
  return { rules, last, signOff: rulesField(session, "signOff").trim() };
}

/** "5 rules", "1 rule", or "no rules" (when there's only the last paragraph, or nothing). */
export const rulesCount = (session: Session) => {
  const n = rulesOf(session)?.rules.length ?? 0;
  return n ? `${n} rule${n === 1 ? "" : "s"}` : "no rules";
};

/** Host: one field of the rules. The standard words are stored as nothing, so the party keeps following them. */
export const saveRulesField = (code: string, field: keyof PartyRules, value: string) =>
  set(ref(db(), `sessions/${code}/rules/${field}`), value === STANDARD[field] ? null : value);
