/*
 * Glorious webAO
 * made by sD, refactored by oldmud0 and Qubrick
 * credits to aleks for original idea and source
 */
import "./styles/client.css";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import queryParser from "./utils/queryParser";
import getResources from "./utils/getResources";
import masterViewport from "./viewport/viewport";
import { Viewport } from "./viewport/interfaces/Viewport";
import { version } from "./version";
import { onReplayGo } from "./dom/onReplayGo";
import * as aolib from "aolib-ts";
import { registerProtocol } from "./registerProtocol";
import { Connection } from "./core/connection";
import { coreHandlers } from "./core/protocol";
import { state } from "./core/state";
import { on as onCore } from "./core/events";
import { effect } from "@vue/reactivity";
import { renderPlayerList } from "./dom/renderPlayerList";
import { loadResources } from "./client/loadResources";
import { AO_HOST } from "./client/aoHost";
import { installVoiceUI } from "./voice/voiceUI";
import {
  fetchEvidenceList,
  fetchCharacterList,
} from "./client/fetchLists";
const { ip: serverIP, connect, mode, theme, serverName, char: autoChar, area: autoArea, disableJson } = queryParser();
export { autoChar, autoArea };

// Modes that run the client as its own local server (no socket): `replay`
// plays a recorded log, `server` acts as a live one-area server for local
// character testing (see src/dom/serverMode.ts). Both loop send -> receive.
const isLocalMode = mode === "replay" || mode === "server";

document.title = serverName;

export let CHATBOX: string;
export function setCHATBOX(val: string) {
  CHATBOX = val;
}
export let client: Client;
export function setClient(val: Client) {
  client = val;
}

export const UPDATE_INTERVAL = 60;

// presettings
export let selectedMenu = 1;
export function setSelectedMenu(val: number) {
  selectedMenu = val;
}
// Numeric shout index from the DOM (button_N / data-shout); converted to the
// aolib ShoutModifier enum only when an MS is built (see onICEnter).
export let selectedShout = 0;
export function setSelectedShout(val: number) {
  selectedShout = val;
}
export let extrafeatures: string[] = [];
export function setExtraFeatures(val: any) {
  extrafeatures = val;
}


const fpPromise = FingerprintJS.load();

// Replay playback lived in the old OOC panel; the code stays until it gets a new UI.
const replayDisabled = mode === "replay";

if (replayDisabled) {
  document.getElementById("client_waiting")!.style.display = "none";
  document.getElementById("client_errortext")!.textContent = "Replay mode is unavailable for now.";
  document.getElementById("client_error_code")!.style.display = "none";
  document.getElementById("client_reconnect")!.style.display = "none";
  document.getElementById("client_error_overlay")!.style.display = "flex";
}

fpPromise
  .then((fp) => fp.get())
  .then((result) => {
    if (replayDisabled) return;
    const hdid = result.visitorId;

    let connectionString = connect;

    if (!connectionString && !isLocalMode) {
      if (serverIP) {
        // if connectionString is not set, try IP
        // and just guess ws, though it could be wss
        connectionString = `ws://${serverIP}`;
      } else {
        alert("No connection string specified!");
        return;
      }
    }

    if (
      window.location.protocol === "https:" &&
      connectionString.startsWith("ws://")
    ) {
      // If protocol is https: and connectionString is ws://
      // We have a problem, since it's impossible to connect to ws:// from https://
      // Connection will fail, but at least warn the user
      alert(
        "WS not supported on HTTPS. Please try removing the s from https:// at the start of the URL bar. (You might have to click inside the URL bar to see it)",
      );
    }

    client = new Client(connectionString, hdid);
    client.connect();
    loadResources();
    installVoiceUI();
  });

export function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

// The legacy player list filters by area; the Areas tab moves through core.
effect(() => {
  void state.self.areaId;
  renderPlayerList();
});

onCore("opened", () => {
  document.getElementById("client_error_overlay")!.style.display = "none";
  document.getElementById("client_waiting")!.style.display = "block";
  document.getElementById("client_loading")!.style.display = "block";
  document.getElementById("client_charselect")!.style.display = "none";
});

onCore("closed", ({ code }) => {
  const { removal, wasJoined } = state.connection;
  if (!removal) {
    document.getElementById("client_errortext")!.textContent = wasJoined
      ? "You were disconnected from the server."
      : "Could not connect to the server.";
    document.getElementById("client_reconnect")!.style.display = "";
  }
  document.getElementById("client_error_overlay")!.style.display = "flex";
  document.getElementById("client_loading")!.style.display = "none";
  document.getElementById("error_id")!.textContent = String(code);
});

export let lastICMessageTime = new Date(0);
export function setLastICMessageTime(val: Date) {
  lastICMessageTime = val;
}

class Client {
  connection: Connection;

  get server(): aolib.ServerSession {
    return this.connection.server;
  }

  /** The locally synthesised server used by replay and server mode. */
  get clientSession(): aolib.ClientSession {
    return this.connection.clientSession;
  }

  get socket(): WebSocket | undefined {
    return this.connection.socket;
  }

  get playerID() {
    return state.server.playerId;
  }

  get area() {
    return state.self.areaId;
  }
  set area(id: number) {
    state.self.areaId = id;
  }

  get charID() {
    return state.self.charId;
  }
  set charID(id: number) {
    state.self.charId = id;
  }

  software = "LemmyAO";
  version = version;
  hp: number[];
  char_list_length: number;
  evidence_list_length: number;
  music_list_length: number;
  testimonyID: number;
  chars: any;
  emotes: any;
  evidences: any;
  areas: any;
  musics: any;
  musics_time: boolean;
  callwords: string[];
  resources: any;
  selectedEmote: number;
  selectedEvidence: number;
  _lastTimeICReceived: any;
  viewport: Viewport;
  loadResources: () => void;
  /** Maps player ID to player data */
  playerlist: Map<number, { charId: number; charName: string; showName: string; name: string; area: number }>;
  charicon_extensions: string[];
  emote_extensions: string[];
  emotions_extensions: string[];
  background_extensions: string[];
  constructor(connectionString: string, hdid: string) {
    this.connection = new Connection({
      url: connectionString,
      local: isLocalMode,
      disableJson,
      hdid,
      software: this.software,
      version: this.version,
      register: (server, clientSession) =>
        registerProtocol(server, clientSession, coreHandlers(this.connection)),
    });

    this.hp = [0, 0];
    this.char_list_length = 0;
    this.evidence_list_length = 0;
    this.music_list_length = 0;
    this.testimonyID = 0;
    this.chars = [];
    this.emotes = [];
    this.evidences = [];
    this.areas = [];
    this.musics = [];
    this.musics_time = false;
    this.callwords = [];
    this.resources = getResources(AO_HOST, theme);
    this.selectedEmote = -1;
    this.selectedEvidence = -1;
    this.viewport = masterViewport();
    this._lastTimeICReceived = new Date(0);
    this.playerlist = new Map();
    this.charicon_extensions = [".png", ".webp"];
    this.emote_extensions = [".gif", ".png", ".apng", ".webp", ".webp.static"];
    this.emotions_extensions = [".png", ".webp"];
    this.background_extensions = [".png", ".gif"];
  }

  /**
   * Gets the current player's character.
   */
  get character() {
    return this.chars[this.charID];
  }

  /**
   * Gets the player's currently selected emote.
   */
  get emote() {
    return this.emotes[this.selectedEmote];
  }

  /**
   * Gets the current evidence ID unless the player doesn't want to present any evidence
   */
  get evidence() {
    return document.getElementById("button_present").classList.contains("dark")
      ? this.selectedEvidence
      : -1;
  }

  connect() {
    this.connection.connect();
  }

  /** Drops the connection without reporting a disconnect. */
  cleanup() {
    this.connection.dispose();
  }

  /**
   * Parse the lines in the OOC and play them
   */
  handleReplay() {
    const ooclog = <HTMLInputElement>document.getElementById("client_ooclog");
    const rawLog = false;
    let rtime: number = Number(
      (<HTMLInputElement>document.getElementById("client_replaytimer")).value,
    );

    const clines = ooclog.value.split(/\r?\n/);
    if (clines[0]) {
      const currentLine = String(clines[0]);
      this.server.receive(currentLine);
      ooclog.value = clines.slice(1).join("\r\n");
      if (currentLine.substr(0, 4) === "wait" && rawLog === false) {
        rtime = Number(currentLine.split("#")[1]);
      } else if (currentLine.substr(0, 2) !== "MS") {
        rtime = 0;
      }

      setTimeout(() => onReplayGo(null), rtime);
    }
  }

  resetMusicList() {
    this.musics = [];
    document.getElementById("client_musiclist").innerHTML = "";
  }

  resetAreaList() {
    this.areas = [];
    document.getElementById("areas").innerHTML = "";
    fetchEvidenceList();
    fetchCharacterList();
  }
}

export default Client;
