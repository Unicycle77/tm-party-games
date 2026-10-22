/** Every game a session can play. The players are shared; each game keeps its own submissions. */
export const GAME_IDS = ["photos", "beforeAfter", "box", "noisemaster", "secretTasks", "headshots", "prize", "flipchart"] as const;
export type GameId = (typeof GAME_IDS)[number];
/** What can be on the task list as an app game: a game, or the light (which runs all evening, so it's never started). */
export type TaskGame = GameId | "light";

/**
 * What the main screen is showing. Only host / first-player may write this.
 * "list" = the lobby. "curtain" = the curtain between contestants (with the portrait, if any). The other steps belong to the active game; a step without a uid shows everyone
 * ("review" = everyone's before & after on one screen; "grid" = everyone's photo; "boxes" = [BLANK] in a Box; "soundboard" = Noisemaster; "envelopes" = Secret Tasks; "portrait" = one guest's Flipchart portrait, "portraits" = everyone's).
 * "scoreboard" belongs to no game: the party's scoreboard, which can go up whatever game is on. Nor does "tasktext":
 * a task's text on the paper task card (`task` says which).
 */
export type Step = "list" | "curtain" | "scoreboard" | "haul" | "tasktext" | "before" | "after" | "both" | "video" | "review" | "photo" | "grid" | "boxes" | "soundboard" | "envelopes" | "portrait" | "portraits";

export interface Display {
  uid?: string;
  /** The Headshot task: the scoreboard contestant whose headshot is up (they may not have checked in). */
  contestant?: string;
  /** The prize task: which of that contestant's prize photos is up (0 is the first). */
  index?: number;
  /** The task text step: whose text is up, a task's id or "tiebreaker". */
  task?: string;
  /** The task text step: which part of a multi-part task is up (0 is the first, and what's up when absent). */
  part?: number;
  step: Step;
  /** Video step only: the host remote's play/pause. Treated as playing when absent. */
  playing?: boolean;
  /** Video step only: set to a new timestamp to restart from the beginning. */
  restartAt?: number;
  /** Portrait step only: the host skipped the pages landing one by one, so the whole portrait is up. */
  settled?: boolean;
}

export interface Player {
  name: string;
  joinedAt: number;
  /** The scoreboard contestant they checked in as, if the party had a guest list. */
  contestant?: string;
  /** The host said this guest isn't playing: no "add them?" card, and they stay listed behind Plan the party. */
  notPlaying?: boolean;
}

/** Download URLs of a player's Before & After submission. RTDB drops empty objects, so all optional. */
export type BeforeAfterMedia = Partial<Record<"before" | "after" | "video", string>>;

/** Download URL of a player's one Photos submission. */
export interface PhotosMedia { photo?: string }

/**
 * Photos' game data is the set on now. A party can have several photo tasks on its scoreboard, each with
 * its own photos: `task` is the scoreboard task the set on now belongs to, and `sets` keeps the others
 * (by task id) until their task is started again.
 */
export interface PhotosData extends GameData<PhotosMedia> {
  task?: string;
  sets?: Record<string, GameData<PhotosMedia>>;
}

/**
 * The Flipchart task: every guest draws a portrait on 16 pages of a flipchart, one page at a time, against a clock the host
 * starts. The strokes are the portrait: the big screen and the party download draw it from them, in the show's pattern.
 */
export interface FlipchartData {
  /** When the host started the clock, and when it runs out (database time, in ms). Moved on by "+5 minutes". */
  startedAt?: number;
  endsAt?: number;
  /** The time is up, or the host ended it: every portrait is final, sent or not. */
  closed?: true;
  /** Each guest's pages, by uid: "p1" to "p16" (page order, as on the front page) to the page's strokes (see games/flipchart/strokes.ts). */
  pages?: Record<string, Record<string, string>>;
  /** Guests who have sent their portrait. */
  submitted?: Record<string, true>;
  /** Players the host has let draw again, while the clock runs. */
  unlocked?: Record<string, boolean>;
  /** Contestants the host has put on the big screen, for the running order's "Next". */
  shown?: Record<string, boolean>;
}

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

/** One press of a Noisemaster button, by the player's phone: which button (0–15, row by row) and when (server time). */
export interface NoisemasterPress { i: number; at: number }

/**
 * A round of Noisemaster: one player presses 16 blank buttons to make the stage say the phrase, in order.
 * Which sound is on which button is secret (see `NoisemasterSecret`): the player only sends presses, and
 * the main screen plays each one, checks it and writes the results below.
 */
export interface NoisemasterRound {
  player: string;
  /** The words (sound names) to say, 1 to 8. A word can come more than once. */
  phrase: string[];
  /** When the round was set up (tells rounds and restarts apart). */
  startedAt: number;
  /** The player's presses, in order (push keys). */
  presses?: Record<string, NoisemasterPress>;
  /** Main screen: how many words of the phrase are said so far. A wrong press starts again from nothing. */
  progress?: number;
  /** Main screen: wrong presses. */
  mistakes?: number;
  /** Main screen: when the first press came (the clock starts) and when the last word was said (it stops). */
  firstAt?: number;
  doneAt?: number;
  /**
   * Main screen: the latest press, so every screen can light that button up. `say` is the word when the main screen
   * spoke it (no sound file for it), so extra screens can speak it too, in the phrase's voice or the decoys'.
   */
  last?: { key: string; i: number; ok: boolean; say?: { word: string; inPhrase: boolean } };
}

/** A Noisemaster go kept for the scoreboard: the time in ms and the restarts, or a DQ. */
export interface KeptGo { ms?: number; restarts?: number; dq?: true }

/** Kept outside the session (at noisemasterSecrets/{code}) so only the host and the main screen can read it. */
export interface NoisemasterSecret {
  /** The sound on each of the 16 buttons, row by row. */
  board: string[];
}

/** Where one sealed envelope lies on the pile players pick from: % across and down, and a tilt in degrees. */
export interface PileSpot { x: number; y: number; r: number }

/**
 * Secret Tasks' reveal: the players in a random order, one at a time ("What was Sam's secret?"), each
 * with a sealed envelope on the main screen that the host unseals. Only what has been revealed is here.
 */
export interface SecretReveal {
  /** Player uids in the order they come up (some may have left since). */
  order: string[];
  /** Where in `order` to look next: the player on screen is the first one from here who is still in the party. */
  index: number;
  /** The unsealed envelope's task, put here by the host phone when it opens; absent while sealed. */
  task?: string;
  /** Every task unsealed so far, by player, for the finish screen's pile of opened envelopes and cards. */
  shown?: Record<string, string>;
  /** The opening title card ("Can everyone keep a secret?") is up; nobody's envelope yet. */
  title?: true;
  /** How the host scored each unsealed turn, by the task's owner (see `pointsOf`). */
  scores?: Record<string, SecretTurn>;
  startedAt: number;
}

/** One turn of the reveal as the host scored it: whether the owner did their task, and who guessed it. */
export interface SecretTurn { done?: boolean; guessed?: Record<string, true> }

/**
 * Secret Tasks live outside the session, at secretTasks/{code}, so no guest can read another's:
 * `pool` is the host's list of tasks (host and host phone only); `assigned` is the task each player was
 * dealt, by uid (readable by the host, the host phone and that player). A dealt task never changes, except
 * when the host corrects its wording (see `editTask`).
 */
export interface SecretTasks {
  pool?: Record<string, string>;
  assigned?: Record<string, string>;
  /** Players who have opened their envelope at least once (written by the player's phone). */
  seen?: Record<string, true>;
}

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
  /**
   * Who has worked out the secret, by scoreboard contestant: a number that puts them in the order they got
   * it (the smallest got it first). Only the order counts, so taking someone off leaves a gap, not a renumbering.
   */
  got?: Record<string, number>;
}

/**
 * A guest on a new phone (or browser) asking to take over their player, entries and all. Only the
 * host can allow it, so nobody can take someone else's spot. Allowed requests stay, so the old phone
 * can say where its player went.
 */
export interface MoveRequest {
  /** The player being moved. */
  from: string;
  status: "asked" | "allowed" | "declined";
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
  /**
   * When the main screen last read its music folder. `tracks` stays after the PC goes off, so the host can
   * still pick tasks' songs from it; this says how old that list is.
   */
  tracksAt?: number;
  /** Sting titles from the music folder's Transition music subfolder (the jukebox leaves it out), published with `tracks`. */
  transitions?: string[];
  /** Sting lengths in seconds, same order as `transitions` (0 = unknown). */
  transitionDurations?: number[];
  /** Picture file names from the music folder's Transition pictures subfolder, published with `tracks`. */
  transitionPictures?: string[];
  /** Video file names from the music folder's Transition videos subfolder, published with `tracks`. */
  transitionVideos?: string[];
  /** Their lengths in seconds, same order (0 = unknown). */
  transitionVideoDurations?: number[];
  /** The main screen has its music folder open right now, so songs can play. Gone when it disconnects. */
  open?: boolean;
  /**
   * Where the song is, written by the main screen whenever its audio plays, pauses or seeks: `pos` seconds in
   * at `at` (the main screen's clock), moving on while `running`. The host remote counts what's left from it.
   */
  clock?: { pos: number; at: number; running: boolean };
  /** Playback state, written by the host remote (and by the main screen when a song ends). */
  state?: { current?: number; playing?: boolean; volume?: number; repeat?: boolean };
}

/** A share of the headshot in the scoreboard window's shape: its left and top edges, width and height, each from 0 to 1 of the photo's. */
export interface HeadshotCrop { x: number; y: number; w: number; h: number }

/** A contestant on the party's scoreboard. The host adds them before the party, and guests check in by picking theirs. */
export interface ScoreboardContestant {
  name: string;
  /** Their headshot (a download URL or data URL). Absent: the scoreboard's blank frame. */
  photo?: string;
  /** What part of the headshot the scoreboard and the host's lists show; the stored photo is never changed. Cleared with a new photo. */
  crop?: HeadshotCrop;
  /** Where they come in the host's list (the order they were added). */
  order: number;
  /** The guest (player uid) who checked in as them, by tapping their name or typing it in. */
  uid?: string;
}

/** One more part of a task's words after the first: its own type (so its own heading) and the text the host reads out. */
export interface TaskPart { type?: string; text: string }

/** A task on the party's scoreboard: a live task the host names, or an app game. Never tied to a game's own data. */
export interface ScoreboardTask {
  order: number;
  /** A live task's name. */
  name?: string;
  /** An app game in the list, which can be started from its row (except the light, which runs all evening). */
  game?: TaskGame;
  /** The host's note about the task. Only ever shown on the host remote. */
  description?: string;
  /** The jukebox song the host picked for the task, by title (not by place, so new songs don't shift it). */
  song?: string;
  /** A short sting from the music folder's Transition music subfolder, by title: it plays on the big screen the moment the host starts the task. */
  transition?: string;
  /** A picture from the music folder's Transition pictures subfolder, by file name (never uploaded): it fills the big screen while the sting plays. Only with a `transition`. */
  transitionImage?: string;
  /** A video from the music folder's Transition videos subfolder, by file name: it plays full screen, with its own sound, on its own (no music or picture with it). */
  transitionVideo?: string;
  /** The task's type, heading its text: "Individual", "Team" or the host's own word ("Arrival"). TASK is added when shown. */
  type?: string;
  /** The words the host reads out, a paragraph a line. Shown on the host remote, and on the big screen only when the host puts it up. */
  text?: string;
  /** Parts 2, 3… of the words, each with its own type. `type` and `text` above are part 1. Only live tasks and the tiebreaker have them; only the host remote ever says "part". */
  parts?: TaskPart[];
  /**
   * Points by contestant id: what counts, worked out from `given`, `results` and `dq` by `workOut`, plus any `bonus`, and
   * saved with them. A contestant with none gets nothing for this task.
   */
  scores?: Record<string, number>;
  /** A live task scored from a count or measurement: the highest or the lowest wins. Absent: scored by hand. */
  scoring?: "highest" | "lowest";
  /** The count or measurement per contestant (Noisemaster's times in ms). */
  results?: Record<string, number>;
  /** Points the host tapped: every point on a by-hand task, an override on a measured one. */
  given?: Record<string, number>;
  /** Bonus points on top of a contestant's points for this task: 1 or 2 (`true`, from before there could be 2, is 1). A DQ keeps them. */
  bonus?: Record<string, true | number>;
  /** Disqualified contestants: 0 points, whatever they were given or measured (a bonus still counts). */
  dq?: Record<string, true>;
  /** A dB-meter task: a reading over this many dB is a DQ as soon as it's typed (exactly this many is safe). */
  dqOver?: number;
  /** The DQs `dqOver` made, so the points page can say why ("over 60"), and a reading back under it lifts them. */
  overDq?: Record<string, true>;
  /** The host turned off DQs moving everyone else up, for this task. */
  dqStays?: true;
  /** Noisemaster: the restarts in each contestant's go, for the host's colour commentary. */
  restarts?: Record<string, number>;
  /** What the task is measured in, like "dice": the 📏 converter offers it for this task. */
  unit?: TaskUnit;
  /** Flipchart: what the guests draw ("a portrait of the Taskmaster"), the words of the task, and how many minutes they have. */
  draw?: string;
  minutes?: number;
}

/** A unit a task measures in, like "dice" at 16 mm. `kind` is what it measures, and so which useless units it's compared with. */
export interface TaskUnit {
  name: string;
  /** How big one is, in `unit`. */
  amount: number;
  /** One of the converter's common units (mm, cm, m, in, ft, g, kg, oz, lb, sec, min, hr, ml, L, tsp, tbsp, fl oz, cup, pt, qt, gal), or dB. */
  unit: string;
  /** "loudness" is the 🔊 dB meter: always "dB", at 1 dB. */
  kind: "height" | "length" | "weight" | "time" | "volume" | "loudness";
}

/**
 * The ⏱ clock, the party's one utility clock (a countdown, or a stopwatch counting up). Flipchart's own clock lives with
 * its game, and is the one clock in the party while it runs (see `clockOf` in clock/data.ts). Times are in ms, and the
 * moments (`at`) in database time, so every screen counts the same.
 */
export interface ClockState {
  /** "up": a stopwatch. Absent: a countdown. */
  mode?: "up";
  /** A countdown's set time, which Reset goes back to. */
  set?: number;
  /** The face while it isn't running: the time set (before the start), or the time left or so far (held). */
  ms: number;
  /** Running: a countdown's end, or the moment a stopwatch's count started (now minus this is the time so far). */
  at?: number;
  /** It has been started, so ⏸ and Reset apply, even while held. */
  begun?: true;
  /** A stopwatch stopped itself, with every contestant who was going timed. `at` stays, so undoing a time carries on as if it never stopped. */
  stopped?: true;
  /** The clock is on the big screen, covering whatever's there until the host takes it down or puts something else up. */
  shown?: true;
  /** The task the host came from when setting it: where a stopwatch's times go (a lowest-wins live task). */
  task?: string;
  /** A song (a title in the jukebox) that ends on 0:00: it starts when the time left is its length, or with the clock if it's longer. */
  song?: string;
  /** That song has been started on this run (and is held with the clock). */
  songOn?: true;
  /** A stopwatch: the contestants going. Absent: everyone who has no time yet. */
  going?: Record<string, true>;
  /** A stopwatch with no task to hold them: each contestant's time. */
  times?: Record<string, number>;
}

/** A useless conversion on the big screen: the three lines the host reads out. */
export interface ShownConversion {
  lead: string;
  main: string;
  how: string;
}

/**
 * The party's scoreboard: contestants, the task list and its points, kept apart from the games.
 * `shown` is every task's points as they stood when the host last updated the big screen, so the big
 * screen keeps showing those totals until the next update, and the host can see what has changed since.
 */
export interface Scoreboard {
  contestants?: Record<string, ScoreboardContestant>;
  tasks?: Record<string, ScoreboardTask>;
  shown?: Record<string, Record<string, number>>;
  /** The host has declared the winner: the night is decided on the tasks scored so far, unscored ones and all. */
  final?: boolean;
  /**
   * The tiebreaker task, played only when the last update leaves a tie at the top, by just the tied
   * contestants. It has one winner and no points, so nobody's total changes.
   */
  /**
   * The big screen's scoreboard shows a 3 by 4 mosaic of the headshot of anyone not checked in yet. On unless the
   * host turns it off in Plan the party (false); the photos themselves are never changed.
   */
  pixelate?: false;
  tiebreaker?: { name?: string; description?: string; song?: string; type?: string; text?: string; parts?: TaskPart[]; winner?: string };
}

export interface Session {
  /**
   * The main screen. A party created on the host remote (days ahead, with no big screen) starts with the
   * remote as its host too; the big screen takes over when it opens the party on the night.
   */
  hostUid: string;
  /** What the host called the party (e.g. "Halloween party"), when it was created on the host remote. */
  name?: string;
  /** The host's phone (claimed via /host). Only it (and the main screen) can drive the display. */
  controllerUid?: string;
  /**
   * Set while the party has a host pin. The pin itself is at `pins/<code>`, readable only by a browser that has
   * entered it (or holds the host slots); a new phone or big screen needs it to take control.
   */
  hostPin?: boolean;
  players?: Record<string, Player>;
  /** The game players see and the main screen shows. Absent = the game selection screen (where every session starts). */
  game?: GameId;
  games?: {
    beforeAfter?: GameData<BeforeAfterMedia>;
    photos?: PhotosData;
    /** The Headshot task: contestants whose headshot has been on the big screen, for "Next". */
    headshots?: { shown?: Record<string, boolean> };
    /**
     * The prize task, keyed by scoreboard contestant (the winner and their headshot come from the
     * scoreboard): each prize's photos in the guest's order, the first standing for it in the haul.
     */
    prize?: { photos?: Record<string, string[]>; presented?: Record<string, boolean> };
    flipchart?: FlipchartData;
    box?: { round?: BoxRound; played?: Record<string, boolean> };
    /** `sounds`: the sound names the main screen found in its music folder's Noisemaster subfolder. */
    /**
     * Secret Tasks keeps the tasks outside the session (see `SecretTasks`); here are only the envelopes
     * still to pick (`pile`, by task id, with nothing about what's inside), the players' picks (envelope
     * id → uid; the main screen turns each into a dealt task) and the reveal.
     */
    secretTasks?: { pile?: Record<string, PileSpot>; picks?: Record<string, string>; reveal?: SecretReveal };
    /**
     * `kept`: finished goes while Noisemaster isn't on the task list, by scoreboard contestant (a DQ has no
     * time), brought across when it's added.
     */
    noisemaster?: { sounds?: string[]; round?: NoisemasterRound; played?: Record<string, boolean>; kept?: Record<string, KeptGo> };
  };
  display?: Display;
  /** Set once the host has started a first game: from then on, "no game" means between games, not the welcome. */
  begun?: boolean;
  /** This party's portrait of the Taskmaster (a download URL), shown framed on the big screen between games. */
  portrait?: string;
  /** Host remote toggles this to reveal the download-all button on the main screen. */
  showDownload?: boolean;
  /** The host remote's "Show QR" is open: the big screen puts the join QR above its corner code too. */
  showQr?: boolean;
  /** A live task's words (a task's id, or "tiebreaker", and which part) the host put on every guest's phone, until the host takes them down. Apart from the big screen's `display`. */
  phoneText?: { task: string; part?: number };
  /** A useless conversion the host put on the big screen. It covers whatever was there until the host takes it down or puts something else up. */
  conversion?: ShownConversion;
  /**
   * The task whose transition is on after the host started it: its music plays, its picture or video covers the big screen.
   * `at` is when the main screen started it. Music (with or without a picture) and a video end it themselves; a picture on
   * its own stays until the host puts something else up. The host's strip ends it at once.
   */
  sting?: { task: string; at?: number };
  /** The ⏱ clock the host set, and maybe has on the big screen. */
  clock?: ClockState;
  /** How the 📏 converter explains a result: metric (the default) or imperial, in feet and inches. */
  units?: "metric" | "imperial";
  jukebox?: Jukebox;
  scoreboard?: Scoreboard;
  /** The computer running the light (claimed via /light). It, the host phone and the main screen can drive the light. */
  lightUid?: string;
  /** Guests asking to move to a new phone, by the new phone's uid (see MoveRequest). */
  moves?: Record<string, MoveRequest>;
  light?: LightState;
  /** Where Before & After kept its data before there were games. Moved into `games` when a main screen opens the session. */
  media?: Record<string, BeforeAfterMedia>;
  unlocked?: Record<string, boolean>;
}
