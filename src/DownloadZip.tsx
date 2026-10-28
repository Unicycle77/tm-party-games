import { useState } from "react";
import { CorsError, downloadAllMedia } from "./download";
import { GAMES } from "./games";
import { hasScores, scoreFiles } from "./scoreboard/zipScores";
import type { Session } from "./types";

/**
 * Saves every photo and video submitted in any of the session's games as one zip, with the scores at the top
 * (the scoreboard, the scores by task and the prize haul). `videos` false (the host remote) leaves the videos
 * out, since a phone has to hold the whole zip in memory: "⬇ Download photos & scores (19)", and the big
 * screen's ☰ Menu for the videos. The count is the photos and videos; with none, "⬇ Download the scores".
 */
export function useZip(code: string, session: Session, videos: boolean) {
  const players = session.players ?? {};
  const filesOf = (uid: string) => Object.values(GAMES).flatMap((game) => game.files(session, uid)).filter((f) => videos || f.name !== "video");
  const [progress, setProgress] = useState<[number, number]>();
  const [error, setError] = useState<string>();
  const fileCount = Object.keys(players).reduce((n, uid) => n + filesOf(uid).length, 0);
  const videosLeftOut = !videos && Object.keys(players).some((uid) => Object.values(GAMES).some((game) => game.files(session, uid).some((f) => f.name === "video")));
  const scores = hasScores(session);
  const media = videos ? "photos & videos" : "photos";
  const label = !scores ? `⬇ Download all ${media} (${fileCount})`
    : fileCount ? `⬇ Download ${videos ? "photos, videos" : "photos"} & scores (${fileCount})`
    : "⬇ Download the scores";
  const busy = progress && (fileCount ? `Zipping ${progress[0]} / ${progress[1]}…` : "Zipping…");

  async function run() {
    setError(undefined);
    setProgress([0, fileCount]);
    try {
      await downloadAllMedia(code, players, filesOf, (done, total) => setProgress([done, total]), scoreFiles(session));
    } catch (e) {
      setError(
        e instanceof CorsError ? `${e.message} See "Downloading everything" in the README.`
          : e instanceof Error ? e.message : "Download failed.",
      );
    } finally {
      setProgress(undefined);
    }
  }

  return { label, busy, error, videosLeftOut, disabled: (fileCount === 0 && !scores) || !!progress, run, clearError: () => setError(undefined) };
}

/** The host remote's download, at the top of Party settings: the button shows its own progress. */
export function DownloadZip({ code, session }: { code: string; session: Session }) {
  const zip = useZip(code, session, false);
  return (
    <div className="download">
      <button disabled={zip.disabled} onClick={() => void zip.run()}>{zip.busy ?? zip.label}</button>
      {zip.videosLeftOut && <p className="muted small">Videos download from the big screen's ☰ Menu.</p>}
      {zip.error && <p className="error small">{zip.error}</p>}
    </div>
  );
}

/**
 * The big screen's zip, started from the ☰ Menu: while it runs, the greyed "Zipping 4 / 10…" sits in the
 * bottom-left corner over whatever is on, and gone once the browser has it. An error stays there until clicked.
 */
export function ZipProgress({ zip }: { zip: ReturnType<typeof useZip> }) {
  if (zip.busy) return <div className="corner-download"><button disabled>{zip.busy}</button></div>;
  if (zip.error) return <button className="corner-download corner-error error small" onClick={zip.clearError}>{zip.error}</button>;
  return null;
}
