import { ChatMsg } from "./interfaces/ChatMsg";
import { client, UPDATE_INTERVAL } from "../client";
import { AO_HOST } from "../client/aoHost";
import { SHOUTS } from "./constants/shouts";
import mlConfig from "../utils/aoml";
import request from "../services/request";
import { unescapeUnicode, safeHtmlTags } from "../escaping";
import * as aolib from "aolib-ts";
import { EmoteModifier } from "aolib-ts";
import preloadMessageAssets from "./utils/preloadMessageAssets";
import { loadSound } from "./audio";
import { buildTimeline, type TimelineEvent } from "./timeline";
import type { MessageSounds } from "./player";
import { getMmdController } from "./mmd";
import type { Model3dInfo } from "./mmd/types";
import { characterInfo, type CharacterInfo } from "../core/character";

const SOUND_SENTINELS = new Set(["", "0", "1"]);

let attorneyMarkdown: ReturnType<typeof mlConfig> | null = null;
let markdownDisabled = false;
let markdownInitPromise: Promise<ReturnType<typeof mlConfig> | null> | null = null;

const initAttorneyMarkdown = async () => {
  if (markdownDisabled) {
    return null;
  }
  if (attorneyMarkdown !== null) {
    return attorneyMarkdown;
  }
  if (markdownInitPromise) {
    return markdownInitPromise;
  }
  markdownInitPromise = (async () => {
    try {
      const iniContent = await request(`${AO_HOST}themes/default/chat_config.ini`);
      attorneyMarkdown = mlConfig(iniContent);
      return attorneyMarkdown;
    } catch (error) {
      console.debug("no chat_config.ini (optional); markdown disabled", error);
      markdownDisabled = true;
      return null;
    }
  })();
  return markdownInitPromise;
};

// ---------------------------------------------------------------------------
// Phase 1: build chatmsg (sync; pure mapping from packet + char.ini state)
// ---------------------------------------------------------------------------

/**
 * Builds the viewport's render state from an incoming MS packet. The
 * `ChatMsg` type is `aolib.packets.MSToClient & {render-state extras}`, so we just
 * spread the packet and add the display-transformed / char-derived /
 * render-loop fields on top.
 */
const buildChatMsg = (packet: aolib.packets.MSToClient, char: CharacterInfo): ChatMsg => {
  const msg_nameplate = char.showname;
  const msg_blips = char.blips;
  const char_chatbox = char.chatbox;
  // A group supersedes the 2-person pair: blank the paired fields so the pair
  // layer doesn't re-draw the first partner the group already renders. The
  // group is the per-message additional_chars (present only when a group
  // member speaks), not the viewer's roster.
  const additional = packet.$extras?.additional_chars;
  const hasGroup = Array.isArray(additional) && additional.length >= 2;

  let content = safeHtmlTags(unescapeUnicode(packet.message));
  let chatbox = char_chatbox;
  if (content.trim() === "") {
    // blankpost: empty chatbox means hide it
    content = "";
    chatbox = "";
  }

  return {
    ...packet,
    // Display-safe transforms (preanim/showname/paired_name/paired_emote
    // shadow the raw packet fields with safeHtmlTags'd versions).
    content,
    name: safeHtmlTags(packet.character),
    sprite: safeHtmlTags(packet.emote).toLowerCase(),
    sound: safeHtmlTags(packet.sfx_name).toLowerCase(),
    preanim: safeHtmlTags(packet.preanim).toLowerCase(),
    showname: safeHtmlTags(unescapeUnicode(packet.showname)),
    paired_name: hasGroup ? "" : safeHtmlTags(packet.paired_name),
    paired_emote: hasGroup ? "" : safeHtmlTags(packet.paired_emote),
    effects: [packet.effect.name, packet.effect.folder, packet.effect.sound],
    // Char-derived
    nameplate: msg_nameplate,
    chatbox,
    blips: safeHtmlTags(msg_blips),
    // Render-loop state
    speed: UPDATE_INTERVAL,
  };
};

// ---------------------------------------------------------------------------
// Phase 2: preload assets + finish preparing (async; no DOM mutation)
// ---------------------------------------------------------------------------

/**
 * Picks the plain-spans fallback when markdown is unavailable, otherwise
 * runs the AO attorney-markdown parser.
 */
const parseContent = async (chatmsg: ChatMsg): Promise<HTMLSpanElement[]> => {
  const colorName = chatmsg.text_color;
  if (!markdownDisabled) {
    try {
      const markdown = await initAttorneyMarkdown();
      if (markdown) {
        return markdown.applyMarkdown(chatmsg.content, colorName);
      }
    } catch {
      console.warn("markdown failed");
    }
  }
  return Array.from(chatmsg.content, (letter) => {
    const span = document.createElement("span");
    span.innerHTML = letter;
    span.className = `text_${colorName}`;
    return span;
  });
};

/**
 * Detects whether the speaking character is a 3D (MMD) model and, if so,
 * loads its model + motions and measures the preanim length. Returns null
 * for ordinary sprite characters (leaving the 2D path untouched).
 */
const prepare3dModel = async (
  char: CharacterInfo,
  chatmsg: ChatMsg,
  hasPreanim: boolean,
): Promise<Model3dInfo | null> => {
  if (!char.model) return null;

  const controller = await getMmdController();
  if (!controller) return null;

  // postanim / camera aren't on the wire — read them from the emote's char.ini
  // block (matched by its anim, which is chatmsg.sprite).
  const emoteDef = char.ini.emotes?.find(
    (e: { anim?: string }) => (e.anim ?? "").toLowerCase() === chatmsg.sprite,
  );
  const preanim = emoteDef?.preanim
    ? String(emoteDef.preanim).toLowerCase()
    : hasPreanim
      ? chatmsg.preanim
      : null;
  const postanim = emoteDef?.postanim ? String(emoteDef.postanim).toLowerCase() : null;
  const camera = emoteDef?.camera ? String(emoteDef.camera).toLowerCase() : null;

  return controller.preload(
    AO_HOST,
    chatmsg.name,
    char.model,
    chatmsg.sprite,
    preanim,
    postanim,
    camera,
    hasPreanim,
  );
};

/**
 * Finishes preparing the chatmsg: resolves all async work (asset
 * preload, markdown parsing) and computes derived render-loop flags.
 * No DOM mutation here -- only state on the chatmsg object itself.
 */
export const prepareMessage = async (
  packet: aolib.packets.MSToClient,
): Promise<{ chatmsg: ChatMsg; timeline: TimelineEvent[]; sounds: MessageSounds }> => {
  // By the folder name the message carries, so iniswaps show the swapped character.
  const char = await characterInfo(packet.character);
  const chatmsg = buildChatMsg(packet, char);

  // Preload all assets in parallel; primes browser cache.
  chatmsg.preloadedAssets = await preloadMessageAssets(
    chatmsg,
    AO_HOST,
    client.emote_extensions,
  );
  chatmsg.preanimdelay = chatmsg.preloadedAssets.preanimDuration;

  // Animation gates (need to know hasPreanim ahead of rendering).
  const hasPreanim =
    chatmsg.emote_modifier === EmoteModifier.preanim &&
    chatmsg.preanim !== "-" &&
    chatmsg.preanim !== "";
  chatmsg.startpreanim = true;
  chatmsg.startspeaking = !hasPreanim;

  // 3D character detection + model/motion preload. When present, the VMD's
  // measured preanim length drives the same timeline the sprites use.
  chatmsg.model3d = await prepare3dModel(char, chatmsg, hasPreanim);
  if (chatmsg.model3d) {
    chatmsg.preanimdelay = chatmsg.model3d.preanimDurationMs;
    chatmsg.startspeaking = chatmsg.model3d.preanimDurationMs <= 0;
  }

  // `~~prefix` centers the chat text; strip the marker from content.
  if (chatmsg.content.startsWith("~~")) {
    chatmsg.content = chatmsg.content.substring(2);
  }

  // Sentinel sounds ("", "0", "1") fall back to the effect's per-character
  // sound name (third slot of the `|`-separated effects string).
  if (SOUND_SENTINELS.has(chatmsg.sound)) {
    chatmsg.sound = chatmsg.effects[2] ?? "";
  }

  // Parse content into the per-character HTMLSpanElements for the
  // typewriter loop. Markdown-aware when available, plain fallback otherwise.
  chatmsg.parsed = await parseContent(chatmsg);

  const assets = chatmsg.preloadedAssets;
  const shout = SHOUTS[chatmsg.shout_modifier];
  const shoutUrl = shout ? assets.shoutSfxUrl || client.resources[shout].sfx : "";
  const optional = (url: string | null | undefined) => (url ? loadSound(url) : Promise.resolve(null));
  const [blip, shoutSound, sfx, realization, stab, evidence] = await Promise.all([
    loadSound(`${AO_HOST}sounds/blips/${encodeURI(chatmsg.blips.toLowerCase())}.opus`),
    optional(shoutUrl),
    optional(assets.emoteSfxUrl),
    optional(assets.realizationSfxUrl),
    optional(assets.stabSfxUrl),
    optional(chatmsg.evidence_id > 0 ? `${AO_HOST}sounds/general/sfx-evidenceshoop.opus` : null),
  ]);
  const sounds: MessageSounds = { blip, shout: shoutSound, sfx, realization, stab, evidence };

  const timeline = buildTimeline({
    shoutMs: shout ? client.resources[shout].duration : 0,
    preanimMs: chatmsg.startspeaking ? 0 : (chatmsg.preanimdelay ?? 0),
    nonInterrupting: chatmsg.noninterrupting_preanim === true,
    chars: chatmsg.content.split(""),
    speedMs: chatmsg.speed,
    sfxDelayMs: assets.emoteSfxUrl ? aolib.ticksToMs(chatmsg.sfx_delay) : null,
  });

  return { chatmsg, timeline, sounds };
};
