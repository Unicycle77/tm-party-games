import type { ScoreboardTask } from "../types";

/**
 * A drawing task's DQ for one guest. Nothing drawn (a blank roll or page, or only a speck) is a DQ (Jeffrey, 2026-11-01):
 * otherwise two blanks tie at 0 and can share the 5. The host's reveal button puts that DQ on Points with the measures,
 * the same DQ chip as any other, so the host can lift it there. Once a contestant's measure is on Points, Points decides;
 * before that (or for a guest who isn't on the scoreboard), a blank is out.
 */
export function dqOf(task: ScoreboardTask | undefined, contestant: string | undefined, blank: boolean): boolean {
  if (contestant && task?.results?.[contestant] !== undefined) return !!task.dq?.[contestant];
  return blank || !!(contestant && task?.dq?.[contestant]);
}
