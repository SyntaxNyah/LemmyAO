import { groupPair, type GPMember } from "../groupPair";
import { AO_HOST } from "../client/aoHost";
import transparentPng from "../constants/transparentPng";

/**
 * Group sprite rendering for the `GP` extension (JSON-only). When a group
 * roster is active — which only happens over the JSON wire, on a server that
 * negotiated `grouppair` — the non-speaking members are drawn as extra sprite
 * layers behind the speaker. The speaker itself stays on the existing
 * `client_char` layer, so this is purely additive.
 */

const CONTAINER_ID = "client_group";

let layers: HTMLImageElement[] = [];

function container(): HTMLElement {
  let c = document.getElementById(CONTAINER_ID);
  if (!c) {
    c = document.createElement("div");
    c.id = CONTAINER_ID;
    c.style.position = "absolute";
    c.style.pointerEvents = "none";
    c.style.inset = "0";
    c.style.zIndex = "1"; // behind the char/pair layers
    (document.getElementById("client_gamewindow") ?? document.body).appendChild(c);
  }
  return c;
}

function syncLayerCount(n: number): HTMLImageElement[] {
  const c = container();
  while (layers.length < n) {
    const img = document.createElement("img");
    img.className = "client_char"; // reuse the sprite sizing/positioning CSS
    img.style.position = "absolute";
    img.dataset.action = "charError";
    img.dataset.event = "error";
    c.appendChild(img);
    layers.push(img);
  }
  while (layers.length > n) {
    layers.pop()!.remove();
  }
  return layers;
}

// Build the idle-sprite URL for a group member. The GP roster carries the
// character folder + idle emote; the `(a)` idle-frame prefix matches setEmote.
function spriteURL(m: GPMember): string {
  const name = m.name.toLowerCase();
  const emote = m.emote.toLowerCase();
  return `${AO_HOST}characters/${encodeURI(name)}/(a)${encodeURI(emote)}.gif`;
}

function flipTransform(flip: string): string {
  const x = flip === "horizontal" || flip === "horizontal_and_vertical" ? -1 : 1;
  const y = flip === "vertical" || flip === "horizontal_and_vertical" ? -1 : 1;
  return `scale(${x}, ${y})`;
}

// Render the non-speaking group members behind the speaker. `speakerCharID` is
// the speaker's char id so we don't draw them twice.
export function renderGroupPeers(speakerCharID: number, side: string): void {
  const gp = groupPair;
  if (!gp || gp.members.length < 2) {
    clearGroup();
    return;
  }

  const peers = gp.members.filter((m) => m.char_id !== speakerCharID);
  const imgs = syncLayerCount(peers.length);

  const baseLeft = side === "wit" ? 200 : side === "pro" ? 400 : 0;

  peers.forEach((m, i) => {
    const img = imgs[i];
    img.src = spriteURL(m);
    img.onerror = () => (img.src = transparentPng);
    img.style.left = `${baseLeft + (m.offset?.x ?? 0)}%`;
    img.style.top = `${m.offset?.y ?? 0}%`;
    img.style.transform = flipTransform(m.flip ?? "none");
    img.style.zIndex = String(m.order ?? i);
    img.style.opacity = "1";
  });
}

// Clear all group sprites (group dissolved, or a non-group message).
export function clearGroup(): void {
  for (const img of layers) img.remove();
  layers = [];
}
