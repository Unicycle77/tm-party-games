import { useEffect, useMemo, useState } from "react";
import { scored, sorted, titleOf } from "../scoreboard/tasks";
import { showConversion, store } from "../session";
import { Toggle } from "../Toggle";
import type { Session } from "../types";
import { COMMON, commonFor, feetAndInches, firstUnit, ofSystem, type System, KIND_LABEL, KINDS, matchFor, poundsAndOunces, rank, say, sizeText, toAnchor, working, type Match } from "./convert";
import { UNITS, type Kind, type UselessUnit } from "./units";

const UNIT_KEY = "ba.convertUnit";
/** A task's unit, a common unit, or a useless unit itself (`thing`, its `many`): "2 Eiffel Towers". */
type Source = { task: string } | { kind: Kind; unit: string; thing?: string };

/** For finding a thing by name: lower case, without accents, so "timothee" finds Timothée Chalamet. */
const plain = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * The last common unit this phone measured in ("height:cm"), so a run of the same task is one tap each. A unit from
 * the other system (cm, remembered from a metric party, at an imperial one) gives way to the party's own (ft).
 */
function lastCommon(system?: System): { kind: Kind; unit: string } {
  const [kind, unit] = store.get(UNIT_KEY).split(":") as [Kind, string];
  if (!KINDS.includes(kind)) return { kind: "height", unit: firstUnit("height", system) };
  return { kind, unit: COMMON[kind].includes(unit) && ofSystem(unit, system) ? unit : firstUnit(kind, system) };
}

/**
 * 📏 Useless conversions, on the host's phone: a measurement in, and the useless unit closest to a round number out,
 * to read aloud. Tasks with a unit of their own ("dice") are offered first, opening on the next task to score.
 */
export function ConverterRemote({ code, session }: { code: string; session: Session }) {
  const withUnits = sorted(session.scoreboard?.tasks).map(([id, t], i) => ({ id, task: t, place: i + 1 })).filter((t) => t.task.unit);
  const [source, setSourceState] = useState<Source>(() => {
    const next = withUnits.find((t) => !scored(t.task)) ?? withUnits.at(-1);
    return next ? { task: next.id } : lastCommon(session.units);
  });
  const setSource = (s: Source) => {
    setSourceState(s);
    if ("unit" in s) store.set(UNIT_KEY, `${s.kind}:${s.unit}`);
  };
  const [typed, setTyped] = useState("");
  const [typedIn, setTypedIn] = useState("");
  // The list of things to start from, and what's typed to find one.
  const [finding, setFinding] = useState(false);
  const [find, setFind] = useState("");

  const taskUnit = "task" in source ? session.scoreboard?.tasks?.[source.task]?.unit : undefined;
  // A task whose unit was removed falls back to the common units.
  const common = "unit" in source ? source : lastCommon(session.units);
  const thing = !taskUnit && "thing" in source ? UNITS[common.kind].find((u) => u.many === source.thing) : undefined;
  // At an imperial party, feet come with an inches box (5 ft 11 in, the way a height is said: a phone's number pad has
  // no ' or "), and pounds with an ounces box (1 lb 8 oz).
  const split = session.units !== "imperial" || taskUnit || thing ? undefined
    : common.unit === "ft" ? { small: "in", per: 12, hint: ["5", "11"] } : common.unit === "lb" ? { small: "oz", per: 16, hint: ["1", "8"] } : undefined;
  const amount = Number(typed.replace(",", ".")) + (split ? Number(typedIn.replace(",", ".")) / split.per : 0);
  const kind: Kind = taskUnit?.kind ?? common.kind;
  // Abbreviations read the same for any number ("2 kg"); "cup" is the one word among them.
  const label = thing ? (amount === 1 ? thing.one : thing.many) : taskUnit?.name ?? (common.unit === "cup" && amount !== 1 ? "cups" : common.unit);
  const anchor = thing ? amount * thing.size : taskUnit ? toAnchor(amount * taskUnit.amount, taskUnit.unit) : toAnchor(amount, common.unit);
  const ready = (typed.trim() !== "" || (!!split && typedIn.trim() !== "")) && amount > 0 && isFinite(anchor);

  // Each "Surprise me" steps down the ranking; a new measurement starts it again.
  // A thing is never measured in itself ("1 Eiffel Tower is exactly 1 Eiffel Tower").
  const key = `${kind}:${anchor}:${thing?.many ?? ""}`;
  const ranked = useMemo(() => (ready ? rank(kind, anchor).filter((m) => m.unit !== thing) : []), [key, ready]);
  const [at, setAt] = useState(-1);
  const [picked, setPicked] = useState<Match>();
  const [choosing, setChoosing] = useState(false);
  // "⇄ Flip it" swaps the two things: the answer becomes the one to start from, and lands on the old start.
  const [flipTo, setFlipTo] = useState<UselessUnit>();
  useEffect(() => { setAt(-1); setPicked(flipTo && matchFor(flipTo, anchor)); setFlipTo(undefined); setChoosing(false); }, [key]);
  const match = picked ?? ranked[at];
  // Read out in the smaller unit, so 0 ft 8 in is "8 in", and 5 ft 11 in stays "5 ft 11 in".
  const said = match && (split ? say(kind, amount * split.per, split.small, match, session.units) : say(kind, amount, label, match, session.units, thing));

  // While it's on the big screen, the big screen follows the host's result.
  const onScreen = !!session.conversion;
  useEffect(() => {
    if (onScreen && said && (said.main !== session.conversion?.main || said.lead !== session.conversion?.lead)) void showConversion(code, said);
  }, [onScreen, said?.lead, said?.main]);

  const found = UNITS[kind].filter((u) => [u.one, u.many].some((n) => plain(n).includes(plain(find.trim()))));

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
            onClick={() => setSource({ kind: k, unit: k === common.kind ? common.unit : firstUnit(k, session.units) })}>{KIND_LABEL[k]}</button>;
        })}
      </div>
      {/* While a task's unit is in use, the common units stay where they are, dimmed, until one is tapped. */}
      <div className={`choices units${taskUnit ? " idle" : ""}`}>
        {commonFor(kind, session.units).map((u) => {
          const on = !taskUnit && !thing && common.unit === u;
          return <button key={u} className={on ? "active" : ""} aria-pressed={on} onClick={() => setSource({ kind, unit: u })}>{u}</button>;
        })}
        {/* Or start from a useless unit: its own row, since a name is longer than a unit. */}
        <button className={`thing${thing ? " active" : ""}`} aria-pressed={!!thing} aria-expanded={finding} onClick={() => setFinding(!finding)}>
          {thing ? thing.one : "a thing"} {finding ? "▴" : "▾"}
        </button>
      </div>
      {finding && (
        <div className="find-thing">
          <div className="clearable">
            <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a thing…" aria-label="Find a thing" enterKeyHint="search" autoFocus />
            {find && <button type="button" aria-label="Clear find a thing" onClick={() => setFind("")}>×</button>}
          </div>
          <ul className="tracklist">
            {found.map((u) => (
              <li key={u.many}>
                <button className={thing === u ? "active" : ""} onClick={() => {
                  setSource({ kind, unit: common.kind === kind ? common.unit : firstUnit(kind, session.units), thing: u.many });
                  setTyped("1");
                  setTypedIn("");
                  setFinding(false);
                  setFind("");
                }}>
                  <span className="title">{u.one}</span><span className="dur">{sizeText(kind, u, session.units)}</span>
                </button>
              </li>
            ))}
          </ul>
          {!found.length && <p className="muted">Nothing called that in {KIND_LABEL[kind].toLowerCase()}.</p>}
        </div>
      )}
      {split ? (
        <div className="feet-in">
          <span>How much?</span>
          <label><input inputMode="decimal" value={typed} placeholder={split.hint[0]} aria-label={common.unit} onChange={(e) => setTyped(e.target.value)} /> {common.unit}</label>
          <label><input inputMode="decimal" value={typedIn} placeholder={split.hint[1]} aria-label={split.small} onChange={(e) => setTypedIn(e.target.value)} /> {split.small}</label>
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
          <p className="small">{working(kind, anchor, split ? (kind === "weight" ? poundsAndOunces(anchor) : feetAndInches(anchor)) : `${typed.trim()} ${label}`, match, session.units, thing)}</p>
          <div className="summary-links">
            <button className="link" aria-expanded={choosing} onClick={() => setChoosing(!choosing)}>Use a different unit {choosing ? "▴" : "▾"}</button>
            {thing && (
              <button className="link" onClick={() => {
                setFlipTo(thing);
                setSource({ kind, unit: common.unit, thing: match.unit.many });
                setTyped("1");
              }}>⇄ Flip it</button>
            )}
          </div>
          {choosing && (
            <ul className="tracklist">
              {UNITS[kind].filter((u) => u !== thing).map((u) => (
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
