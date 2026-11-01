import type { Display, Session } from "../../types";
import { answerOf, closed, dataOf, running, started, timeUp } from "./data";

/** "On the big screen:" while the task's collecting screen is up: which part, who's answered, and while they draw, whose time is up. */
export function onScreen(session: Session, display: Display): string | undefined {
  if (display.step !== "list") return undefined;
  const players = Object.keys(session.players ?? {});
  const data = dataOf(session);
  if (running(session)) return `the task, ${players.filter((uid) => timeUp(session, uid, Date.now())).length} of ${players.length} time's up`;
  if (closed(session) || started(session)) return undefined;
  if (data.told) return "the task, part 2";
  if (data.asked) return `the task, part 1, ${players.filter((uid) => answerOf(session, uid) !== undefined).length} of ${players.length} answered`;
  return "the task's name";
}
