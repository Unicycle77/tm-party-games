import type { Game } from "..";
import { lazyPart } from "../lazyPart";
import { closed, duckStatus, holdsScreen } from "./data";

/**
 * Median duck (backlog task 4): every guest draws a duck on a sheet of paper on their phone, in ten markers, against the
 * host's 100-second clock, and can send it early. The app measures each duck's silhouette (the outline filled in, the ink
 * itself; only the largest shape), and on the TV the ducks line up in size order and the ends are knocked out a pair at a
 * time until the median duck is left: it alone scores (5). Drawn from strokes: no uploads.
 */
export const duck: Game = {
  id: "duck",
  name: "Median duck",
  medium: "Paper",
  blurb: "Draw a duck. Only the one in the middle scores.",
  heading: () => "Median duck",
  firstStep: "ducks",
  together: true,
  status: duckStatus,
  photoUrls: () => [],
  files: () => [],
  canShow: closed,
  holdsScreen,
  onScreen: (_, display) => display.step !== "ducks" ? undefined : display.numbers ? "the ducks, with their sizes" : "the ducks in a line",
  Stage: lazyPart(() => import("./Stage").then((m) => m.Stage)),
  Collecting: lazyPart(() => import("./Stage").then((m) => m.Collecting)),
  Player: lazyPart(() => import("./PlayerView").then((m) => m.PlayerView)),
  HostPlayer: lazyPart(() => import("./HostControls").then((m) => m.HostPlayer)),
  HostLobby: lazyPart(() => import("./HostControls").then((m) => m.HostLobby)),
  Round: lazyPart(() => import("./HostControls").then((m) => m.Round)),
};
