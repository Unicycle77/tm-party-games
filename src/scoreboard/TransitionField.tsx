import { FolderPick } from "../SongStrip";
import type { ReactNode } from "react";
import type { ScoreboardTask, Session } from "../types";
import { asList, asNums, fmt } from "../JukeboxRemote";

export interface TransitionDraft { music: string; picture: string; video: string }

/** A file's name without its extension, for pictures and videos (music titles have none already). */
export const bare = (file: string) => file.replace(/\.[^.]+$/, "");

/**
 * A task's transition in ✎: what plays the moment the host starts it. Music, a picture, both, or a video, each from its own
 * subfolder of the main screen's music folder. A video has its own sound, so picking one clears the other two, and the other way round.
 */
export function TransitionField({ session, draft, onChange }: { session: Session; draft: TransitionDraft; onChange: (d: TransitionDraft) => void }) {
  const jukebox = session.jukebox;
  const at = jukebox?.tracksAt;
  return (
    <>
      <p className="muted small">Plays on the big screen the moment you tap Start.</p>
      <FolderPick label="Music" none="No music" glyph="♪" value={draft.music} at={at}
        items={asList(jukebox?.transitions)} durations={asNums(jukebox?.transitionDurations)}
        onChange={(music) => onChange({ ...draft, music, video: music ? "" : draft.video })}
        empty="Put short tracks in a Transition music folder inside the music folder." gone="Not in Transition music any more. Pick another, or ✕." />
      <FolderPick label="Picture" none="No picture" glyph="🖼" value={draft.picture} name={bare}
        items={asList(jukebox?.transitionPictures)}
        onChange={(picture) => onChange({ ...draft, picture, video: picture ? "" : draft.video })}
        empty="Put pictures in a Transition pictures folder inside the music folder." gone="Not in Transition pictures any more. Pick another, or ✕." />
      <FolderPick label="Or a video, on its own" none="No video" glyph="▶" value={draft.video} name={bare}
        items={asList(jukebox?.transitionVideos)} durations={asNums(jukebox?.transitionVideoDurations)}
        onChange={(video) => onChange(video ? { music: "", picture: "", video } : { ...draft, video })}
        empty="Put videos in a Transition videos folder inside the music folder." gone="Not in Transition videos any more. Pick another, or ✕." />
      <p className="muted small">{draft.video ? "A video has its own sound, so it plays on its own." : draft.picture && !draft.music ? "A picture on its own stays up until you put something else on the big screen." : draft.picture ? "The picture comes down when the music ends." : ""}</p>
    </>
  );
}

/**
 * The Start button's second line for a task's transition: "♪ Task fanfare · 0:08 · 🖼 Dice tower", or "▶ Drumroll cam · 0:12".
 * A piece no longer in its folder is struck through and greyed, "not found" after it; with the music folder closed the whole
 * line is greyed, the reason at its end. Start still works and skips what it can't play.
 */
export function transitionLine(session: Session, task: ScoreboardTask): { line: ReactNode; problem?: string } | undefined {
  const jukebox = session.jukebox;
  const piece = (glyph: string, file: string | undefined, list: unknown, lengths?: unknown, name = (f: string) => f) => {
    if (!file) return undefined;
    const i = asList(list).indexOf(file);
    const n = lengths ? asNums(lengths)[i] : 0;
    return { here: i >= 0, text: `${glyph} ${name(file)}`, length: i >= 0 && n ? ` · ${fmt(n)}` : "" };
  };
  const pieces = (task.transitionVideo
    ? [piece("▶", task.transitionVideo, jukebox?.transitionVideos, jukebox?.transitionVideoDurations, bare)]
    : [piece("♪", task.transition, jukebox?.transitions, jukebox?.transitionDurations), piece("🖼", task.transitionImage, jukebox?.transitionPictures, undefined, bare)]
  ).filter((p) => !!p);
  if (!pieces.length) return undefined;
  const closed = !jukebox?.open;
  const allGone = pieces.every((p) => !p.here);
  const line = pieces.map((p, k) => (
    <span key={k}>{k > 0 && " · "}{closed || p.here ? <>{p.text}{p.length}</> : <span className="missing"><s>{p.text}</s> not found</span>}</span>
  ));
  return { line: <>{line}{closed && " · music folder not open"}</>, problem: closed ? "music folder not open" : allGone ? "not in the folder" : undefined };
}
