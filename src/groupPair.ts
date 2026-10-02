import {
  registerPacket,
  type FantaForm,
  type JsonForm,
} from "aolib-ts";

/**
 * Group pairing (GP) — a Nyathena JSON-only extension for unbounded multi-pair
 * groups. The server sends a `GP` roster snapshot on every change; the client
 * just replaces its group state (idempotent). Members are ordered front→back,
 * speaker included, so list position is the z-order.
 */

export interface GPMember {
  uid: number;
  char_id: number;
  name: string;
  emote: string;
  offset: { x: number; y: number };
  flip: string;
  order: number;
}

export interface GP {
  $header: "GP";
  group_id: string;
  members: GPMember[];
}

// The current group roster. null when not in a renderable group (< 2 members).
export let groupPair: GP | null = null;

export function setGroupPair(gp: GP | null): void {
  groupPair = gp;
}

const jsonForm: JsonForm = {
  encode: (p) => JSON.stringify(p),
  decode: (raw) => JSON.parse(raw) as Record<string, unknown>,
};

// GP is JSON-only in practice, but registerPacket wants both wire forms; the
// Fanta form is a never-used no-op (the server only sends GP over JSON).
const gpFanta: FantaForm = {
  encode: () => [],
  decode: () => ({}),
};

// GP is JSON-only (no FantaCode form): the server only sends it to JSON peers.
export function registerGroupPairCodec(): void {
  registerPacket("GP", { fanta: gpFanta, json: jsonForm });
}

// applyGroupPair handles a GP roster snapshot: replace the group state.
export function applyGroupPair(packet: GP): void {
  setGroupPair(
    packet && packet.members && packet.members.length >= 2 ? packet : null,
  );
}
