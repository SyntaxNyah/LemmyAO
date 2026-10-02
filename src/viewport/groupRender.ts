import { type GPMember } from "../groupPair";
import { client } from "../client";
import { AO_HOST } from "../client/aoHost";
import { resolveAndPreloadImage } from "../utils/assetCache";
import { buildEmoteUrls } from "./utils/preloadMessageAssets";

/**
 * Group sprite rendering for the `GP` extension (JSON-only). When a group
 * roster is active — which only happens over the JSON wire, on a server that
 * negotiated `grouppair` — the non-speaking members are drawn as extra sprite
 * layers behind the speaker. The speaker itself stays on the existing
 * `client_char` layer, so this is purely additive.
 */

const CONTAINER_ID = "client_group";

interface GroupLayer {
  container: HTMLDivElement;
  img: HTMLImageElement;
}

let layers: GroupLayer[] = [];

function container(): HTMLElement {
  let c = document.getElementById(CONTAINER_ID);
  if (!c) {
    c = document.createElement("div");
    c.id = CONTAINER_ID;
    c.style.position = "absolute";
    c.style.pointerEvents = "none";
    c.style.inset = "0";
    // Insert into the full-view stage between the court art and the character
    // layers, so group members draw behind the speaker/pair but over the court.
    const fullview = document.getElementById("client_fullview");
    const anchor = fullview?.querySelector(".client_char");
    if (fullview) {
      if (anchor) fullview.insertBefore(c, anchor);
      else fullview.appendChild(c);
    } else {
      (document.getElementById("client_gamewindow") ?? document.body).appendChild(c);
    }
  }
  return c;
}

function syncLayerCount(n: number): GroupLayer[] {
  const c = container();
  while (layers.length < n) {
    // Mirror the char-sprite structure: a `.client_char` container (full-area,
    // absolutely positioned, offset via left/top) wrapping a sprite `<img>`
    // (styled by `.client_char > img`). Reusing that class gives the group
    // members identical sizing/anchoring to the speaker sprite.
    const div = document.createElement("div");
    div.className = "client_char";
    div.style.position = "absolute";
    const img = document.createElement("img");
    img.dataset.action = "charError";
    img.dataset.event = "error";
    div.appendChild(img);
    c.appendChild(div);
    layers.push({ container: div, img });
  }
  while (layers.length > n) {
    layers.pop()!.container.remove();
  }
  return layers;
}

// Build the idle-sprite URL for a group member. The GP roster carries the
// character folder + idle emote; the `(a)` idle-frame prefix matches setEmote.
function setGroupSprite(img: HTMLImageElement, m: GPMember): void {
  const urls = buildEmoteUrls(
    AO_HOST,
    client.emote_extensions,
    m.name.toLowerCase(),
    m.emote.toLowerCase(),
    "(a)",
  );
  // resolveAndPreloadImage returns the first candidate that loads (or the
  // transparent fallback), covering every extension + the nested (a)/ layout.
  resolveAndPreloadImage(urls).then((url) => {
    img.src = url;
  });
}

function flipTransform(flip: string): string {
  const x = flip === "horizontal" || flip === "horizontal_and_vertical" ? -1 : 1;
  const y = flip === "vertical" || flip === "horizontal_and_vertical" ? -1 : 1;
  return `scale(${x}, ${y})`;
}

// Render the non-speaking group members behind the speaker. `speakerCharID` is
// the speaker's char id so we don't draw them twice.
function baseLeft(side: string): number {
  return side === "wit" ? 200 : side === "pro" ? 400 : 0;
}

export function renderGroupPeers(
  members: GPMember[],
  speakerCharID: number,
  speakerSide: string,
): void {
  if (!members || members.length < 2) {
    clearGroup();
    return;
  }

  const peers = members.filter((m) => m.char_id !== speakerCharID);
  const groupLayers = syncLayerCount(peers.length);

  peers.forEach((m, i) => {
    const layer = groupLayers[i];
    // Each member keeps their own roster side + offset (the server sends both);
    // only fall back to the speaker's side for a roster that predates `side`.
    const side = m.side ?? speakerSide;
    setGroupSprite(layer.img, m);
    layer.container.style.left = `${baseLeft(side) + (m.offset?.x ?? 0)}%`;
    layer.container.style.top = `${m.offset?.y ?? 0}%`;
    layer.container.style.transform = flipTransform(m.flip ?? "none");
    layer.container.style.zIndex = String(m.order ?? i);
    layer.container.style.opacity = "1";
  });
}

// Convert the JSON-only `additional_chars` MS field into the roster model.
export function membersFromAdditionalChars(raw: unknown): GPMember[] {
  if (!Array.isArray(raw)) return [];
  return (raw as Array<Record<string, unknown>>).map((c) => {
    const off = (c.offset ?? {}) as { x?: number; y?: number };
    return {
      uid: 0,
      char_id: Number(c.charid),
      name: String(c.name ?? ""),
      emote: String(c.emote ?? ""),
      side: String(c.side ?? ""),
      offset: { x: off.x ?? 0, y: off.y ?? 0 },
      flip: String(c.flip ?? "none"),
      order: Number(c.order ?? 0),
    };
  });
}

// Clear all group sprites (group dissolved, or a non-group message).
export function clearGroup(): void {
  for (const layer of layers) layer.container.remove();
  layers = [];
}
