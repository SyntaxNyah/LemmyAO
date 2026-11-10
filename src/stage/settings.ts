import { effect } from "@vue/reactivity";
import { client } from "../client";
import { settings } from "../core/settings";
import { on } from "../core/events";
import { setBlipMuted, setBlipPitch, setBlipVolume } from "../viewport/utils/blipAudio";
import { setChatbox } from "../dom/setChatbox";
import { applyPanTilt } from "../dom/switchPanTilt";
import { applyHideDesks } from "../dom/switchHideDesks";
import { applyWidescreen } from "../dom/switchAspectRatio";
import { applyPreanimGlow } from "../dom/switchPreanimGlow";

const SFX_IDS = ["client_sfxaudio", "client_shoutaudio", "client_testimonyaudio"];

function applyAudio() {
  const music = document.getElementsByClassName("audioChannel") as HTMLCollectionOf<HTMLAudioElement>;
  for (const channel of music) {
    channel.volume = settings.musicVolume;
    channel.muted = settings.musicMuted;
  }
  for (const id of SFX_IDS) {
    const el = document.getElementById(id) as HTMLAudioElement | null;
    if (el) {
      el.volume = settings.sfxVolume;
      el.muted = settings.sfxMuted;
    }
  }
  setBlipVolume(settings.blipVolume);
  setBlipMuted(settings.blipMuted);
  setBlipPitch(settings.blipPitch);
}

function applyLook() {
  // "dynamic" follows each speaker, so only re-skin now when it's fixed.
  if (settings.chatbox !== "dynamic") setChatbox("");
  const font = settings.font === "custom" ? settings.customFont.trim() || "sans-serif" : settings.font;
  const chat = document.getElementById("client_chatcontainer");
  if (chat) chat.style.fontFamily = font;

  applyPanTilt(settings.panTilt);
  applyHideDesks(settings.hideDesks);
  applyWidescreen(settings.widescreen);
  const offset = settings.widescreen ? settings.chatOffset : 0;
  if (chat) {
    chat.style.width = `${100 - offset}%`;
    chat.style.left = `${offset / 2}%`;
  }
  applyPreanimGlow();
}

/** Keeps the stage in step with the settings; call once the stage markup exists. */
export function followSettings() {
  effect(applyAudio);
  effect(applyLook);
  // Music channels and the viewport only exist once the client is set up.
  on("opened", () => client && applyAudio());
  on("joined", applyAudio);
}
