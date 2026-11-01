import { winnersOf } from "../../scoreboard/ranked";
import type { ScoreboardTask, Session } from "../../types";
import { bonusOf } from "../../scoreboard/measured";
import { lengthOf, racersOf, rollOf, snakeTask, stripOf, unrollMs, UNROLL_DELAY } from "./data";

export interface Standing {
  uid: string;
  name: string;
  /** Their scoreboard contestant, if they're on it. */
  contestant?: string;
  inches: number;
  sheets: number;
  dq: boolean;
  won: boolean;
  bonus: number;
  torn: boolean;
  shapes: number;
  thin: number;
  thinAll: boolean;
  /** When their roll stops on the TV, in ms after the race starts. */
  stopsAt: number;
}

/**
 * Every snake in the race, in running order, with what the room and the host need: the measure (the task's own result
 * wins, so a number the host corrected on Points is the one everyone sees), the DQ and bonus from Points, who won.
 */
export function standingsOf(session: Session, task: ScoreboardTask | undefined = snakeTask(session)): Standing[] {
  const rows = racersOf(session).map((uid): Standing => {
    const player = session.players?.[uid];
    const c = player?.contestant && session.scoreboard?.contestants?.[player.contestant] ? player.contestant : undefined;
    const m = lengthOf(session, uid);
    const { hang, full } = stripOf(session, uid);
    return {
      uid, name: player?.name ?? "", contestant: c,
      inches: (c ? task?.results?.[c] : undefined) ?? m.inches,
      sheets: (c ? task?.sheets?.[c] : undefined) ?? m.sheets,
      dq: !!(c && task?.dq?.[c]),
      won: false,
      bonus: c && task ? bonusOf(task, c) : 0,
      torn: rollOf(session, uid).tear > 0,
      shapes: m.shapes, thin: m.thin.length, thinAll: m.thinAll,
      stopsAt: UNROLL_DELAY + unrollMs(hang, full),
    };
  });
  const inRunning = rows.filter((r) => !r.dq).map((r) => r.uid);
  const values = Object.fromEntries(rows.map((r) => [r.uid, r.inches]));
  const sheets = Object.fromEntries(rows.map((r) => [r.uid, r.sheets]));
  const won = new Set(winnersOf("second", inRunning, values, sheets));
  for (const r of rows) r.won = won.has(r.uid);
  return rows;
}

/** Longest first (then most sheets), as the host reads them out. */
export const longestFirst = (rows: Standing[]) => [...rows].sort((a, b) => b.inches - a.inches || b.sheets - a.sheets);
