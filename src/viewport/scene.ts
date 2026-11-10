import { ChatMsg } from "./interfaces/ChatMsg";
import { client } from "../client";
import setEmoteFromUrl from "../client/setEmoteFromUrl";
import { AO_HOST } from "../client/aoHost";
import { SHOUTS } from "./constants/shouts";
import { setChatbox } from "../dom/setChatbox";
import { resizeChatbox } from "../dom/resizeChatbox";
import { DeskModifier, EmoteModifier, Flip, ShoutModifier, Side } from "aolib-ts";
import { renderGroupPeers, membersFromAdditionalChars } from "./groupRender";
import { setupCharacterSlot } from "./mmd/applyEmote";
import { charLayer, els } from "./elements";
import { viewportState } from "./state";
import { set_side } from "./utils/setSide";
import { requestBuffer } from "../services/request";
import { animationLength, animationLoops } from "../utils/calculatorHandler";

const BAD_EFFECTS = new Set(["", "-", "none"]);

/** Per-axis mirroring CSS transform for a Flip value. */
const flipTransform = (flip: Flip | undefined): string => {
  const x =
    flip === Flip.horizontal || flip === Flip.horizontal_and_vertical ? -1 : 1;
  const y =
    flip === Flip.vertical || flip === Flip.horizontal_and_vertical ? -1 : 1;
  return `scale(${x}, ${y})`;
};


/**
 * Plays the shout bubble + sfx for the message, or clears the shout
 * timer if the message has no shout. The chat container is hidden
 * during the shout so it doesn't show through the bubble animation.
 */
const applyShout = (chatmsg: ChatMsg, chatContainerBox: HTMLElement) => {
  const shout = SHOUTS[chatmsg.shout_modifier];
  if (!shout) return;

  const preloaded = chatmsg.preloadedAssets!;
  const shoutSprite = els.shout;
  chatContainerBox.style.opacity = "0";

  // Prefer the preloaded per-character bubble; fall back to the default
  // URL otherwise. Custom shouts have no default -- use the legacy
  // character/<name>/custom.gif path which the onerror handler hides
  // if it's missing.
  if (chatmsg.shout_modifier === ShoutModifier.custom) {
    shoutSprite.src =
      preloaded.shoutBubbleUrl ??
      `${AO_HOST}characters/${encodeURI(chatmsg.name.toLowerCase())}/custom.gif`;
  } else {
    shoutSprite.src = preloaded.shoutBubbleUrl ?? client.resources[shout].src;
    shoutSprite.style.animation = "bubble 700ms steps(10, jump-both)";
  }
  shoutSprite.onerror = () => {
    shoutSprite.style.display = "none";
  };
  shoutSprite.style.display = "block";
};

/** Spawns the rain-drop DOM into the foreground layer. */
const applyRainEffect = (fg: HTMLDivElement, effectName: string) => {
  (<HTMLLinkElement>document.getElementById("effect_css")).href =
    "styles/effects/rain.css";
  let intensity = 200;
  if (effectName.endsWith("weak")) intensity = 100;
  else if (effectName.endsWith("strong")) intensity = 400;
  if (intensity < fg.childElementCount) fg.innerHTML = "";
  else intensity -= fg.childElementCount;
  for (let i = 0; i < intensity; i++) {
    const drop = document.createElement("p");
    drop.style.left = Math.random() * 100 + "%";
    drop.style.animationDelay = String(Math.random()) + "s";
    fg.appendChild(drop);
  }
};

/**
 * Applies the foreground effects overlay: rain spawns drops, named
 * effects load a webp into `client_fg`, and absent/sentinel effects
 * clear the layer.
 */
const applyEffectsOverlay = (fg: HTMLDivElement, effects: string[]) => {
  fg.style.animation = "";
  const effectName = effects[0].toLowerCase();
  if (effectName.startsWith("rain")) {
    applyRainEffect(fg, effectName);
  } else if (effects[0] && !BAD_EFFECTS.has(effectName)) {
    (<HTMLLinkElement>document.getElementById("effect_css")).href = "";
    // The layer is a <div> (rain fills it with drops), so the effect is an image inside it.
    const overlay = document.createElement("img");
    overlay.className = "effect";
    overlay.alt = "";
    overlay.onerror = () => overlay.remove();
    overlay.src = `${AO_HOST}themes/default/effects/${encodeURI(effectName)}.webp`;
    fg.replaceChildren(overlay);
    // An image stays on its last frame; a play-once effect (a flash) has to go when it ends.
    const loaded = new Promise((resolve) => overlay.addEventListener("load", resolve, { once: true }));
    void Promise.all([requestBuffer(overlay.src), loaded]).then(([bytes]) => {
      const loops = animationLoops(bytes);
      if (loops > 0) setTimeout(() => overlay.remove(), animationLength(bytes) * loops);
    }).catch(() => {});
  } else {
    fg.replaceChildren();
  }
};

// ---------------------------------------------------------------------------
// Phase 3: render (sync; sets the scene up; the player runs the timeline)
// ---------------------------------------------------------------------------

/** Sets the scene up for a message; the player then runs its timeline. */
export const setScene = (chatmsg: ChatMsg) => {
  viewportState.chatmsg = chatmsg;
  viewportState.textNow = "";
  viewportState.animating = true;

  const fg = els.foreground;
  const gamewindow = els.gameWindow;
  const waitingBox = els.chatWaiting;
  gamewindow.style.animation = "";
  waitingBox.style.opacity = "0";

  const eviBox = els.evidence;
  if (viewportState.lastEvidence !== chatmsg.evidence_id) {
    eviBox.style.opacity = "0";
    eviBox.style.height = "0%";
  }
  viewportState.lastEvidence = chatmsg.evidence_id;

  const charLayers = charLayer(chatmsg.side).container;
  const pairLayers = charLayer(chatmsg.side, true).container;

  const chatContainerBox = els.chatContainer;
  const nameBoxInner = els.innerName;
  const chatBoxInner = els.innerChat;

  const displayname =
    chatmsg.showname !== ""
      ? chatmsg.showname
      : chatmsg.nameplate;

  if (!chatmsg.additive) {
    chatBoxInner.innerText = viewportState.textNow;
  }
  nameBoxInner.innerText = displayname;

  if (viewportState.lastCharacter !== chatmsg.name) {
    charLayers.style.opacity = "0";
    pairLayers.style.opacity = "0";
  }
  viewportState.lastCharacter = chatmsg.name;


  const preloaded = chatmsg.preloadedAssets!;
  // 3D characters render into a Babylon canvas placed in this slot; 2D ones
  // keep the sprite <img>. setupCharacterSlot tears down the 3D canvas when
  // the speaker is 2D.
  setupCharacterSlot(chatmsg.side, chatmsg.model3d);
  if (!chatmsg.model3d) {
    // Without a shout the preanim starts on the first tick; showing it now
    // avoids flashing the idle sprite for that tick. With a shout, the idle
    // sprite waits under the bubble so the preanim doesn't start early.
    const preanimNow = chatmsg.preanimdelay > 0 && !SHOUTS[chatmsg.shout_modifier];
    setEmoteFromUrl(preanimNow ? preloaded.preanimUrl : preloaded.idleUrl, false, chatmsg.side);
  }
  if (chatmsg.paired_name) {
    setEmoteFromUrl(preloaded.pairIdleUrl, true, chatmsg.side);
  }

  // Group pairing: draw the full ordered roster around the speaker from the
  // per-message additional_chars (present only when a group member speaks).
  renderGroupPeers(
    membersFromAdditionalChars(chatmsg.$extras?.additional_chars),
    chatmsg.char_id,
    chatmsg.side,
    { honorOrder: true },
  );

  applyShout(chatmsg, chatContainerBox);

  // Desk visibility / speed-lines per emote_modifier + desk_modifier.
  const hasPreanim = !chatmsg.startspeaking;
  if (hasPreanim) {
    chatContainerBox.style.opacity = "0";
  } else if (chatmsg.content.trim() !== "") {
    chatContainerBox.style.opacity = "1";
  }
  const setAside = {
    position: chatmsg.side,
    showSpeedLines: false,
    showDesk: false,
  };
  let skipoffset = false;
  if (chatmsg.emote_modifier === EmoteModifier.zoom) {
    setAside.showSpeedLines = true;
    setAside.showDesk = false;
  } else {
    switch (chatmsg.desk_modifier) {
      case DeskModifier.shown:
      case DeskModifier.show_during_preanim_then_center:
        setAside.showDesk = true;
        break;
      case DeskModifier.hide_and_center_during_preanim:
        skipoffset = true;
        break;
      // HIDDEN / HIDE_DURING_PREANIM / SHOW_DURING_PREANIM -> stays
      // hidden (showDesk is initialized to false above).
    }
  }
  set_side(setAside);

  setChatbox(chatmsg.chatbox);
  resizeChatbox();
  if (chatmsg.chatbox === "") {
    chatContainerBox.style.opacity = "0";
  }

  if (!skipoffset) {
    // Flip the character. HORIZONTAL_AND_VERTICAL handles both axes.
    charLayers.style.transform = flipTransform(chatmsg.flip);
    pairLayers.style.transform = flipTransform(chatmsg.paired_flip);

    // Shift by the horizontal offset.
    const baseLeft =
      chatmsg.side === Side.wit
        ? 200
        : chatmsg.side === Side.pro
          ? 400
          : 0;
    pairLayers.style.left = `${baseLeft + (chatmsg.paired_offset?.x ?? 0)}%`;
    charLayers.style.left = `${baseLeft + (chatmsg.offset?.x ?? 0)}%`;

    // Vertical offsets.
    pairLayers.style.top = `${chatmsg.paired_offset?.y ?? 0}%`;
    charLayers.style.top = `${chatmsg.offset?.y ?? 0}%`;

    // Pair order: 0 = speaker in front (default), 1 = speaker behind. The pair
    // layer precedes the char layer in the DOM, so the speaker stacks on top by
    // default; for "behind", move the pair after the char. DOM order drives the
    // stacking here — a z-index would lift the sprites above the chat box.
    const speakerBehind = chatmsg.paired_order === 1;
    if (speakerBehind) {
      charLayers.after(pairLayers);
    } else {
      charLayers.before(pairLayers);
    }
  }

  // Text alignment: `~~` prefix on the raw message centers the chat.
  // The prefix itself was stripped from `chatmsg.content` in prepare,
  // so we check the unmodified `chatmsg.message` instead.
  chatBoxInner.style.textAlign = chatmsg.message.startsWith("~~")
    ? "center"
    : "inherit";

  applyEffectsOverlay(fg, chatmsg.effects);

  charLayers.style.opacity = "1";
};
