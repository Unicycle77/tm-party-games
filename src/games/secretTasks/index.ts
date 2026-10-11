import type { Game } from "..";
import { HostLobby } from "./HostControls";
import { PlayerView } from "./PlayerView";
import { Stage } from "./Stage";

/**
 * Every player is dealt a secret task when they check in, and keeps it all evening; no two players
 * get the same one. The host types the pool of tasks. Players open their sealed envelope on their phone
 * whenever they like (from any game: see Play.tsx). The host runs it; nobody submits anything.
 * The tasks are kept outside the session (secretTasks/{code}), so nobody can read another's.
 */
export const secretTasks: Game = {
  id: "secretTasks",
  name: "Secret Tasks",
  blurb: "A sealed envelope on your phone. Tell no one.",
  heading: () => "Secret Tasks",
  firstStep: "envelopes",
  photoUrls: () => [],
  files: () => [],
  Stage,
  Player: PlayerView,
  // Never used: this game never shows one player on their own.
  HostPlayer: () => null,
  HostLobby,
};
