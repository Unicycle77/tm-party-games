import { haulWinner, prizePhotos } from "../games/prize/data";
import { renderHaul } from "../games/prize/haulImage";
import type { Session } from "../types";
import { renderScoreboard } from "./scoreboardImage";
import { buildScoresPdf } from "./scoresPdf";
import { sorted } from "./tasks";

/** True once the scoreboard has shown any points, so the zip has scores to add. */
export const hasScores = (session: Session) =>
  Object.values(session.scoreboard?.shown ?? {}).some((t) => Object.keys(t ?? {}).length);

/** The night's date: the day the first guest arrived, so a download a week later still says when the party was. */
function nightOf(session: Session): string | undefined {
  const first = Math.min(...Object.values(session.players ?? {}).map((p) => p.joinedAt).filter((t) => t > 0));
  return Number.isFinite(first) ? new Date(first).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : undefined;
}

/**
 * The scores for the top of the download-all zip. Once the night is decided (the haul has a winner): "Final
 * scoreboard.png", "Scores by task.pdf" and, with any prize photos in, "Prize haul.png". Before that the names say
 * how far the night got ("Scoreboard after task 5 of 8.png", "Scores by task so far.pdf") and there's no haul.
 */
export function scoreFiles(session: Session): { name: string; render: () => Promise<Blob> }[] {
  if (!hasScores(session)) return [];
  const board = session.scoreboard;
  const winner = haulWinner(session);
  const shown = Object.keys(board?.shown ?? {}).length, all = Object.keys(board?.tasks ?? {}).length;
  const date = nightOf(session);
  const heading = session.name?.trim() || "Taskmaster party";
  const subtitle = winner ? ["Scores by task", date].filter(Boolean).join(" · ") : `Scores so far · after ${shown} of ${all} tasks`;
  const pdf = async () => new Blob([(await buildScoresPdf(board, heading, subtitle, winner)) as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
  const files = [
    { name: winner ? "Final scoreboard.png" : `Scoreboard after task ${shown} of ${all}.png`, render: () => renderScoreboard(board) },
    { name: winner ? "Scores by task.pdf" : "Scores by task so far.pdf", render: pdf },
  ];
  const contestants = board?.contestants ?? {};
  const photos = prizePhotos(session);
  const prizes = sorted(contestants).flatMap(([id, c]) => (photos[id]?.[0] ? [{ from: c.name, photo: photos[id]![0]! }] : []));
  if (winner && contestants[winner] && prizes.length)
    files.push({ name: "Prize haul.png", render: () => renderHaul(contestants[winner]!.name, contestants[winner]!.photo, prizes) });
  return files;
}
