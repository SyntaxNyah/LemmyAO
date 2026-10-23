import { registerPacket, type FantaForm, type JsonForm } from "aolib-ts";

/**
 * Teleport (TP) — a Nyathena JSON-only extension carrying a full room snapshot
 * so a client can rewind its view. The server sends a snapshot on demand and the
 * client replaces its TP state wholesale (idempotent, exactly like GP).
 *
 * TP is second-class: it is registered through aolib-ts's custom-packet
 * registry, never added to spec/, and has no conformance vector.
 */

export interface TPMusic {
  name: string;
  char_id: number;
  showname: string;
  looping: boolean;
}

export interface TPArea {
  name: string;
  background: string;
  side: string;
  music: TPMusic;
  status: number;
  evidence: string[];
  testimony: string[];
}

export interface TPCastMember {
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

export interface TPLogLine {
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
 * agrees. "overlay": the snapshot went only to TP-capable peers, so this client
 * deliberately shows an older scene than a non-TP peer would.
 */
export type TPMode = "authoritative" | "overlay";

export interface TPPacket {
  $header: "TP";
  op: "restore" | "save";
  snapshot_id: string;
  label: string;
  divergence: string;
  issued_by: number;
  issued_at: number;
  ttl_s: number;
  mode: TPMode;
  state: {
    area: TPArea;
    cast: TPCastMember[];
    log: TPLogLine[];
  };
}

/** The snapshot most recently rendered, or null while the room is live. */
export let teleport: TPPacket | null = null;

type TeleportListener = () => void;
const teleportListeners: TeleportListener[] = [];

// onTeleportChange registers a callback fired whenever the snapshot changes.
export function onTeleportChange(fn: TeleportListener): void {
  teleportListeners.push(fn);
}

export function setTeleport(packet: TPPacket | null): void {
  teleport = packet;
  for (const fn of teleportListeners) fn();
}

const jsonForm: JsonForm = {
  encode: (p) => JSON.stringify(p),
  decode: (raw) => JSON.parse(raw) as Record<string, unknown>,
};

// TP is JSON-only. Unlike GP's silent no-op Fanta form, these throw: a
// FantaCode TP means the server's gate regressed, and a loud error is the
// cheapest way to notice.
const tlFanta: FantaForm = {
  encode: () => {
    throw new Error("TP is JSON-only");
  },
  decode: () => {
    throw new Error("TP is JSON-only");
  },
};

// TP is JSON-only: the server emits it exclusively to JSON peers that
// advertised "teleport" in their FL.
export function registerTeleportCodec(): void {
  registerPacket("TP", { fanta: tlFanta, json: jsonForm });
}

// applyTeleport handles a TP snapshot: save acks are ignored (they exist so the
// issuing moderator sees the worldline id), restores replace our state and
// re-stage the room.
export function applyTeleport(packet: TPPacket): void {
  if (!packet || packet.$header !== "TP" || !packet.state) return;
  if (packet.op === "save") return;
  setTeleport(packet);
  void restore(packet);
}

// The dynamic import keeps stateRestore out of the initial bundle and, more
// importantly, avoids a static cycle: stateRestore imports the viewport's chat
// handler, which imports client.ts.
async function restore(packet: TPPacket): Promise<void> {
  const { restoreTeleport } = await import("./stateRestore");
  await restoreTeleport(packet);
}
