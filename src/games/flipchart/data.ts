import { ref, update } from "firebase/database";
import { db } from "../../firebase";
import type { ScoreboardTask } from "../../types";
import { drawRound } from "../drawRound";

export const DEFAULT_DRAW = "a portrait of the Taskmaster";
export const DEFAULT_MINUTES = 20;
/** The time limits the host picks from. */
export const MINUTES = [10, 15, 20, 30] as const;
const EXTRA_MS = 5 * 60_000;

/** The task's words, as the show wrote them, with what the guests draw filled in. The host only ever changes `draw`. */
export const flipchartWords = (draw?: string) =>
  `Draw ${draw?.trim() || DEFAULT_DRAW} using 16 A1 pages. You may not remove the A1 pages from the flipchart during your drawing. After the task, the A1 pages will be laid out in the pattern shown on the front page. You may only draw on the flipchart paper.`;

/** What a new Flipchart task on the list starts with. */
export const flipchartDefaults = () => ({ draw: DEFAULT_DRAW, minutes: DEFAULT_MINUTES, text: flipchartWords(DEFAULT_DRAW) });

const round = drawRound("flipchart", (task) => minutesOf(task) * 60_000);

/** The Flipchart task on the run of show (it's on the list at most once). */
export const flipchartTask = round.taskOf;

export const minutesOf = (task: ScoreboardTask | undefined) => task?.minutes ?? DEFAULT_MINUTES;
export const drawOf = (task: ScoreboardTask | undefined) => task?.draw?.trim() || DEFAULT_DRAW;

export const { dataOf, started, closed, running, holdsScreen, sentCount, useRemaining, startClock, drewIn, roundOver, settleOldRound, endNow } = round;
/** Sent by the guest, or final because the time is up. */
export const flipchartStatus = round.status;

/** Host: five more minutes for everyone, while the clock runs. */
export const addFiveMinutes = (code: string, endsAt: number) => round.addTime(code, endsAt, EXTRA_MS);

/** The round itself, for what every drawing task shares (the main screen's closer, the clock, a guest moving phones). */
export const flipchartRound = round;

/** Saves a task's what-they-draw and time limit (its words follow from them, see `editTask`). */
export const editFlipchart = (code: string, id: string, draw: string, minutes: number) =>
  update(ref(db(), `sessions/${code}/scoreboard/tasks/${id}`), { draw: draw.trim() || null, minutes });
