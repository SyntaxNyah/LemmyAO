import { client } from "../client";
import { groupPair, onGroupPairChange } from "../groupPair";

/**
 * Pair order — the JSON-side of the group-pair reorder. The server owns the
 * roster (GP / additional_chars); /pairorder reorders it. LemmyAO is
 * JSON-only, so every control here maps to /pairorder: "To front"/"To behind"
 * move YOU, and the group list reorders any member to any position. (On the
 * FantaCode wire this same concept rides the classic ^0/^1 suffix, which
 * LemmyAO never sends.)
 */

function sendPairOrder(uid: number, op: string): void {
  const name = (document.getElementById("OOC_name") as HTMLInputElement).value;
  client.server.send.CT({ name, message: `/pairorder ${uid} ${op}` });
}

/** Move yourself (the speaker) to the front of the group. */
export function pairOrderFront(): void {
  sendPairOrder(client.playerID, "front");
}

/** Move yourself (the speaker) to the back of the group. */
export function pairOrderBack(): void {
  sendPairOrder(client.playerID, "back");
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
  renderGroupOrder();
}
