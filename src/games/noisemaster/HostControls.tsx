import { useState } from "react";
import { setDisplay } from "../../session";
import { Toggle } from "../../Toggle";
import type { Display, NoisemasterRound, Session } from "../../types";
import {
  BUTTONS, MAX_WORDS, elapsedOf, formatTime, newRound, press, restartRound, roundOf, soundsOf, startRound,
  useNoisemasterSecret, useServerNow,
} from "./data";
import { Soundboard } from "./Soundboard";

/** The host's phone, above the player list: set up a round, then follow it. */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const round = roundOf(session);
  return round
    ? <RoundControls code={code} session={session} display={display} round={round} />
    : <Setup code={code} session={session} />;
}

/** Fills out a typed board that has fewer than 16 words, so a round can be tested without any sound files. */
const FILLER = ["apple", "river", "banana", "window", "tiger", "purple", "guitar", "cloud", "pencil", "rocket", "button", "garden", "pickle", "candle", "monkey", "bridge", "castle", "orange", "pillow", "thunder", "ladder", "violin", "pepper", "island", "mirror", "turtle", "basket", "engine", "feather", "lantern", "marble", "napkin", "otter", "pirate", "quilt", "ribbon", "saddle", "tunnel", "umbrella", "walnut"];

/** "Hello, big world" → ["hello", "big", "world"] */
const parseWords = (text: string) => text.toLowerCase().split(/[\s,]+/).filter(Boolean);

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
  // With no sound files, the phrase and decoys are typed and spoken by the main screen's voice.
  const typed = sounds.length < BUTTONS;
  const [typedPhrase, setTypedPhrase] = useState(lastSetup.phrase.join(" "));
  const [typedDecoys, setTypedDecoys] = useState(lastSetup.decoys.join(" "));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  // Each word of the phrase is on one button (however often it's said); decoys fill the rest.
  const phraseWords = typed ? parseWords(typedPhrase).slice(0, MAX_WORDS) : phrase;
  const words = [...new Set(phraseWords)];
  const room = BUTTONS - words.length;
  const typedDecoyWords = [...new Set(parseWords(typedDecoys))].filter((w) => !words.includes(w)).slice(0, room);
  const ready = !!player && !!session.players?.[player] && phraseWords.length > 0;
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
    const picked = typed ? typedDecoyWords : decoys.filter((d) => !words.includes(d)).slice(0, room);
    const others = shuffle((typed ? FILLER : sounds).filter((s) => !words.includes(s) && !picked.includes(s)));
    // One button per word, however often the phrase says it.
    const board = shuffle([...new Set([...words, ...picked, ...others.slice(0, room - picked.length)])]);
    lastSetup = { phrase: phraseWords, decoys: picked };
    setBusy(true);
    setError(undefined);
    try { await startRound(code, player, phraseWords, board); }
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

      {typed ? (
        <>
          <h3>2. The phrase</h3>
          <p className="muted small">No sound files here, so type the words: the main screen will say them out loud. Up to {MAX_WORDS}, in order.</p>
          <input value={typedPhrase} onChange={(e) => setTypedPhrase(e.target.value)} placeholder="e.g. the quick brown fox" aria-label="The phrase" />
          <h3>3. Decoys</h3>
          <p className="muted small">Up to {room}, separated by spaces or commas; the board is filled out with random words.</p>
          <input value={typedDecoys} onChange={(e) => setTypedDecoys(e.target.value)} placeholder="e.g. cat dog banana" aria-label="Decoys" />
        </>
      ) : (
        <>
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

/** A round in play: how it's going, the board with its words (the host may see them; the player can't), restart, and on to the next. */
function RoundControls({ code, session, display, round }: { code: string; session: Session; display: Display; round: NoisemasterRound }) {
  const name = session.players?.[round.player]?.name ?? "?";
  const board = useNoisemasterSecret(code, true)?.board;
  const done = !!round.doneAt;
  const now = useServerNow(!!round.firstAt && !done);
  const time = formatTime(elapsedOf(round, now));
  const mistakes = round.mistakes ?? 0;
  const restarts = mistakes === 1 ? "1 restart" : `${mistakes} restarts`;
  const midway = !!round.firstAt && !done;
  // Off by default: the host's copy of the board is a picture, unless they switch on pressing it (to test, or to demonstrate).
  const [pressing, setPressing] = useState(false);

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
      <div className="toggles">
        <Toggle label="Let me press the buttons" on={pressing} onChange={setPressing} />
      </div>
      {/* the host's copy of the board, words and all: a picture to follow along on, or real buttons while the switch is on */}
      {board && (pressing
        ? <Soundboard words={board} last={round.last} onPress={(i) => void press(code, i).catch(() => {})} disabled={done} />
  const [pressError, setPressError] = useState<string>();
        : <Soundboard words={board} last={round.last} />)}
      <div className="steps two">
        <button onClick={() => { if (!midway || confirm(`Restart ${name}'s go? The clock goes back to zero.`)) void restartRound(code, round); }}>↺ Restart</button>
        <button onClick={() => { if (!midway || confirm(`End ${name}'s go? They haven't finished.`)) void newRound(code); }}>Next round</button>
      </div>
    </div>
  );
}
      {pressError && <p className="error">{pressError}</p>}
