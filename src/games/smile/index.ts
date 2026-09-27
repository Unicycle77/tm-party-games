import type { Game } from "..";
import { TITLE } from "./data";
import { HostLobby, HostPlayer } from "./HostControls";
import { PlayerView } from "./PlayerView";
import { Stage } from "./Stage";

/**
 * A red light bulb goes on for a second, seemingly at random; the players have to work out why, fastest wins.
 * The secret: the main screen's camera turns it on 2 seconds after anyone stops smiling.
 * The host runs it; nobody submits anything.
 */
export const smile: Game = {
  id: "smile",
  name: TITLE,
  blurb: "Why does the light bulb turn on?",
  heading: () => TITLE,
  firstStep: "light",
  photoUrls: () => [],
  files: () => [],
  Stage,
  Player: PlayerView,
  HostPlayer,
  HostLobby,
};
