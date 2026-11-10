import { client } from "../client";
import { groupPair } from "../groupPair";
import { sendOOC } from "../core/commands";

/**
 * Pair order — wire-aware, mirroring AsyncAO.
 *
 * - Classic pair (not in a group): the front/back choice rides the MS
 *   `paired_order` field, which aolib packs as the `^0`/`^1` suffix on
 *   FantaCode and keeps as a separate `paired_order` field on JSON. So the
 *   SAME toggle works on both wires with no manual wire detection.
 * - Group (JSON): the roster is server-owned, so front/back send `/pairorder`.
 */

let pairOrder = 0; // 0 = speaker in front, 1 = speaker behind

/** The classic pair z-order, sent as `paired_order` on the next IC message. */
export function getPairOrder(): number {
  return pairOrder;
}

function inGroup(): boolean {
  return !!groupPair && groupPair.members.length >= 2;
}

function sendPairOrder(uid: number, op: string): void {
  sendOOC(`/pairorder ${uid} ${op}`);
}

/** "To front": classic pair order, or move yourself to the front of the group. */
export function pairOrderFront(): void {
  if (inGroup()) {
    sendPairOrder(client.playerID, "front");
  } else {
    pairOrder = 0;
  }
}

/** "To behind": classic pair order, or move yourself to the back of the group. */
export function pairOrderBack(): void {
  if (inGroup()) {
    sendPairOrder(client.playerID, "back");
  } else {
    pairOrder = 1;
  }
}
