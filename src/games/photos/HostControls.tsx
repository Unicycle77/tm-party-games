import { setDisplay } from "../../session";
import type { Display, Session } from "../../types";
import { allPhotos } from "./data";

/**
 * The host's phone, with a player's photo on screen: the photo is the whole reveal, so there's nothing
 * to step through. "Lower the curtain" (below) leads back to the running order and its "Next".
 */
export function HostPlayer(_: { code: string; session: Session; display: Display; uid: string }) {
  return null;
}

/** The host's phone, above the player list: everyone's photo on one screen. */
export function HostLobby({ code, session, display }: { code: string; session: Session; display: Display }) {
  const photos = allPhotos(session);
  return (
    <div className="steps">
      <button
        className={display.step === "grid" ? "step active" : "step"}
        disabled={!Object.keys(session.players ?? {}).some((uid) => photos[uid]?.photo)}
        onClick={() => void setDisplay(code, display.step === "grid" ? { step: "list" } : { step: "grid" })}
      >
        {display.step === "grid" ? "✕ Close" : "◫ Show everyone"}
      </button>
    </div>
  );
}
