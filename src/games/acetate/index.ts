import type { Game } from "..";
import { lazyPart } from "../lazyPart";
import { acetateStatus, closed, holdsScreen, sheetOf } from "./data";
import { renderAcetate } from "./render";

/**
 * Upside-down acetate (S7E9, a live task): every guest writes their name and draws on a clear overhead projector sheet on
 * their phone, upside down, for 100 seconds against the host's clock. At time everyone's goes in. The big screen projects
 * each one turned half way round, put down on the glass by a hand. Drawn from strokes, so there are no uploads.
 */
export const acetate: Game = {
  id: "acetate",
  name: "Acetate",
  blurb: "Write your name and draw it upside down. The projector turns it over.",
  heading: () => "Acetate",
  firstStep: "acetate",
  status: acetateStatus,
  photoUrls: () => [],
  files: (session, uid) =>
    acetateStatus(session, uid) === "submitted" ? [{ name: "acetate", render: () => renderAcetate(sheetOf(session, uid)) }] : [],
  canShow: closed,
  holdsScreen,
  Stage: lazyPart(() => import("./Stage").then((m) => m.Stage)),
  Collecting: lazyPart(() => import("./Stage").then((m) => m.Collecting)),
  Player: lazyPart(() => import("./PlayerView").then((m) => m.PlayerView)),
  HostPlayer: lazyPart(() => import("./HostControls").then((m) => m.HostPlayer)),
  HostLobby: lazyPart(() => import("./HostControls").then((m) => m.HostLobby)),
  Round: lazyPart(() => import("./HostControls").then((m) => m.Round)),
};
