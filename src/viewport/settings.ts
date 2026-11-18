import { effect } from "@vue/reactivity";
import { client } from "../client";
import { settings } from "../core/settings";
import { on } from "../core/events";
import { setBlipMuted, setBlipPitch, setBlipVolume, setSfxMuted, setSfxVolume } from "./audio";
import { setChatbox } from "../dom/setChatbox";
import { applyPanTilt } from "../dom/switchPanTilt";
import { applyHideDesks } from "../dom/switchHideDesks";
import { applyWidescreen } from "../dom/switchAspectRatio";
import { applyPreanimGlow } from "../dom/switchPreanimGlow";

const SFX_IDS = ["client_sfxaudio"];

function applyAudio() {
  // Read every value before touching the DOM: this effect starts before the
  // music channels exist, and a value read only inside the channel loop is
  // never tracked, so moving that slider would not re-run the effect.
  const { musicVolume, musicMuted, sfxVolume, sfxMuted, blipVolume, blipMuted, blipPitch } = settings;

  const music = document.getElementsByClassName("audioChannel") as HTMLCollectionOf<HTMLAudioElement>;
  for (const channel of music) {
    channel.volume = musicVolume;
    channel.muted = musicMuted;
  }
  for (const id of SFX_IDS) {
    const el = document.getElementById(id) as HTMLAudioElement | null;
    if (el) {
      el.volume = sfxVolume;
      el.muted = sfxMuted;
    }
  }
  setSfxVolume(sfxVolume);
  setSfxMuted(sfxMuted);
  setBlipVolume(blipVolume);
  setBlipMuted(blipMuted);
  setBlipPitch(blipPitch);
}

function applyLook() {
  // The chatbox follows each speaker, so only skin it here before anyone has spoken.
  const skin = document.getElementById("chatbox_theme") as HTMLLinkElement | null;
  if (skin?.href.startsWith("data:")) setChatbox("");
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

/** Keeps the viewport in step with the settings; call once its markup exists. */
export function followSettings() {
  effect(applyAudio);
  effect(applyLook);
  // Music channels and the viewport only exist once the client is set up.
  on("opened", () => client && applyAudio());
  on("joined", applyAudio);
}
