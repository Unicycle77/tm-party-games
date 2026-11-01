import type { Game } from "..";
import { lazyPart } from "../lazyPart";
import { onScreen } from "./onScreen";
import { closed, fruitStatus, holdsScreen, inOrder } from "./data";

/**
 * Fruit selfie (backlog task 5, the show's "Draw a picture of yourself eating some fruit on this tablet"): part 1 asks every
 * guest how long it takes them to eat an orange; part 2 says that's their time to draw themselves eating some fruit on their
 * phone, without using their hands, getting angrier. Everyone draws at once; one clock counts up on the TV beside the names,
 * shortest time first, and each phone closes at its own time. Then each picture in the gold frame, and points by hand.
 * Drawn from strokes: no uploads. Design: fruit-selfie/framing.md (project files).
 */
export const fruit: Game = {
  id: "fruit",
  name: "Fruit selfie",
  blurb: "Say how long an orange takes you. That's your time to draw yourself eating fruit, no hands.",
  heading: () => "Fruit selfie",
  firstStep: "selfie",
  status: fruitStatus,
  order: inOrder,
  ownList: true,
  photoUrls: () => [],
  files: () => [],
  canShow: closed,
  holdsScreen,
  onScreen,
  Stage: lazyPart(() => import("./Stage").then((m) => m.Stage)),
  Collecting: lazyPart(() => import("./Stage").then((m) => m.Collecting)),
  Side: lazyPart(() => import("./Stage").then((m) => m.Side)),
  Player: lazyPart(() => import("./PlayerView").then((m) => m.PlayerView)),
  HostPlayer: lazyPart(() => import("./HostControls").then((m) => m.HostPlayer)),
  HostLobby: lazyPart(() => import("./HostControls").then((m) => m.HostLobby)),
  Round: lazyPart(() => import("./HostControls").then((m) => m.Round)),
};
