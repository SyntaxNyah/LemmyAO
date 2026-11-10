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
import { loadResources } from "./client/loadResources";
import { AO_HOST } from "./client/aoHost";
import { installVoiceUI } from "./voice/voiceUI";
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


const fpPromise = FingerprintJS.load();

// Replay playback lived in the old OOC panel; the code stays until it gets a new UI.
const replayDisabled = mode === "replay";

if (replayDisabled) {
  state.connection.status = "disconnected";
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
  testimonyID: number;
  resources: any;
  viewport: Viewport;
  loadResources: () => void;
  emote_extensions: string[];
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

    this.testimonyID = 0;
    this.resources = getResources(AO_HOST, theme);
    this.viewport = masterViewport();
    this.emote_extensions = [".gif", ".png", ".apng", ".webp", ".webp.static"];
    this.background_extensions = [".png", ".gif"];
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


}

export default Client;
