import { client } from "../client";
import { groupPair, onGroupPairChange } from "../groupPair";

/**
 * Pair order — wire-aware, mirroring AsyncAO.
 *
 * - Classic pair (not in a group): the front/back choice rides the MS
 *   `paired_order` field, which aolib packs as the `^0`/`^1` suffix on
 *   FantaCode and keeps as a separate `paired_order` field on JSON. So the
 *   SAME toggle works on both wires with no manual wire detection.
 * - Group (JSON): the roster is server-owned, so the same buttons send
 *   `/pairorder` and the list below reorders any member to any position.
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
  const name = (document.getElementById("OOC_name") as HTMLInputElement).value;
  client.server.send.CT({ name, message: `/pairorder ${uid} ${op}` });
}

function updatePairOrderButtons(): void {
  const front = document.getElementById("pair_order_front");
  const back = document.getElementById("pair_order_back");
  if (front) front.classList.toggle("dark", !inGroup() && pairOrder === 0);
  if (back) back.classList.toggle("dark", !inGroup() && pairOrder === 1);
}

/** "To front": classic pair order, or move yourself to the front of the group. */
export function pairOrderFront(): void {
  if (inGroup()) {
    sendPairOrder(client.playerID, "front");
  } else {
    pairOrder = 0;
    updatePairOrderButtons();
  }
}

/** "To behind": classic pair order, or move yourself to the back of the group. */
export function pairOrderBack(): void {
  if (inGroup()) {
    sendPairOrder(client.playerID, "back");
  } else {
    pairOrder = 1;
    updatePairOrderButtons();
  }
}

/** Per-member reorder buttons: data-uid + data-op ("up"/"down"/"front"/"back"). */
export function pairOrderMove(e: Event): void {
  const el = e.currentTarget as HTMLElement;
  const uid = Number(el.dataset.uid);
  const op = el.dataset.op;
  if (
    Number.isInteger(uid) &&
    (op === "up" || op === "down" || op === "front" || op === "back")
  ) {
    sendPairOrder(uid, op);
  }
}

/** Render the group roster (front→back) with per-member reorder buttons. */
export function renderGroupOrder(): void {
  const list = document.getElementById("group_order_list");
  if (!list) return;
  list.innerHTML = "";
  if (!groupPair || groupPair.members.length < 2) {
    list.style.display = "none";
    return;
  }
  list.style.display = "";

  const hint = document.createElement("p");
  hint.textContent = "Group order (front → back):";
  hint.title =
    "The JSON additional_chars roster is a full ordered list — reorder any member to any position.";
  list.appendChild(hint);

  for (const m of groupPair.members) {
    const row = document.createElement("div");
    row.style.margin = "2px 0";

    const up = document.createElement("button");
    up.type = "button";
    up.className = "client_button";
    up.textContent = "▲";
    up.title = "Move this member toward the front";
    up.dataset.action = "pairOrderMove";
    up.dataset.uid = String(m.uid);
    up.dataset.op = "up";

    const down = document.createElement("button");
    down.type = "button";
    down.className = "client_button";
    down.textContent = "▼";
    down.title = "Move this member toward the back";
    down.dataset.action = "pairOrderMove";
    down.dataset.uid = String(m.uid);
    down.dataset.op = "down";

    const label = document.createElement("span");
    label.style.marginLeft = "6px";
    let text = m.name || `char ${m.char_id}`;
    if (m.char_id === client.charID) text += " (you)";
    label.textContent = text;

    row.append(up, down, label);
    list.appendChild(row);
  }
}

/** Wire up the reorder controls and render once (re-renders on GP changes). */
export function initPairOrder(): void {
  onGroupPairChange(renderGroupOrder);
  onGroupPairChange(updatePairOrderButtons);
  renderGroupOrder();
  updatePairOrderButtons();
}
