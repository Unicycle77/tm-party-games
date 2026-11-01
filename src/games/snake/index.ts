import type { Game } from "..";
import { lazyPart } from "../lazyPart";
import { closed, holdsScreen, snakeStatus } from "./data";

/**
 * Second longest snake (backlog task 6): every guest draws a snake on a roll of toilet paper on their phone, pulling more
 * paper off the roll and rolling it back up, against the host's 3-minute clock. At 0:00 whatever is still out tears off at
 * the nearest perforation and doesn't count. On the TV every roll unrolls at once, the longest finishing last; the app
 * measures each snake along its centre line, and only the second longest scores (5). Drawn from strokes: no uploads.
 */
export const snake: Game = {
  id: "snake",
  name: "Second longest snake",
  medium: "Toilet roll",
  blurb: "Draw a snake on a toilet roll. Only the second longest scores.",
  heading: () => "Second longest snake",
  firstStep: "snakes",
  together: true,
  status: snakeStatus,
  photoUrls: () => [],
  files: () => [],
  canShow: closed,
  holdsScreen,
  onScreen: (_, display) => display.step !== "snakes" ? undefined : display.numbers ? "the snakes, with their lengths" : "the snakes unrolling",
  Stage: lazyPart(() => import("./Stage").then((m) => m.Stage)),
  Collecting: lazyPart(() => import("./Stage").then((m) => m.Collecting)),
  Player: lazyPart(() => import("./PlayerView").then((m) => m.PlayerView)),
  HostPlayer: lazyPart(() => import("./HostControls").then((m) => m.HostPlayer)),
  HostLobby: lazyPart(() => import("./HostControls").then((m) => m.HostLobby)),
  Round: lazyPart(() => import("./HostControls").then((m) => m.Round)),
};
