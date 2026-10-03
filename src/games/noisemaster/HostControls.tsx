import { useState } from "react";
import { setDisplay } from "../../session";
import type { Display, NoisemasterRound, Session } from "../../types";
import {
  BUTTONS, MAX_WORDS, elapsedOf, formatTime, newRound, restartRound, roundOf, soundsOf, startRound,
  useNoisemasterSecret, useServerNow,
} from "./data";

/** Not used: this game never shows one player on their own. */
export const HostPlayer = () => null;

/** The host's phone, above the player list: set up a round, then follow it. */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const round = roundOf(session);
  return round
    ? <RoundControls code={code} session={session} display={display} round={round} />
    : <Setup code={code} session={session} />;
}

const shuffle = <T,>(xs: T[]) => xs.map((x) => [Math.random(), x] as const).sort(([a], [b]) => a - b).map(([, x]) => x);

/** The last round's phrase and decoys, so the next player can get the same one. */
let lastSetup: { phrase: string[]; decoys: string[] } = { phrase: [], decoys: [] };

function Setup({ code, session }: { code: string; session: Session }) {
  const players = Object.entries(session.players ?? {}).sort(([, x], [, y]) => (x.joinedAt ?? 0) - (y.joinedAt ?? 0));
  const played = session.games?.noisemaster?.played ?? {};
  const sounds = soundsOf(session);
  const [player, setPlayer] = useState<string>();
  const [phrase, setPhrase] = useState(() => lastSetup.phrase.filter((w) => sounds.includes(w)));
  const [decoys, setDecoys] = useState(() => lastSetup.decoys.filter((w) => sounds.includes(w)));
  const [adding, setAdding] = useState<"phrase" | "decoys">("phrase");
  const [filter, setFilter] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // Each word of the phrase is on one button (however often it's said); decoys fill the rest.
  const words = [...new Set(phrase)];
  const room = BUTTONS - words.length;
  const ready = !!player && !!session.players?.[player] && phrase.length > 0 && sounds.length >= BUTTONS;
  const shown = sounds.filter((s) => s.toLowerCase().includes(filter.trim().toLowerCase()));

  function pickRandom() {
    const ids = players.map(([uid]) => uid);
    setPlayer([...shuffle(ids.filter((uid) => !played[uid])), ...shuffle(ids.filter((uid) => played[uid]))][0]);
  }

  function tapSound(sound: string) {
    if (adding === "phrase") {
      if (phrase.length >= MAX_WORDS) return;
      const next = [...phrase, sound];
      setPhrase(next);
      setDecoys(decoys.filter((d) => d !== sound).slice(0, BUTTONS - new Set(next).size));
    } else if (!words.includes(sound)) {
      setDecoys(decoys.includes(sound) ? decoys.filter((d) => d !== sound) : decoys.length < room ? [...decoys, sound] : decoys);
    }
  }

  async function start() {
    if (!ready || !player) return;
    // The picked decoys, then any others at random to fill the board; then the buttons are shuffled.
    const picked = decoys.filter((d) => !words.includes(d)).slice(0, room);
    const others = shuffle(sounds.filter((s) => !words.includes(s) && !picked.includes(s)));
    const board = shuffle([...words, ...picked, ...others.slice(0, room - picked.length)]);
    lastSetup = { phrase, decoys: picked };
    setBusy(true);
    setError(undefined);
    try { await startRound(code, player, phrase, board); }
    catch { setError("Couldn't start the round. Try again."); setBusy(false); }
  }

  return (
    <div className="box-setup">
      <div className="remote-head">
        <h3>1. Who plays?</h3>
        <button className="link" disabled={players.length === 0} onClick={pickRandom}>🎲 Pick at random</button>
      </div>
      {players.length === 0 && <p className="muted small">Waiting for contestants to join…</p>}
      <div className="choices two">
        {players.map(([uid, p]) => (
          <button key={uid} className={uid === player ? "active" : ""} aria-pressed={uid === player} onClick={() => setPlayer(uid)}>
            {p.name}{played[uid] && <span className="played">played</span>}
          </button>
        ))}
      </div>

      <div className="remote-head">
        <h3>2. The phrase</h3>
        {phrase.length > 0 && <button className="link" onClick={() => setPhrase([])}>Clear</button>}
      </div>
      {phrase.length === 0
        ? <p className="muted small">Tap up to {MAX_WORDS} sounds below, in order.</p>
        : (
          <ol className="phrase-edit">
            {phrase.map((word, k) => (
              <li key={k}><button aria-label={`Take out "${word}"`} onClick={() => setPhrase(phrase.filter((_, j) => j !== k))}>{word} ×</button></li>
            ))}
          </ol>
        )}

      <h3>3. Decoys</h3>
      <p className="muted small">
        {decoys.length} of {room} picked{decoys.length < room && `; the other ${room - decoys.length} are picked at random`}.
      </p>

      <h3>Sounds ({sounds.length})</h3>
      {sounds.length < BUTTONS
        ? <p className="muted small">The board needs at least {BUTTONS} sounds. Put them in a "Noisemaster" folder inside the main screen's music folder, then reload the music folder there.</p>
        : (
          <>
            <div className="choices">
              <button className={adding === "phrase" ? "active" : ""} aria-pressed={adding === "phrase"} onClick={() => setAdding("phrase")}>Add to the phrase</button>
              <button className={adding === "decoys" ? "active" : ""} aria-pressed={adding === "decoys"} onClick={() => setAdding("decoys")}>Pick decoys</button>
            </div>
            {sounds.length > 24 && <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a sound" />}
            <div className="choices sound-choices">
              {shown.map((sound) => {
                const inPhrase = words.includes(sound);
                const decoy = decoys.includes(sound);
                return (
                  <button key={sound} className={decoy ? "active" : ""} aria-pressed={adding === "decoys" ? decoy : undefined}
                    disabled={adding === "phrase" ? phrase.length >= MAX_WORDS : inPhrase || (!decoy && decoys.length >= room)}
                    onClick={() => tapSound(sound)}>
                    {sound}{inPhrase && <span className="played">phrase</span>}{decoy && <span className="played">decoy</span>}
                  </button>
                );
              })}
            </div>
          </>
        )}

      <button className="big" disabled={!ready || busy} onClick={() => void start()}>{busy ? "Starting…" : "Start Noisemaster"}</button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

/** A round in play: how it's going, the board (the host may see it; the player can't), restart, and on to the next. */
function RoundControls({ code, session, display, round }: { code: string; session: Session; display: Display; round: NoisemasterRound }) {
  const name = session.players?.[round.player]?.name ?? "?";
  const board = useNoisemasterSecret(code, true)?.board;
  const done = !!round.doneAt;
  const now = useServerNow(!!round.firstAt && !done);
  const time = formatTime(elapsedOf(round, now));
  const mistakes = round.mistakes ?? 0;
  const restarts = mistakes === 1 ? "1 restart" : `${mistakes} restarts`;
  const midway = !!round.firstAt && !done;

  return (
    <div className="box-setup">
      <h3>{name} at the soundboard</h3>
      <p className="muted small">“{round.phrase.join(" ")}”</p>
      <p className="box-wait">
        {done ? `✓ Done in ${time}, with ${restarts}.`
          : round.firstAt ? `⏱ ${time} · ${round.progress ?? 0} of ${round.phrase.length} words · ${restarts}`
          : `Waiting for ${name}'s first press…`}
      </p>
      {display.step !== "soundboard" && (
        <button onClick={() => void setDisplay(code, { step: "soundboard" })}>Show it on the big screen</button>
      )}
      <details className="board-key">
        <summary>The board</summary>
        <ol>{board?.map((sound, i) => <li key={i}>{sound}</li>)}</ol>
      </details>
      <div className="steps two">
        <button onClick={() => { if (!midway || confirm(`Restart ${name}'s go? The clock goes back to zero.`)) void restartRound(code, round); }}>↺ Restart</button>
        <button onClick={() => { if (!midway || confirm(`End ${name}'s go? They haven't finished.`)) void newRound(code); }}>Next round</button>
      </div>
    </div>
  );
}
