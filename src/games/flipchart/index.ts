import type { Game } from "..";
import { lazyPart } from "../lazyPart";
import { closed, flipchartStatus, holdsScreen } from "./data";
import { renderPortrait, pagesOf } from "./strokes";

/**
 * Sixteen A1 pages, one portrait: every guest draws on sixteen canvases on their phone, seeing one at a time, against the
 * host's clock. When the time is up whatever's drawn is sent. The pages are hung in the show's pattern (some upside down)
 * as one picture. The host runs the clock; the portraits are drawn from strokes, so there are no uploads.
 */
export const flipchart: Game = {
  id: "flipchart",
  name: "Flipchart",
  blurb: "Sixteen pages, one portrait. Draw it a page at a time.",
  heading: () => "Flipchart",
  firstStep: "portrait",
  status: flipchartStatus,
  photoUrls: () => [],
  files: (session, uid) =>
    flipchartStatus(session, uid) === "submitted" ? [{ name: "portrait", render: () => renderPortrait(pagesOf(session, uid)) }] : [],
  canShow: closed,
  holdsScreen,
  Stage: lazyPart(() => import("./Stage").then((m) => m.Stage)),
  Collecting: lazyPart(() => import("./Stage").then((m) => m.Collecting)),
  Player: lazyPart(() => import("./PlayerView").then((m) => m.PlayerView)),
  HostPlayer: lazyPart(() => import("./HostControls").then((m) => m.HostPlayer)),
  HostLobby: lazyPart(() => import("./HostControls").then((m) => m.HostLobby)),
  Round: lazyPart(() => import("./HostControls").then((m) => m.Round)),
};
