import { useState } from "react";
import { GAMES, activeGame } from "./games";
import { removePlayer, setDisplay, setGame, setGameHidden, setHideBlurbs, setShowDownload, setUnlocked, store } from "./session";
import { Toggle } from "./Toggle";
import type { Session } from "./types";

const SETTINGS_OPEN_KEY = "ba.hostSettingsOpen";

/** A section the host can fold away; this phone remembers whether it's open. */
function useFold(key: string, openByDefault: boolean) {
  const [open, setOpen] = useState(() => {
    const saved = store.get(key);
    return saved ? saved === "yes" : openByDefault;
  });
  const onToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    const now = e.currentTarget.open;
    setOpen(now);
    store.set(key, now ? "yes" : "no");
  };
  return { open, onToggle };
}

/**
 * The host's phone (Screen tab): pick a game, then a player, then the game's controls choose what the main screen shows.
 * The game row stays at the top of every view, so the host can switch games directly (or go back to picking one).
 * The light has its own tab (it runs all evening, whatever game is on).
 */
export function HostRemote({ code, session }: { code: string; session: Session }) {
  const game = activeGame(session);
  const settingsFold = useFold(SETTINGS_OPEN_KEY, false);
  const players = Object.entries(session.players ?? {});
  const display = session.display ?? { step: "list" as const };
  const current = display.uid ? session.players?.[display.uid] : undefined;

  const remove = (uid: string, name: string) => {
    if (confirm(`Remove ${name} and everything they submitted? They can then rejoin fresh.`)) void removePlayer(code, uid);
  };
  // Always first, so it keeps its place on every view: one compact row, the game on now in gold.
  const gamePicker = (
    <div className="remote-game">
      <div className="remote-head">
        <h2>Game</h2>
        {/* Back to the main screen's game picker. Disabled, not removed, so the row never changes shape. */}
        <button className="link" disabled={!game} onClick={() => void setGame(code, null)}>← All games</button>
      </div>
      <div className="choices" role="group" aria-label="Game">
        {Object.values(GAMES).map((g) => (
          <button key={g.id} className={g.id === game?.id ? "active" : ""} aria-pressed={g.id === game?.id}
            onClick={() => { if (g.id !== game?.id) void setGame(code, g.id); }}>{g.name}</button>
        ))}
      </div>
    </div>
  );
  // Session-wide settings for the main screen: set once, so folded away at the bottom (under the players on a phone).
  const settings = (
    <details className="fold remote-settings" {...settingsFold}>
      <summary><h2>Settings (main screen)</h2></summary>
      <div className="toggles">
        <Toggle label="Game descriptions" on={!session.hideBlurbs} onChange={(on) => void setHideBlurbs(code, !on)} />
        <Toggle label="Download button" on={!!session.showDownload} onChange={(on) => void setShowDownload(code, on)} />
      </div>
      {/* Only the main screen's picker leaves hidden games out; they stay above, so the host can still start one. */}
      <p className="muted small">Games on the main screen's picker:</p>
      <div className="toggles">
        {Object.values(GAMES).map((g) => (
          <Toggle key={g.id} label={g.name} on={!session.hiddenGames?.[g.id]} onChange={(on) => void setGameHidden(code, g.id, !on)} />
        ))}
      </div>
    </details>
  );

  // Phone: game, players, settings. Wide screen (an iPad in landscape): game and settings on the left, players on the right.
  const layout = (playerSide: React.ReactNode) => (
    <section className="remote split">
      {gamePicker}
      <div className="remote-players">{playerSide}</div>
      {settings}
    </section>
  );

  // Just the names (and remove): on the game selection screen, and in games the host runs.
  const plainList = (
    <>
      {players.length === 0 && <p className="muted">No players yet.</p>}
      <ul className="picker">
        {players.map(([uid, p]) => (
          <li key={uid}>
            <button disabled><span>{p.name}</span></button>
            <button className="x" aria-label={`Remove ${p.name}`} onClick={() => remove(uid, p.name)}>×</button>
          </li>
        ))}
      </ul>
    </>
  );

  if (!game) {
    return layout(
      <>
        <h2>Players ({players.length})</h2>
        {plainList}
      </>,
    );
  }

  if (display.step !== "list" && display.uid && current) {
    return layout(
      <>
        <h2>{current.name}</h2>
        <game.HostPlayer code={code} session={session} display={display} uid={display.uid} />
        <button className="link" onClick={() => void setDisplay(code, { step: "curtain" })}>Lower the curtain</button>
      </>,
    );
  }

  return layout(
    <>
      <h2>Players ({players.length})</h2>
      <game.HostLobby code={code} session={session} display={display} />
      {!game.status ? plainList : <>
      {players.length === 0 && <p className="muted">No players yet.</p>}
      <ul className="picker">
        {players.map(([uid, p]) => {
          const status = game.status!(session, uid);
          const data = session.games?.[game.id];
          const unlocked = !!(data && "unlocked" in data && data.unlocked?.[uid]);
          return (
            <li key={uid}>
              <button disabled={status !== "submitted"} onClick={() => void setDisplay(code, { uid, step: game.firstStep })}>
                <span>{p.name}</span>
                <span className="muted small">
                  {status === "submitted" ? "✓ submitted" : status === "sending" ? "sending…" : "waiting"}
                  {unlocked && " · 🔓 may resubmit"}
                </span>
              </button>
              {status === "submitted" && (
                <button className="lock" aria-label={unlocked ? `Lock ${p.name}'s submission` : `Let ${p.name} resubmit`}
                  onClick={() => void setUnlocked(code, game.id, uid, !unlocked)}>{unlocked ? "🔓" : "🔒"}</button>
              )}
              <button className="x" aria-label={`Remove ${p.name}`} onClick={() => remove(uid, p.name)}>×</button>
            </li>
          );
        })}
      </ul>
      </>}
    </>,
  );
}
