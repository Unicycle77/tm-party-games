import type { Game } from "..";
import { HostLobby, HostPlayer } from "./HostControls";
import { PlayerView } from "./PlayerView";
import { Stage } from "./Stage";

/**
 * One player, 16 blank buttons on their phone, each playing a sound on the stage: they press them in the
 * right order to make the stage say the host's phrase. A wrong press starts the phrase again; the clock
 * runs from the first press to the last word. The host runs it; nobody submits anything.
 */
export const noisemaster: Game = {
  id: "noisemaster",
  name: "Noisemaster",
  blurb: "Sixteen blank buttons. Make them say the phrase.",
  heading: () => "Noisemaster",
  firstStep: "soundboard",
  photoUrls: () => [],
  files: () => [],
  Stage,
  Player: PlayerView,
  HostPlayer,
  HostLobby,
};
