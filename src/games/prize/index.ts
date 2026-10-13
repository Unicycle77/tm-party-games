import type { Game } from "..";
import { prizePhotos } from "./data";
import { HostLobby, HostPlayer } from "./HostControls";
import { PlayerView } from "./PlayerView";
import { Stage } from "./Stage";

/**
 * The Prize task: each guest sends photos of the prize they brought (from check-in, on their own card),
 * and the host presents them one by one, in no set order, picking which photo goes on the big screen.
 * Keyed by scoreboard contestant. Every new party's run of show starts with it; never on the game picker.
 * The winner's haul at the end of the party belongs to the scoreboard, not to this game.
 */
export const prize: Game = {
  id: "prize",
  name: "Prize task",
  blurb: "Everyone's prize, presented one by one.",
  heading: () => "Prize task",
  firstStep: "photo",
  scoreboardOnly: true,
  headInLobby: true,
  onScreen: (session, display) => {
    const c = display.contestant && session.scoreboard?.contestants?.[display.contestant];
    return c && display.step === "photo" ? `${c.name}'s prize, photo ${(display.index ?? 0) + 1}` : undefined;
  },
  photoUrls: (session) => Object.values(prizePhotos(session)).flat(),
  files: () => [],
  Stage,
  Player: PlayerView,
  HostPlayer,
  HostLobby,
};
