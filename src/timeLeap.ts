import { registerPacket, type FantaForm, type JsonForm } from "aolib-ts";

/**
 * TimeLeap (TL) — a Nyathena JSON-only extension carrying a full room snapshot
 * so a client can rewind its view. The server sends a snapshot on demand and the
 * client replaces its TL state wholesale (idempotent, exactly like GP).
 *
 * TL is second-class: it is registered through aolib-ts's custom-packet
 * registry, never added to spec/, and has no conformance vector.
 */

export interface TLMusic {
  name: string;
  char_id: number;
  showname: string;
  looping: boolean;
}

export interface TLArea {
  name: string;
  background: string;
  side: string;
  music: TLMusic;
  status: number;
  evidence: string[];
  testimony: string[];
}

export interface TLCastMember {
  uid: number;
  char_id: number;
  name: string;
  emote: string;
  showname: string;
  side: string;
  offset: { x: number; y: number };
  flip: string;
  order: number;
}

export interface TLLogLine {
  ts: number;
  uid: number;
  char_id: number;
  name: string;
  emote: string;
  showname: string;
  side: string;
  text: string;
  color: number;
}

/**
 * "authoritative": the server rolled the room back, so every peer already
 * agrees. "overlay": the snapshot went only to TL-capable peers, so this client
 * deliberately shows an older scene than a non-TL peer would.
 */
export type TLMode = "authoritative" | "overlay";

export interface TLPacket {
  $header: "TL";
  op: "restore" | "save";
  snapshot_id: string;
  label: string;
  divergence: string;
  issued_by: number;
  issued_at: number;
  ttl_s: number;
  mode: TLMode;
  state: {
    area: TLArea;
    cast: TLCastMember[];
    log: TLLogLine[];
  };
}

/** The snapshot most recently rendered, or null while the room is live. */
export let timeLeap: TLPacket | null = null;

type TimeLeapListener = () => void;
const timeLeapListeners: TimeLeapListener[] = [];

// onTimeLeapChange registers a callback fired whenever the snapshot changes.
export function onTimeLeapChange(fn: TimeLeapListener): void {
  timeLeapListeners.push(fn);
}

export function setTimeLeap(packet: TLPacket | null): void {
  timeLeap = packet;
  for (const fn of timeLeapListeners) fn();
}

const jsonForm: JsonForm = {
  encode: (p) => JSON.stringify(p),
  decode: (raw) => JSON.parse(raw) as Record<string, unknown>,
};

// TL is JSON-only. Unlike GP's silent no-op Fanta form, these throw: a
// FantaCode TL means the server's gate regressed, and a loud error is the
// cheapest way to notice.
const tlFanta: FantaForm = {
  encode: () => {
    throw new Error("TL is JSON-only");
  },
  decode: () => {
    throw new Error("TL is JSON-only");
  },
};

// TL is JSON-only: the server emits it exclusively to JSON peers that
// advertised "timeleap" in their FL.
export function registerTimeLeapCodec(): void {
  registerPacket("TL", { fanta: tlFanta, json: jsonForm });
}

// applyTimeLeap handles a TL snapshot: save acks are ignored (they exist so the
// issuing moderator sees the worldline id), restores replace our state and
// re-stage the room.
export function applyTimeLeap(packet: TLPacket): void {
  if (!packet || packet.$header !== "TL" || !packet.state) return;
  if (packet.op === "save") return;
  setTimeLeap(packet);
  void restore(packet);
}

// The dynamic import keeps stateRestore out of the initial bundle and, more
// importantly, avoids a static cycle: stateRestore imports the viewport's chat
// handler, which imports client.ts.
async function restore(packet: TLPacket): Promise<void> {
  const { restoreTimeLeap } = await import("./stateRestore");
  await restoreTimeLeap(packet);
}
