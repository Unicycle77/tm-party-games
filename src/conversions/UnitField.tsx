import type { TaskUnit } from "../types";
import { COMMON, DB_METER, DICE } from "./convert";

/** The unit picker on a task: lengths, weights, times, then volumes, a row each, so the kind reads at a glance. */
const ROWS = [COMMON.height, COMMON.weight, COMMON.time, COMMON.volume];
const kindOf = (unit: string, was: TaskUnit["kind"]): TaskUnit["kind"] =>
  COMMON.weight.includes(unit) ? "weight" : COMMON.time.includes(unit) ? "time" : COMMON.volume.includes(unit) ? "volume" : was === "length" ? "length" : "height";

/** A draft of the task's unit while it's being edited; `amount` stays as typed. */
export interface UnitDraft { name: string; amount: string; unit: string; kind: TaskUnit["kind"] }
export const draftOf = (u?: TaskUnit): UnitDraft =>
  u ? { name: u.name, amount: String(u.amount), unit: u.unit, kind: u.kind } : { name: "", amount: "", unit: "mm", kind: "height" };
/** The unit to save, or null when there's no name or no size (which takes it off the task). */
export function unitOf(d: UnitDraft): TaskUnit | null {
  const amount = Number(d.amount.replace(",", "."));
  return d.name.trim() && amount > 0 ? { name: d.name.trim(), amount, unit: d.unit, kind: d.kind } : null;
}

/**
 * "📏 Measured in (optional)" on a task's ✎ page: what the converter offers for this task, like dice at 16 mm.
 * 🔊 dB meter makes it a sound task in one tap: there's nothing to name or size, so all of that goes.
 */
export function UnitField({ draft, onChange }: { draft: UnitDraft; onChange: (d: UnitDraft) => void }) {
  const set = (patch: Partial<UnitDraft>) => onChange({ ...draft, ...patch });
  const unit = unitOf(draft);
  const loud = draft.kind === "loudness";
  const lengthLike = COMMON.height.includes(draft.unit);
  return (
    <div className="unit-field">
      <label>📏 Measured in (optional)
        {!loud && <input value={draft.name} maxLength={30} placeholder="e.g. dice, spoonfuls, paces" onChange={(e) => set({ name: e.target.value })} />}
      </label>
      {(!draft.name.trim() || loud) && (
        <div className="choices">
          {!loud && <button type="button" onClick={() => onChange(draftOf(DICE))}>🎲 Dice (16 mm)</button>}
          <button type="button" className={loud ? "active" : ""} aria-pressed={loud}
            onClick={() => onChange(draftOf(loud ? undefined : DB_METER))}>🔊 dB meter</button>
        </div>
      )}
      {!loud && (
        <>
        <div className="unit-size">
          <span className="muted">One is</span>
          <input inputMode="decimal" value={draft.amount} placeholder="16" onChange={(e) => set({ amount: e.target.value })} />
        </div>
        {ROWS.map((row) => (
          <div key={row[0]} className="choices units">
            {row.map((u) => (
              <button type="button" key={u} className={draft.unit === u ? "active" : ""} aria-pressed={draft.unit === u}
                onClick={() => set({ unit: u, kind: kindOf(u, draft.kind) })}>{u}</button>
            ))}
          </div>
        ))}
        {lengthLike && (
          <div className="choices">
            {(["height", "length"] as const).map((k) => (
              <button type="button" key={k} className={draft.kind === k ? "active" : ""} aria-pressed={draft.kind === k}
                onClick={() => set({ kind: k })}>{k === "height" ? "Stacked up (height)" : "End to end (length)"}</button>
            ))}
          </div>
        )}
        </>
      )}
      {unit && !loud && (
        <p className="muted small">
          The 📏 converter offers "{unit.name}" for this task: 10 {unit.name} is {+(10 * unit.amount).toFixed(2)} {unit.unit}.
        </p>
      )}
    </div>
  );
}
