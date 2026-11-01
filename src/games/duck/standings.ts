import { bonusOf } from "../../scoreboard/measured";
import { knockOuts, orderOf, winnersOf } from "../../scoreboard/ranked";
import { dqOf } from "../../scoreboard/blank";
import type { ScoreboardTask, Session } from "../../types";
import { duckTask, ducksOf, sizeOf } from "./data";

export interface DuckStanding {
  uid: string;
  name: string;
  contestant?: string;
  sqIn: number;
  shapes: number;
  dq: boolean;
  won: boolean;
  bonus: number;
}

/**
 * Every duck, in running order, with its size (the task's own result wins, so a number the host corrected on Points is the
 * one everyone sees), its DQ and bonus from Points (a blank page is a DQ: see blank.ts), and who won: by the rule the
 * whole line-up started with, DQs or not (see ranked.ts). Then the line-up (smallest first, the DQ'd left out) and
 * the knock-outs that leave the median.
 */
export function duckStandings(session: Session, task: ScoreboardTask | undefined = duckTask(session)) {
  const rows = ducksOf(session).map((uid): DuckStanding => {
    const player = session.players?.[uid];
    const c = player?.contestant && session.scoreboard?.contestants?.[player.contestant] ? player.contestant : undefined;
    const m = sizeOf(session, uid);
    return {
      uid, name: player?.name ?? "", contestant: c,
      sqIn: (c ? task?.results?.[c] : undefined) ?? m.sqIn,
      shapes: m.shapes,
      dq: dqOf(task, c, m.shapes === 0),
      won: false,
      bonus: c && task ? bonusOf(task, c) : 0,
    };
  });
  const values = Object.fromEntries(rows.map((r) => [r.uid, r.sqIn]));
  const running = rows.filter((r) => !r.dq).map((r) => r.uid);
  const lineUp = orderOf("median", running, values);
  const winners = winnersOf("median", running, values, undefined, rows.length);
  for (const r of rows) r.won = winners.includes(r.uid);
  return { rows, lineUp, steps: knockOuts(lineUp, winners), dqs: rows.filter((r) => r.dq).map((r) => r.uid) };
}
