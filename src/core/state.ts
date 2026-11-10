import { reactive } from "@vue/reactivity";
import type { DeskModifier, EmoteModifier, JudgeState, RTAnimation, Side, TextColor } from "aolib-ts";

export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "handshaking"
  | "joined"
  | "disconnected";

export interface Area {
  name: string;
  players: number;
  status: string;
  caseManager: string;
  lock: string;
}

export interface CharacterEntry {
  name: string;
  description: string;
  evidence: string;
  taken: boolean;
}

/** One emote of our character, in button order. */
export interface Emote {
  /** 1-based, as the emotions/buttonN_off files are numbered. */
  index: number;
  label: string;
  preanim: string;
  anim: string;
  modifier: EmoteModifier;
  deskModifier: DeskModifier;
  sfx: string;
  sfxDelay: number;
}

export interface OwnCharacter {
  name: string;
  showname: string;
  side: Side;
  emotes: Emote[];
}

export interface Evidence {
  name: string;
  description: string;
  image: string;
}

export interface Player {
  id: number;
  name: string;
  charName: string;
  showName: string;
  /** Roster index matching `charName`, or -1. */
  charId: number;
  area: number;
}

export type OOCEntry =
  | { kind: "chat"; name: string; message: string; fromServer: boolean; time: number }
  | { kind: "modcall"; message: string; time: number }
  | { kind: "case"; message: string; roles: string[]; time: number };

export type ICEntry =
  | {
      kind: "message";
      charId: number;
      character: string;
      showname: string;
      message: string;
      color: TextColor;
      /** Contains one of our callwords. */
      callword: boolean;
      time: number;
    }
  | { kind: "music"; charId: number; showname: string; track: string; looping: boolean; time: number }
  | { kind: "notice"; text: string; time: number };

export interface Timer {
  visible: boolean;
  running: boolean;
  /** Milliseconds as of `updatedAt`; counts down while running. */
  time: number;
  updatedAt: number;
}

export interface State {
  connection: {
    status: ConnectionStatus;
    /** WebSocket close code of the last disconnect. */
    closeCode: number | null;
    /** Kick/ban reason; reconnecting is refused while set. */
    removal: { kind: "kicked" | "banned"; reason: string } | null;
    /** Whether we ever finished joining; tells "disconnected" from "could not connect". */
    wasJoined: boolean;
  };
  /** BB warnings from the server, oldest first, until dismissed. */
  alerts: string[];
  server: {
    playerId: number;
    software: string;
    version: string;
    features: string[];
    assetHost: string;
    playerCount: number;
    maxPlayers: number;
    description: string;
    charCount: number;
    evidenceCount: number;
    musicCount: number;
  };
  areas: Area[];
  music: string[];
  characters: CharacterEntry[];
  evidence: Evidence[];
  players: Record<number, Player>;
  oocLog: OOCEntry[];
  icLog: ICEntry[];
  court: {
    background: string;
    hp: { defense: number; prosecution: number };
    testimony: RTAnimation | null;
    timers: Record<number, Timer>;
    music: Record<string, { track: string; looping: boolean }>;
  };
  self: {
    charId: number;
    areaId: number;
    /** Loaded char.ini data for `charId`, or null while loading / spectating. */
    character: OwnCharacter | null;
    /** Index into `character.emotes`. */
    emoteIndex: number;
    /** Chosen position; "" speaks from the character's own side. */
    position: Side | "";
    /** Position confirmed by the server (SP); null until it sends one. */
    side: Side | null;
    /** JD: whether the judge buttons show; "by_position" means only as judge. */
    judgeControls: JudgeState;
    moderator: boolean;
    /** Characters whose IC messages are hidden locally. */
    muted: number[];
  };
}

/** Log entries kept per log; older ones are dropped. */
export const LOG_LIMIT = 1000;

export function initialState(assetHost = ""): State {
  return {
    connection: { status: "idle", closeCode: null, removal: null, wasJoined: false },
    alerts: [],
    server: {
      playerId: -1,
      software: "",
      version: "",
      features: [],
      assetHost,
      playerCount: 0,
      maxPlayers: 0,
      description: "",
      charCount: 0,
      evidenceCount: 0,
      musicCount: 0,
    },
    areas: [],
    music: [],
    characters: [],
    evidence: [],
    players: {},
    oocLog: [],
    icLog: [],
    court: {
      background: "",
      hp: { defense: 10, prosecution: 10 },
      testimony: null,
      timers: {},
      music: {},
    },
    self: { charId: -1, areaId: 0, character: null, emoteIndex: 0, position: "", side: null, judgeControls: "by_position", moderator: false, muted: [] },
  };
}

export const state: State = reactive(initialState());

/** Clears everything learned from the server, keeping the asset host and the logs. */
export function resetSessionState() {
  const { icLog, oocLog } = state;
  Object.assign(state, initialState(state.server.assetHost), { icLog, oocLog });
}
