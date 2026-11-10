import { DeskModifier, Side } from "aolib-ts";
import { client } from "../client";
import { state } from "../core/state";
import { evidenceUrl } from "../core/evidence";
import setEmoteFromUrl from "../client/setEmoteFromUrl";
import { applyCharacterEmote } from "./mmd/applyEmote";
import { set_side } from "./utils/setSide";
import { audioNow, audioReady, cancelScheduled, outputLatency, schedule } from "./audio";
import type { ChatMsg } from "./interfaces/ChatMsg";
import type { TimelineEvent } from "./timeline";
import { charLayer, els } from "./elements";

/** Decoded sounds a message can play; null when missing. */
export interface MessageSounds {
  blip: AudioBuffer | null;
  shout: AudioBuffer | null;
  sfx: AudioBuffer | null;
  realization: AudioBuffer | null;
  stab: AudioBuffer | null;
  evidence: AudioBuffer | null;
}

// Time to set up the scheduled sounds before the first one is due.
const LEAD_S = 0.05;

let timer: ReturnType<typeof setTimeout> | undefined;
let playing = 0;
let releaseQueue = () => {};

function scheduleSounds(events: TimelineEvent[], chatmsg: ChatMsg, sounds: MessageSounds, start: number) {
  const at = (ms: number) => start + ms / 1000;
  for (const e of events) {
    const play = (buffer: AudioBuffer | null, loop = false) => buffer && schedule(buffer, at(e.at), e.kind === "blip" ? "blip" : "sfx", loop);
    if (e.kind === "blip") play(sounds.blip);
    else if (e.kind === "shout") play(sounds.shout);
    else if (e.kind === "sfx") play(sounds.sfx, chatmsg.sfx_looping);
    else if (e.kind === "shake") play(sounds.stab);
    else if (e.kind === "flash") play(sounds.realization);
    else if (e.kind === "preanim") {
      if (chatmsg.screenshake) play(sounds.stab);
      if (chatmsg.realization) play(sounds.realization);
    } else if (e.kind === "talk" && chatmsg.evidence_id > 0) play(sounds.evidence);
  }
}

const shake = () => {
  const game = els.gameWindow;
  game.style.animation = "shake 0.2s 1";
  setTimeout(() => game.style.removeProperty("animation"), 200);
};

const flash = () => {
  const fg = els.foreground;
  fg.style.animation = "flash 0.4s 1";
  setTimeout(() => fg.style.removeProperty("animation"), 400);
};

function showChatbox(chatmsg: ChatMsg) {
  if (chatmsg.chatbox !== "" && chatmsg.content.trim() !== "") els.chatContainer.style.opacity = "1";
}

function hideShout() {
  const shout = els.shout;
  shout.style.display = "none";
  shout.style.animation = "";
}

function showEvidence(chatmsg: ChatMsg) {
  const box = els.evidence;
  const evidence = state.evidence[chatmsg.evidence_id - 1];
  box.src = evidence ? evidenceUrl(evidence.image) : "";
  box.style.width = "auto";
  box.style.height = "36.5%";
  box.style.opacity = "1";
  // Defense shows evidence on the right.
  box.style.right = chatmsg.side === Side.def ? "1em" : "initial";
  box.style.left = chatmsg.side === Side.def ? "initial" : "1em";
}

const DESK_DURING_TALK: Partial<Record<DeskModifier, boolean>> = {
  [DeskModifier.hide_during_preanim]: true,
  [DeskModifier.show_during_preanim]: false,
  [DeskModifier.hide_and_center_during_preanim]: true,
  [DeskModifier.show_during_preanim_then_center]: false,
};

function apply(e: TimelineEvent, chatmsg: ChatMsg) {
  const assets = chatmsg.preloadedAssets!;
  switch (e.kind) {
    case "preanim": {
      if (chatmsg.screenshake) shake();
      if (chatmsg.realization) flash();
      if ((chatmsg.preanimdelay ?? 0) > 0) {
        hideShout();
        applyCharacterEmote("preanim", assets.preanimUrl, false, chatmsg.side);
      }
      charLayer(chatmsg.side, true).container.style.opacity = chatmsg.paired_name ? "1" : "0";
      break;
    }
    case "chatbox":
      showChatbox(chatmsg);
      break;
    case "talk": {
      if (chatmsg.evidence_id > 0) showEvidence(chatmsg);
      els.innerChat.className = `text_${chatmsg.text_color}`;
      hideShout();
      const desk = DESK_DURING_TALK[chatmsg.desk_modifier];
      if (desk !== undefined) set_side({ position: chatmsg.side, showSpeedLines: false, showDesk: desk });
      if (chatmsg.paired_name) {
        setEmoteFromUrl(assets.pairIdleUrl, true, chatmsg.side);
        charLayer(chatmsg.side, true).container.style.opacity = "1";
      }
      applyCharacterEmote("talking", assets.talkingUrl, false, chatmsg.side);
      charLayer(chatmsg.side).container.style.opacity = "1";
      showChatbox(chatmsg);
      break;
    }
    case "char": {
      const span = chatmsg.parsed?.[e.index];
      if (span) els.innerChat.appendChild(span);
      client.viewport.setTextNow(chatmsg.content.substring(0, e.index + 1));
      const box = els.chat;
      box.scrollTop = box.scrollHeight;
      break;
    }
    case "shake":
      shake();
      break;
    case "flash":
      flash();
      break;
    case "idle":
      hideShout();
      applyCharacterEmote("idle", assets.idleUrl, false, chatmsg.side);
      charLayer(chatmsg.side).container.style.opacity = "1";
      els.chatWaiting.style.opacity = "1";
      client.viewport.setAnimating(false);
      break;
  }
}

/** Stops the message that is playing, if any. */
export function stopPlayback() {
  playing++;
  clearTimeout(timer);
  cancelScheduled();
  releaseQueue();
}

/**
 * Plays a prepared message: every sound is scheduled up front on the audio
 * clock, and the visuals follow the same timeline, shifted by the output
 * latency so what is seen matches what is heard. `render` sets the scene up.
 * Resolves once the message is on screen, so the next one can't skip it.
 */
export async function playTimeline(chatmsg: ChatMsg, events: TimelineEvent[], sounds: MessageSounds, render: () => void) {
  stopPlayback();
  const id = playing;
  const audio = await audioReady();
  if (id !== playing) return;

  let latencyMs = 0;
  if (audio) {
    const start = audioNow() + LEAD_S;
    scheduleSounds(events, chatmsg, sounds, start);
    latencyMs = (LEAD_S + outputLatency()) * 1000;
  }
  const visualStart = performance.now() + latencyMs;

  let next = 0;
  let rendered = false;
  let shown!: () => void;
  const onScreen = new Promise<void>((resolve) => (shown = resolve));
  releaseQueue = shown;
  const step = () => {
    if (id !== playing) return shown();
    const now = performance.now() - visualStart;
    if (!rendered) {
      rendered = true;
      render();
    }
    // Late timers catch up in order rather than skip.
    while (next < events.length && events[next].at <= now) apply(events[next++], chatmsg);
    if (next < events.length) timer = setTimeout(step, Math.max(0, events[next].at - now));
    shown();
  };
  timer = setTimeout(step, Math.max(0, latencyMs));
  return onScreen;
}
