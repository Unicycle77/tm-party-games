import type { Game } from "..";
import { headshots } from "./data";
import { HostLobby, HostPlayer } from "./HostControls";
import { PlayerView } from "./PlayerView";
import { Stage } from "./Stage";

/**
 * The Headshot task: shown like Photos, but its photos are the scoreboard's headshots (added by the host
 * or at check-in), so nobody submits anything. Only on the scoreboard's task list, never the game picker.
 */
export const headshotsGame: Game = {
  id: "headshots",
  name: "Headshot",
  blurb: "Everyone's scoreboard headshot, shown like Photos.",
  heading: () => "Headshots",
  firstStep: "photo",
  scoreboardOnly: true,
  onScreen: (session, display) => {
    const c = display.contestant && session.scoreboard?.contestants?.[display.contestant];
    return c && display.step === "photo" ? `${c.name}'s headshot` : display.step === "grid" ? "everyone's headshots" : undefined;
  },
  photoUrls: (session) => headshots(session).map(([, c]) => c.photo),
  files: () => [],
  Stage,
  Player: PlayerView,
  HostPlayer,
  HostLobby,
};
