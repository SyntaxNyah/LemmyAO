import { client } from "../client";
import { groupPair, onGroupPairChange } from "../groupPair";

/**
 * Pair order — reorders the server-owned group roster (GP / additional_chars)
 * via /pairorder. "To front"/"To behind" move YOU; the group list reorders any
 * member to any position.
 *
 * The classic 2-person pair order (the aolib `paired_order` field, packed as
 * the FantaCode `^0`/`^1` suffix) is NOT wired here yet: it needs aolib-ts
 * 2.6.1, which has `paired_order` in `MSToServerInit` but is not yet published
 * (npm latest is 2.6.0). Once 2.6.1 is published and bumped, `onICEnter.ts`
 * should send `paired_order` and the two buttons should branch on in-group
 * (classic → paired_order, group → /pairorder) — mirroring AsyncAO.
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
