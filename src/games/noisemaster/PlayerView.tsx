import { useState } from "react";
import { GuestCard, Status, afterwards, useGuest } from "../../guest";
import type { Session } from "../../types";
import { elapsedOf, formatTime, press, roundOf, useServerNow } from "./data";
import { Soundboard } from "./Soundboard";

/**
 * A player's phone. The one playing gets the soundboard: 16 blank buttons, each making its sound on the
 * big screen. The phrase is on their phone, not the big screen. Everyone else watches: no card, just a status
 * line saying who's up. Nothing buzzes or plays when a guest is picked: the host calls their name.
 */
export function PlayerView({ code, uid, session }: { code: string; uid: string; session: Session }) {
  const round = roundOf(session);
  const [error, setError] = useState<string>();
  const running = !!round?.firstAt && !round.doneAt;
  const now = useServerNow(running && round?.player === uid);
  const { task, left } = useGuest();

  if (!round) return <Status>Waiting for the host to pick a player.</Status>;
  if (round.player !== uid) return <Status>{session.players?.[round.player]?.name ?? "Someone"} is at the soundboard. Watch the big screen.</Status>;

  const done = !!round.doneAt;
  const time = formatTime(elapsedOf(round, now));
  const tap = (i: number) => {
    setError(undefined);
    void press(code, i).catch(() => setError("That press didn't go through. Try again."));
  };

  return (
    <>
      <Status>{done ? afterwards(`Done in ${time}.`, left) : "You're up! Make the big screen say your phrase."}</Status>
      <GuestCard label={task?.label ?? "Noisemaster"} title="Your phrase">
        {/* the phrase is only on the phones (this one and the host's), never on the big screen */}
        <ol className="phrase">
          {round.phrase.map((word, k) => <li key={k} className={k < (round.progress ?? 0) ? "said" : undefined}>{word}</li>)}
        </ol>
        {/* the board first, so it never moves under their thumb when the words below change */}
        <Soundboard onPress={tap} disabled={done} />
        {done ? <span className="stamp">✓ Done in {time}</span>
          : running ? <p className="slot-hint">⏱ <strong className="soundboard-time">{time}</strong>. Keep going!</p>
          : <p className="slot-hint">Each button plays a sound up there. Get one wrong and you start the phrase again. The clock starts on your first press.</p>}
        {error && <p className="error">{error}</p>}
      </GuestCard>
    </>
  );
}
