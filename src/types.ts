/** Every game a session can play. The players are shared; each game keeps its own submissions. */
export const GAME_IDS = ["photos", "beforeAfter", "box"] as const;
export type GameId = (typeof GAME_IDS)[number];

/**
 * What the main screen is showing. Only host / first-player may write this.
 * "list" = the lobby. "curtain" = the empty curtain between contestants. The other steps belong to the active game; a step without a uid shows everyone
 * ("review" = everyone's before & after on one screen; "grid" = everyone's photo; "boxes" = [BLANK] in a Box).
 */
export type Step = "list" | "curtain" | "before" | "after" | "both" | "video" | "review" | "photo" | "grid" | "boxes";

export interface Display {
  uid?: string;
  step: Step;
  /** Video step only: the host remote's play/pause. Treated as playing when absent. */
  playing?: boolean;
  /** Video step only: set to a new timestamp to restart from the beginning. */
  restartAt?: number;
}

export interface Player {
  name: string;
  joinedAt: number;
}

/** Download URLs of a player's Before & After submission. RTDB drops empty objects, so all optional. */
export type BeforeAfterMedia = Partial<Record<"before" | "after" | "video", string>>;

/** Download URL of a player's one Photos submission. */
export interface PhotosMedia { photo?: string }

/** The two boxes of [BLANK] in a Box: "L" starts with the left player, "R" with the right one. */
export type BoxKey = "L" | "R";

/** A round of [BLANK] in a Box. Which box holds the object is secret (see `BoxSecret`) until a box is opened. */
export interface BoxRound {
  /** Built-in object id (see games/box/objects.ts), e.g. "carrot". */
  object: string;
  /** Left and right player: box L starts with `a`, box R with `b`. */
  players: { a: string; b: string };
  /** The one player allowed to look inside their box. */
  peeker: string;
  /** The other player's one choice. */
  decision?: "swap" | "keep";
  /** Opened boxes and what was in them. */
  revealed?: Partial<Record<BoxKey, "object" | "empty">>;
  /** When the round was set up (tells rounds apart, e.g. to restart the stage's animations). */
  startedAt: number;
}

/** Kept outside the session (at boxSecrets/{code}) so only the host, the main screen and the peeker can read it. */
export interface BoxSecret { inBox: BoxKey }

/**
 * The light, which runs all evening alongside the games: a computer at /light watches the room and
 * turns the light (and a real Hue lamp) on 2 seconds after anyone does the secret trigger (e.g. stops
 * smiling). Players have to work out why.
 */
export interface LightState {
  /** Whether the light is on: the camera watches and turns it on. Off when absent (the host switches it on later). */
  armed?: boolean;
  /** The secret trigger's id (see light/triggers.ts); "stop-smiling" when absent. */
  trigger?: string;
  /**
   * A mode with a bulb per trigger (see MODES in light/triggers.ts): "smiles" (green when a smile starts,
   * red when it stops) or "all" (every trigger, each in its own colour). Absent: "One secret", just
   * `trigger`, with the red bulb.
   */
  mode?: "smiles" | "all";
  /** When the light last went on; the light page lights up (for a second) when it changes. */
  litAt?: number;
  /** A mode with several bulbs: when each trigger's bulb last went on, by trigger id. */
  lit?: Record<string, number>;
  /** What the light computer's camera sees (people in view; per trigger, how many are "in", e.g. smiling), for the host phone. */
  camera?: { starting?: boolean; off?: boolean; people?: number; each?: Record<string, number>; error?: string };
}

/** One game's submissions within a session. */
export interface GameData<M> {
  media?: Record<string, M>;
  /** Players the host has let resubmit. Everyone else is locked once their submission is in. */
  unlocked?: Record<string, boolean>;
  /** Contestants the host has put on the main screen in this game, for the running order's "Next". */
  shown?: Record<string, boolean>;
}

export interface Jukebox {
  /** Song titles, published by the main screen (the files stay on that PC). */
  tracks?: string[];
  /** Song lengths in seconds, same order as `tracks` (0 = unknown). */
  durations?: number[];
  /** Playback state, written by the host remote (and by the main screen when a song ends). */
  state?: { current?: number; playing?: boolean; volume?: number; repeat?: boolean };
}

export interface Session {
  hostUid: string;
  /** The host's phone (claimed via /host). Only it (and the main screen) can drive the display. */
  controllerUid?: string;
  players?: Record<string, Player>;
  /** The game players see and the main screen shows. Absent = the game selection screen (where every session starts). */
  game?: GameId;
  games?: { beforeAfter?: GameData<BeforeAfterMedia>; photos?: GameData<PhotosMedia>; box?: { round?: BoxRound } };
  display?: Display;
  /** Host remote toggles this to reveal the download-all button on the main screen. */
  showDownload?: boolean;
  jukebox?: Jukebox;
  /** The computer running the light (claimed via /light). It, the host phone and the main screen can drive the light. */
  lightUid?: string;
  light?: LightState;
  /** Where Before & After kept its data before there were games. Moved into `games` when a main screen opens the session. */
  media?: Record<string, BeforeAfterMedia>;
  unlocked?: Record<string, boolean>;
}
