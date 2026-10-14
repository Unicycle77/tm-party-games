import { useState } from "react";
import { asList, asNums, fmt } from "./JukeboxRemote";
import { setJukeboxState } from "./session";
import type { Session } from "./types";

/**
 * A task's song, on its run-of-show row and its page: a small remote for the jukebox. One tap plays it on
 * the big screen (once: Repeat goes off), another pauses it. It goes gold while it plays, whoever started
 * it. Disabled, with the reason, while the main screen's music folder isn't open or the song isn't in it.
 */
export function SongStrip({ code, session, song }: { code: string; session: Session; song: string }) {
  const jukebox = session.jukebox;
  const tracks = asList(jukebox?.tracks);
  const i = tracks.indexOf(song);
  const state = jukebox?.state ?? {};
  const playing = i >= 0 && state.current === i && state.playing === true;
  const problem = !jukebox?.open ? "music folder not open" : i < 0 ? "not in the music folder" : undefined;
  const toggle = () => void setJukeboxState(code, playing ? { playing: false } : { current: i, playing: true, repeat: false });
  return (
    <button className={`sb-song${playing ? " active" : ""}`} disabled={!!problem} onClick={toggle}
      aria-label={playing ? `Pause ${song}` : `Play ${song}`}>
      <span className="title">{playing ? "⏸" : "♪"} {song}</span>
      <span className="dur">{problem ?? `${playing ? "" : "▶ "}${fmt(asNums(jukebox?.durations)[i])}`}</span>
    </button>
  );
}

/**
 * Picking a task's song in ✎: the jukebox's song list, as the main screen last read it (so it works with
 * the PC off), opened inline under the field. A song that has since left the folder shows struck through.
 */
export function SongField({ session, song, onChange }: { session: Session; song: string; onChange: (song: string) => void }) {
  const [open, setOpen] = useState(false);
  const tracks = asList(session.jukebox?.tracks);
  const durations = asNums(session.jukebox?.durations);
  const at = session.jukebox?.tracksAt;
  const i = song ? tracks.indexOf(song) : -1;
  if (tracks.length === 0 && !song) {
    return (
      <div className="sb-song-field">
        <span className="label">Song (optional)</span>
        <p className="muted small">Open the music folder on the main screen once to pick songs.</p>
      </div>
    );
  }
  return (
    <div className="sb-song-field">
      <span className="label">Song (optional)</span>
      <div className="sb-song-pick">
        <button type="button" className="pick" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="title">{!song ? "No song" : i < 0 ? <s>♪ {song}</s> : `♪ ${song}`}</span>
          <span className="dur">{i >= 0 && fmt(durations[i])} {open ? "▴" : "▾"}</span>
        </button>
        {song && <button type="button" className="x" aria-label="No song" onClick={() => { onChange(""); setOpen(false); }}>✕</button>}
      </div>
      {song && i < 0 && <p className="muted small">Not in the music folder any more. Pick another, or ✕.</p>}
      {open && (
        <>
          <ul className="tracklist">
            {tracks.map((t, n) => (
              <li key={n}>
                <button type="button" className={n === i ? "active" : ""} onClick={() => { onChange(t); setOpen(false); }}>
                  <span className="title">{n === i ? "♪ " : ""}{t}</span>
                  <span className="dur">{fmt(durations[n])}</span>
                </button>
              </li>
            ))}
          </ul>
          {at && <p className="muted small">From the main screen's music folder, as it was on {new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.</p>}
        </>
      )}
    </div>
  );
}
