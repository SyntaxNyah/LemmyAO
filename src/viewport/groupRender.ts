import { type GPMember } from "../groupPair";
import { client } from "../client";
import { AO_HOST } from "../client/aoHost";
import { resolveAndPreloadImage } from "../utils/assetCache";
import { buildEmoteUrls } from "../utils/emoteUrls";

/**
 * Group sprite rendering for the `GP` extension (JSON-only). When a group
 * roster is active — which only happens over the JSON wire, on a server that
 * negotiated `grouppair` — the non-speaking members are drawn as extra sprite
 * layers. The speaker stays on the existing `client_<side>_char` / `client_char`
 * layer, so it keeps its talking/preanim/MMD animation.
 *
 * The roster is ordered front→back and includes the speaker. A member before
 * the speaker in the list is drawn in front of them; a member after is drawn
 * behind. Two isolated containers anchored immediately before/after the
 * speaker layer provide that split without z-index (a z-index here can lift
 * sprites above the chatbox, a later sibling of #client_gamewindow).
 */

const BEHIND_CONTAINER_ID = "client_group_behind";
const FRONT_CONTAINER_ID = "client_group_front";
const LEGACY_CONTAINER_ID = "client_group";

interface GroupLayer {
  container: HTMLDivElement;
  img: HTMLImageElement;
}

let layers: GroupLayer[] = [];

/** The speaker's own sprite layer for a side (full-view sides use their own). */
function speakerLayer(side: string): HTMLElement | null {
  const fullView = side === "def" || side === "wit" || side === "pro";
  return document.getElementById(fullView ? `client_${side}_char` : "client_char");
}

function ensureContainer(id: string, parent: HTMLElement): HTMLDivElement {
  let c = document.getElementById(id) as HTMLDivElement | null;
  if (!c) {
    c = document.createElement("div");
    c.id = id;
    c.style.position = "absolute";
    c.style.pointerEvents = "none";
    c.style.inset = "0";
    // Keep each container's layer order local; it must never paint above the
    // chatbox (#client_chatcontainer is a later sibling of #client_gamewindow).
    c.style.isolation = "isolate";
  }
  if (c.parentElement !== parent) parent.appendChild(c);
  return c;
}

function syncLayerCount(n: number): GroupLayer[] {
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

// Each member's own horizontal anchor in the full-view stage. Classic-view
// sides all sit at 0 (there is only one stage).
function baseLeft(side: string): number {
  return side === "wit" ? 200 : side === "pro" ? 400 : 0;
}

export interface GroupRenderOptions {
  /**
   * Honor the speaker's position in the ordered roster (live GP). When false,
   * every peer is drawn behind the speaker — use this for callers whose member
   * list is a crowd, not a roster z-order.
   */
  honorOrder?: boolean;
}

interface PeerPlacement {
  member: GPMember;
  index: number;
  behind: boolean;
}

/**
 * Draw the non-speaker roster around the speaker.
 *
 * `members` is the per-message ordered roster (front→back, speaker included).
 * The array position is authoritative: members before the speaker are drawn in
 * front, members after are drawn behind. Within each side of the split the
 * layers are appended front-most last, so DOM order (not z-index) controls the
 * final stack.
 */
export function renderGroupPeers(
  members: GPMember[],
  speakerCharID: number,
  speakerSide: string,
  options: GroupRenderOptions = {},
): void {
  if (!members || members.length < 2) {
    clearGroup();
    return;
  }

  const speakerIndex = members.findIndex((m) => m.char_id === speakerCharID);
  const honorOrder = options.honorOrder === true && speakerIndex >= 0;

  const peers: PeerPlacement[] = members
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => member.char_id !== speakerCharID)
    .map(({ member, index }) => ({
      member,
      index,
      behind: !honorOrder || index > speakerIndex,
    }));

  const groupLayers = syncLayerCount(peers.length);
  const layerByIndex = new Map<number, GroupLayer>();
  peers.forEach((peer, i) => {
    const layer = groupLayers[i];
    layerByIndex.set(peer.index, layer);

    // Each member keeps their own roster side + offset (the server sends both);
    // only fall back to the speaker's side for a roster that predates `side`.
    const side = peer.member.side ?? speakerSide;
    setGroupSprite(layer.img, peer.member);
    layer.img.alt = peer.member.name;
    layer.img.dataset.charid = String(peer.member.char_id);
    layer.container.style.left = `${baseLeft(side) + (peer.member.offset?.x ?? 0)}%`;
    layer.container.style.top = `${peer.member.offset?.y ?? 0}%`;
    layer.container.style.transform = flipTransform(peer.member.flip ?? "none");
    layer.container.style.zIndex = "";
    layer.container.style.opacity = "1";
  });

  const anchor = speakerLayer(speakerSide);
  const parent =
    anchor?.parentElement ??
    document.getElementById("client_fullview") ??
    document.body;
  const behindContainer = ensureContainer(BEHIND_CONTAINER_ID, parent);
  const frontContainer = ensureContainer(FRONT_CONTAINER_ID, parent);

  // A previous version used a single #client_group; drop it on upgrade.
  document.getElementById(LEGACY_CONTAINER_ID)?.remove();

  if (anchor) {
    anchor.before(behindContainer);
    anchor.after(frontContainer);
  } else {
    parent.append(behindContainer, frontContainer);
  }

  // Append farthest-to-nearest within each container: the front-most member
  // (lowest roster index) ends up last and paints on top. Lower indices are
  // in front of higher ones regardless of which side of the speaker they are.
  const appendInStackOrder = (container: HTMLElement, behind: boolean) => {
    peers
      .filter((peer) => peer.behind === behind)
      .sort((a, b) => b.index - a.index)
      .forEach((peer) => {
        const layer = layerByIndex.get(peer.index);
        if (layer) container.appendChild(layer.container);
      });
  };
  appendInStackOrder(behindContainer, true);
  appendInStackOrder(frontContainer, false);

  // Don't leave empty stacking contexts in the stage.
  if (!peers.some((peer) => peer.behind)) behindContainer.remove();
  if (!peers.some((peer) => !peer.behind)) frontContainer.remove();
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
  for (const id of [
    BEHIND_CONTAINER_ID,
    FRONT_CONTAINER_ID,
    LEGACY_CONTAINER_ID,
  ]) {
    document.getElementById(id)?.remove();
  }
}
