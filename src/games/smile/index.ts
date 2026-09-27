import type { Game } from "..";
import { TITLE } from "./data";
import { HostLobby, HostPlayer } from "./HostControls";
import { PlayerView } from "./PlayerView";
import { Stage } from "./Stage";

/**
 * A light bulb and a buzzer go on for a second, seemingly at random; the players have to work out why.
 * The secret: the main screen's camera sets them off 3 seconds after anyone stops smiling.
 * The host runs it; nobody submits anything.
 */
export const smile: Game = {
  id: "smile",
  name: TITLE,
  blurb: "What sets off the light and the buzzer?",
  heading: () => TITLE,
  firstStep: "light",
  photoUrls: () => [],
  files: () => [],
  Stage,
  Player: PlayerView,
  HostPlayer,
  HostLobby,
};
