import { useEffect, useMemo, useState } from "react";
import { scored, sorted, titleOf } from "../scoreboard/tasks";
import { showConversion, store } from "../session";
import { Toggle } from "../Toggle";
import type { Session } from "../types";
import { COMMON, feetAndInches, KIND_LABEL, KINDS, matchFor, rank, say, toAnchor, working, type Match } from "./convert";
import { UNITS, type Kind } from "./units";

const UNIT_KEY = "ba.convertUnit";
type Source = { task: string } | { kind: Kind; unit: string };

/** The last common unit this phone measured in ("height:cm"), so a run of the same task is one tap each. */
function lastCommon(): { kind: Kind; unit: string } {
  const [kind, unit] = store.get(UNIT_KEY).split(":") as [Kind, string];
  return KINDS.includes(kind) && COMMON[kind].includes(unit) ? { kind, unit } : { kind: "height", unit: "cm" };
}

/**
 * 📏 Useless conversions, on the host's phone: a measurement in, and the useless unit closest to a round number out,
 * to read aloud. Tasks with a unit of their own ("dice") are offered first, opening on the next task to score.
 */
export function ConverterRemote({ code, session }: { code: string; session: Session }) {
  const withUnits = sorted(session.scoreboard?.tasks).map(([id, t], i) => ({ id, task: t, place: i + 1 })).filter((t) => t.task.unit);
  const [source, setSourceState] = useState<Source>(() => {
    const next = withUnits.find((t) => !scored(t.task)) ?? withUnits.at(-1);
    return next ? { task: next.id } : lastCommon();
  });
  const setSource = (s: Source) => {
    setSourceState(s);
    if ("unit" in s) store.set(UNIT_KEY, `${s.kind}:${s.unit}`);
  };
  const [typed, setTyped] = useState("");
  const [typedIn, setTypedIn] = useState("");

  const taskUnit = "task" in source ? session.scoreboard?.tasks?.[source.task]?.unit : undefined;
  // A task whose unit was removed falls back to the common units.
  const common = "unit" in source ? source : lastCommon();
  // At an imperial party, feet come with an inches box: 5 ft 11 in, the way a height is said (a phone's number pad has no ' or ").
  const feetAndIn = session.units === "imperial" && !taskUnit && common.unit === "ft";
  const amount = Number(typed.replace(",", ".")) + (feetAndIn ? Number(typedIn.replace(",", ".")) / 12 : 0);
  const kind: Kind = taskUnit?.kind ?? common.kind;
  // Abbreviations read the same for any number ("2 kg"); "cup" is the one word among them.
  const label = taskUnit?.name ?? (common.unit === "cup" && amount !== 1 ? "cups" : common.unit);
  const anchor = taskUnit ? toAnchor(amount * taskUnit.amount, taskUnit.unit) : toAnchor(amount, common.unit);
  const ready = (typed.trim() !== "" || (feetAndIn && typedIn.trim() !== "")) && amount > 0 && isFinite(anchor);

  // Each "Surprise me" steps down the ranking; a new measurement starts it again.
  const key = `${kind}:${anchor}`;
  const ranked = useMemo(() => (ready ? rank(kind, anchor) : []), [key, ready]);
  const [at, setAt] = useState(-1);
  const [picked, setPicked] = useState<Match>();
  const [choosing, setChoosing] = useState(false);
  useEffect(() => { setAt(-1); setPicked(undefined); setChoosing(false); }, [key]);
  const match = picked ?? ranked[at];
  // Feet and inches are read out in inches, so 0 ft 8 in is "8 in", and 5 ft 11 in stays "5 ft 11 in".
  const said = match && (feetAndIn ? say(kind, amount * 12, "in", match, session.units) : say(kind, amount, label, match, session.units));

  // While it's on the big screen, the big screen follows the host's result.
  const onScreen = !!session.conversion;
  useEffect(() => {
    if (onScreen && said && (said.main !== session.conversion?.main || said.lead !== session.conversion?.lead)) void showConversion(code, said);
  }, [onScreen, said?.lead, said?.main]);

  const surprise = () => { setPicked(undefined); setChoosing(false); setAt((a) => (a + 1) % ranked.length); };

  return (
    <section className="remote converter">
      <h2>📏 Useless conversions</h2>
      {withUnits.length > 0 && (
        <>
          <span className="muted">A task's unit</span>
          <div className="choices tasks">
            {withUnits.map((t) => (
              <button key={t.id} className={"task" in source && source.task === t.id ? "active" : ""} aria-pressed={"task" in source && source.task === t.id}
                onClick={() => setSource({ task: t.id })}>
                {t.task.unit!.name} <span className="muted">· {t.place} {titleOf(t.task)}</span>
              </button>
            ))}
          </div>
          <span className="muted">Or a common unit</span>
        </>
      )}
      <div className="choices kinds">
        {KINDS.map((k) => {
          const on = !taskUnit && common.kind === k;
          return <button key={k} className={on ? "active" : ""} aria-pressed={on}
            onClick={() => setSource({ kind: k, unit: k === common.kind ? common.unit : COMMON[k][1]! })}>{KIND_LABEL[k]}</button>;
        })}
      </div>
      {/* While a task's unit is in use, the common units stay where they are, dimmed, until one is tapped. */}
      <div className={`choices units${taskUnit ? " idle" : ""}`}>
        {COMMON[kind].map((u) => {
          const on = !taskUnit && common.unit === u;
          return <button key={u} className={on ? "active" : ""} aria-pressed={on} onClick={() => setSource({ kind, unit: u })}>{u}</button>;
        })}
      </div>
      {feetAndIn ? (
        <div className="feet-in">
          <span>How much?</span>
          <label><input inputMode="decimal" value={typed} placeholder="5" aria-label="Feet" onChange={(e) => setTyped(e.target.value)} /> ft</label>
          <label><input inputMode="decimal" value={typedIn} placeholder="11" aria-label="Inches" onChange={(e) => setTypedIn(e.target.value)} /> in</label>
        </div>
      ) : (
        <label>How much?
          <input inputMode="decimal" value={typed} placeholder="20" onChange={(e) => setTyped(e.target.value)} />
        </label>
      )}
      <button className="big" disabled={!ready} onClick={surprise}>{match ? "Surprise me again" : "Surprise me"}</button>
      {said && match && (
        <div className="slot conversion">
          <p className="lead">{said.lead}</p>
          <p className="main">{said.main}</p>
          <p className="lead">{said.how}</p>
          <p className="small">{working(kind, anchor, feetAndIn ? feetAndInches(anchor) : `${typed.trim()} ${label}`, match, session.units)}</p>
          <button className="link" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>Use a different unit {choosing ? "▴" : "▾"}</button>
          {choosing && (
            <ul className="tracklist">
              {UNITS[kind].map((u) => (
                <li key={u.many}>
                  <button className={match.unit === u ? "active" : ""} onClick={() => { setPicked(matchFor(u, anchor)); setChoosing(false); }}>{u.many}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="toggles">
        <Toggle label="Show on the big screen" on={onScreen} disabled={!said && !onScreen}
          onChange={(on) => void showConversion(code, on && said ? said : null)} />
      </div>
    </section>
  );
}
