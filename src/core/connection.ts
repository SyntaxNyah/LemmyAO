import * as aolib from "aolib-ts";
import { state, resetSessionState } from "./state";
import { emit } from "./events";
import { logNotice } from "./log";

export interface ConnectionOptions {
  /** ws:// or wss:// URL; ignored in local mode. */
  url: string;
  /** Replay and server modes: no socket, outbound packets loop back locally. */
  local: boolean;
  disableJson: boolean;
  hdid: string;
  software: string;
  version: string;
  register: (server: aolib.ServerSession, clientSession: aolib.ClientSession) => void;
}

const OPEN_TIMEOUT_MS = 5000;

/**
 * Repairs incoming packets some servers send short or with blank numbers, which
 * aolib can't decode (CSDWASASH): an ID without a version, an SI with empty counts,
 * a PV with a blank player ID.
 */
export function repairInbound(wire: string): string {
  const id = /^ID#([^#]*)#([^#]*)#%$/.exec(wire);
  if (id) return `ID#${id[1]}#${id[2]}##%`;
  if (wire.startsWith("SI#")) return wire.replace(/#(?=#)/g, "#0");
  const pv = /^PV#([^#]*)#([^#]*)#([^#]*)#%$/.exec(wire);
  if (pv) return `PV#${pv[1] || "-1"}#CID#${pv[3]}#%`;
  return wire;
}

/**
 * aolib sends an MS without a screen effect with an empty effect slot. KFO-Server
 * rejects that 2.8 packet outright, so send it the way AO2 does: `||`.
 */
export function withEffectSlot(wire: string): string {
  if (!wire.startsWith("MS#")) return wire;
  const args = wire.slice(3, -2).split("#");
  if (args.length !== 26 || args[25] !== "") return wire;
  args[25] = "||";
  return `MS#${args.join("#")}#%`;
}

let current: Connection | undefined;

/** The connection commands go through: the one most recently connected. */
export const currentConnection = () => current;
const makeCurrent = (conn: Connection) => (current = conn);
const KEEPALIVE_MS = 5000;

const sessionHooks = (role: string) => ({
  onUnknownHeader: (header: string, wire: string) => {
    console.warn(`[aolib] unknown ${role} header '${header}'`, { wire });
  },
  onDecodeError: (header: string, err: unknown, wire: string) => {
    console.error(`[aolib] decode error for '${header}':`, err, { wire });
  },
  onHandlerError: (header: string, err: unknown) => {
    console.error(`[aolib] handler for '${header}' threw:`, err);
  },
});

/**
 * One AO server connection: the socket, both aolib sessions and the keepalive.
 * `clientSession` is the locally synthesised server used by replay/server mode.
 */
export class Connection {
  server!: aolib.ServerSession;
  clientSession!: aolib.ClientSession;
  socket: WebSocket | undefined;
  private abort: AbortController | undefined;
  private keepalive: ReturnType<typeof setInterval> | undefined;

  constructor(readonly options: ConnectionOptions) {}

  connect() {
    makeCurrent(this);
    this.teardown();
    resetSessionState();
    const abort = new AbortController();
    this.abort = abort;
    const { local, disableJson } = this.options;

    this.server = aolib.server({
      disableAutoJson: disableJson,
      send: (encoded) => {
        const wire = withEffectSlot(encoded);
        console.debug(`C: ${wire}`);
        if (local) this.clientSession.receive(wire);
        else this.socket?.send(wire);
      },
      ...sessionHooks("s2c"),
    });
    this.clientSession = aolib.client({
      disableAutoJson: disableJson,
      send: (wire) => {
        console.debug(`S: ${wire}`);
        this.server.receive(wire);
      },
      ...sessionHooks("c2s"),
    });
    this.options.register(this.server, this.clientSession);

    state.connection.status = "connecting";
    if (local) {
      state.connection.status = "handshaking";
      this.hello();
      return;
    }

    const socket = new WebSocket(this.options.url);
    this.socket = socket;
    const opts = { signal: abort.signal };
    socket.addEventListener("open", () => this.onOpen(), opts);
    socket.addEventListener("message", (e) => this.onMessage(e), opts);
    socket.addEventListener("close", (e) => this.onClosed(e.code, e.reason), opts);
    // Browsers expose no detail on socket errors; a close event follows.
    socket.addEventListener("error", (e) => console.error("A network error occurred", e), opts);

    const watchdog = setTimeout(() => {
      if (state.connection.status === "connecting") this.onClosed(1006, "timed out");
    }, OPEN_TIMEOUT_MS);
    abort.signal.addEventListener("abort", () => clearTimeout(watchdog));
  }

  /** Sends HI and starts the keepalive. Called once the server is ready for it. */
  hello() {
    this.server.send.HI({ hdid: this.options.hdid });
    if (!this.options.local && !this.keepalive) {
      this.keepalive = setInterval(
        () => this.server.send.CH({ char_id: state.self.charId }),
        KEEPALIVE_MS,
      );
    }
  }

  /** Sends a raw fanta frame for packets aolib only models in the other direction. */
  sendRaw(wire: string) {
    const jsonMode = (this.server as unknown as { jsonMode?: boolean }).jsonMode === true;
    if (this.socket?.readyState === WebSocket.OPEN && !jsonMode) this.socket.send(wire);
  }

  disconnect() {
    this.socket?.close();
  }

  /** Drops the connection without reporting it, e.g. when replacing it. */
  dispose() {
    this.teardown();
  }

  private onOpen() {
    state.connection.status = "handshaking";
    emit("opened");
  }

  private onMessage(e: MessageEvent) {
    console.debug(`S: ${e.data}`);
    this.server.receive(typeof e.data === "string" ? repairInbound(e.data) : e.data);
  }

  private onClosed(code: number, reason: string) {
    if (state.connection.status === "disconnected") return;
    console.error(`The connection was closed: ${reason} (${code})`);
    state.connection.status = "disconnected";
    state.connection.closeCode = code;
    if (state.connection.wasJoined) logNotice("Disconnected");
    this.teardown();
    emit("closed", { code, reason });
  }

  private teardown() {
    clearInterval(this.keepalive);
    this.keepalive = undefined;
    this.abort?.abort();
    this.abort = undefined;
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
  }
}
