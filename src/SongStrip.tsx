import { useState } from "react";
import { asList, asNums, fmt } from "./JukeboxRemote";
import { setJukeboxState } from "./session";
import type { Session } from "./types";

/**
 * A task's song, on its run-of-show row and its page: a small remote for the jukebox. One tap plays it on
 * the big screen (once: Repeat goes off), another pauses it. It is pressed in while it plays (never gold: gold stays on
 * the next thing to do), whoever started it. Disabled, with the reason, while the main screen's music folder isn't open or the song isn't in it,
 * and while a task's transition sound (music or video) plays: the song waits for it to finish.
 */
export function SongStrip({ code, session, song }: { code: string; session: Session; song: string }) {
  const jukebox = session.jukebox;
  const tracks = asList(jukebox?.tracks);
  const i = tracks.indexOf(song);
  const state = jukebox?.state ?? {};
  const playing = i >= 0 && state.current === i && state.playing === true;
  const stingTask = session.sting && session.scoreboard?.tasks?.[session.sting.task];
  const stingSounds = !!stingTask && !!(stingTask.transition || stingTask.transitionVideo);
  const problem = !jukebox?.open ? "music folder not open" : i < 0 ? "not in the music folder" : stingSounds ? "after the transition" : undefined;
  const toggle = () => void setJukeboxState(code, playing ? { playing: false } : { current: i, playing: true, repeat: false });
  return (
    <button className={`sb-song${playing ? " pressed-in" : ""}`} disabled={!!problem} onClick={toggle}
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
  return (
    <FolderPick label="Song (optional)" none="No song" glyph="♪" value={song} onChange={onChange} at={session.jukebox?.tracksAt}
      items={asList(session.jukebox?.tracks)} durations={asNums(session.jukebox?.durations)}
      empty="Open the music folder on the main screen once to pick songs." gone="Not in the music folder any more. Pick another, or ✕." />
  );
}

/**
 * One file picked from a list the main screen published from its music folder: a paper field ("♪ title 0:32 ▾", or
 * `none`) with ✕, opening the list inline, the chosen one gold. A title no longer in the list shows struck through.
 * The song's field, and each of a transition's three.
 */
export function FolderPick({ label, none, glyph, value, onChange, items, durations, at, empty, gone, name = (v) => v }: {
  label: string; none: string; glyph: string; value: string; onChange: (v: string) => void; name?: (file: string) => string;
  items: string[]; durations?: number[]; at?: number; empty: string; gone: string;
}) {
  const [open, setOpen] = useState(false);
  const i = value ? items.indexOf(value) : -1;
  if (items.length === 0 && !value) {
    return (
      <div className="sb-song-field">
        <span className="label">{label}</span>
        <p className="muted small">{empty}</p>
      </div>
    );
  }
  return (
    <div className="sb-song-field">
      <span className="label">{label}</span>
      <div className="sb-song-pick">
        <button type="button" className="pick" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span className="title">{!value ? none : i < 0 ? <s>{glyph} {name(value)}</s> : `${glyph} ${name(value)}`}</span>
          <span className="dur">{i >= 0 && durations && fmt(durations[i])} {open ? "▴" : "▾"}</span>
        </button>
        {value && <button type="button" className="x" aria-label={none} onClick={() => { onChange(""); setOpen(false); }}>✕</button>}
      </div>
      {value && i < 0 && <p className="muted small">{gone}</p>}
      {open && (
        <>
          <ul className="tracklist">
            {items.map((t, n) => (
              <li key={n}>
                <button type="button" className={n === i ? "active" : ""} onClick={() => { onChange(t); setOpen(false); }}>
                  <span className="title">{n === i ? `${glyph} ` : ""}{name(t)}</span>
                  {durations && <span className="dur">{fmt(durations[n])}</span>}
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
