import { reactive } from "@vue/reactivity";

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
  self: {
    charId: number;
    areaId: number;
  };
}

export function initialState(assetHost = ""): State {
  return {
    connection: { status: "idle", closeCode: null, removal: null, wasJoined: false },
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
    self: { charId: -1, areaId: 0 },
  };
}

export const state: State = reactive(initialState());

/** Clears everything learned from the server, keeping the asset host. */
export function resetSessionState() {
  Object.assign(state, initialState(state.server.assetHost));
}
