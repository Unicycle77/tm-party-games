import type { Session } from "../types";
import { acetateRound } from "./acetate/data";
import { flipchartRound } from "./flipchart/data";
import { snakeRound } from "./snake/data";
import { duckRound } from "./duck/data";
import type { DrawRound } from "./drawRound";
import type { DrawGame } from "./drawGames";

/** Every drawing task's round (see drawRound). */
export const ROUNDS: Record<DrawGame, DrawRound> = { flipchart: flipchartRound, acetate: acetateRound, snake: snakeRound, duck: duckRound };

/** The drawing round whose clock is the one in the party: its game is on and its time runs. */
export function roundOwningClock(session: Session): DrawRound | undefined {
  const r = session.game && session.game in ROUNDS ? ROUNDS[session.game as DrawGame] : undefined;
  return r && r.running(session) && r.dataOf(session).endsAt !== undefined ? r : undefined;
}
