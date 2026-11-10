import { client } from "../client";
import { settings, resetSettings as resetStoredSettings, type SettingKey } from "../core/settings";
import { changeMusicVolume } from "./changeMusicVolume";
import { setChatbox } from "./setChatbox";
import { changeSFXVolume } from "./changeVolume";
import { changeBlipVolume } from "./changeBlipVolume";
import { reloadTheme } from "./reloadTheme";
import { setFont } from "./setFont";
import { switchPanTilt } from "./switchPanTilt";
import { switchAspectRatio } from "./switchAspectRatio";
import { switchChatOffset } from "./switchChatOffset";
import { switchHideDesks } from "./switchHideDesks";
import { restorePreanimGlow } from "./switchPreanimGlow";
import { resetThemeMaker } from "./themeMaker";
import { showname_click } from "./showNameClick";
import { applyMusicMute, applySfxMute, applyBlipMute } from "./audioMute";

// Voice, OOC name and blip pitch survive a reset, as they always have.
const RESET_KEYS: SettingKey[] = [
  "chatbox",
  "musicVolume",
  "sfxVolume",
  "blipVolume",
  "callwords",
  "showname",
  "shownamesEnabled",
  "font",
  "customFont",
  "hideDesks",
  "panTilt",
  "preanimGlow",
  "preanimGlowColor",
  "preanimGlowIntensity",
  "chatOffset",
  "musicMuted",
  "sfxMuted",
  "blipMuted",
];
const LEGACY_THEME_KEYS = ["theme", "customCSS", "themeMakerConfig"];

/**
 * Resets client settings to their defaults.
 */
export function resetSettings() {
  if (!confirm("Reset all settings to defaults? This cannot be undone.")) return;

  resetStoredSettings(RESET_KEYS);
  LEGACY_THEME_KEYS.forEach((key) => localStorage.removeItem(key));

  // --- Theme Maker ---
  resetThemeMaker();

  // --- Theme ---
  const themeSelect = <HTMLSelectElement>document.getElementById("client_themeselect");
  if (themeSelect) {
    themeSelect.value = "default";
    reloadTheme();
    // Remove any injected custom style
    const customStyle = document.getElementById("client_custom_style");
    if (customStyle) customStyle.remove();
    // Hide custom CSS row
    const customCSSRow = document.getElementById("client_customcss_row");
    if (customCSSRow) customCSSRow.style.display = "none";
  }

  // --- Chatbox ---
  const chatboxSelect = <HTMLSelectElement>document.getElementById("client_chatboxselect");
  if (chatboxSelect) {
    chatboxSelect.value = settings.chatbox;
    setChatbox(settings.chatbox);
  }

  // --- Font ---
  const fontSelect = <HTMLSelectElement>document.getElementById("client_fontselect");
  if (fontSelect) {
    fontSelect.value = settings.font;
    const customFontInput = <HTMLInputElement>document.getElementById("client_customfont");
    if (customFontInput) customFontInput.value = settings.customFont;
    setFont();
  }

  // --- Music volume ---
  const mvolume = <HTMLInputElement>document.getElementById("client_mvolume");
  if (mvolume) {
    mvolume.value = String(settings.musicVolume);
    changeMusicVolume();
  }

  // --- SFX volume (combined SFX/Shout/Testimony) ---
  const svolume = <HTMLInputElement>document.getElementById("client_svolume");
  if (svolume) {
    svolume.value = String(settings.sfxVolume);
    changeSFXVolume();
  }

  // --- Blip volume ---
  const bvolume = <HTMLInputElement>document.getElementById("client_bvolume");
  if (bvolume) {
    bvolume.value = String(settings.blipVolume);
    changeBlipVolume();
  }

  // --- Mute toggles ---
  const muteMusic = <HTMLInputElement>document.getElementById("client_mute_music");
  if (muteMusic) {
    muteMusic.checked = settings.musicMuted;
    applyMusicMute(settings.musicMuted);
  }
  const muteSfx = <HTMLInputElement>document.getElementById("client_mute_sfx");
  if (muteSfx) {
    muteSfx.checked = settings.sfxMuted;
    applySfxMute(settings.sfxMuted);
  }
  const muteBlips = <HTMLInputElement>document.getElementById("client_mute_blips");
  if (muteBlips) {
    muteBlips.checked = settings.blipMuted;
    applyBlipMute(settings.blipMuted);
  }

  // --- Callwords ---
  const callwords = <HTMLTextAreaElement>document.getElementById("client_callwords");
  if (callwords) callwords.value = settings.callwords.join("\n");
  client.callwords = [...settings.callwords];

  // --- Custom showname ---
  const icChatName = <HTMLInputElement>document.getElementById("ic_chat_name");
  if (icChatName) icChatName.value = settings.showname;
  const shownameCheckbox = <HTMLInputElement>document.getElementById("showname");
  if (shownameCheckbox) {
    shownameCheckbox.checked = settings.shownamesEnabled;
    showname_click(null);
  }

  // --- Pan-tilt ---
  const pantilt = <HTMLInputElement>document.getElementById("client_pantilt");
  if (pantilt && pantilt.checked) {
    pantilt.checked = false;
    switchPanTilt();
  }

  // --- 16:9 viewport ---
  const hdviewport = <HTMLInputElement>document.getElementById("client_hdviewport");
  const hdOffset = <HTMLInputElement>document.getElementById("client_hdviewport_offset");
  if (hdviewport && hdviewport.checked) {
    hdviewport.checked = false;
    switchAspectRatio();
  }
  if (hdOffset) {
    hdOffset.value = String(settings.chatOffset);
    switchChatOffset();
  }

  // --- Hide desks ---
  const hidedesks = <HTMLInputElement>document.getElementById("client_hidedesks");
  if (hidedesks) {
    hidedesks.checked = settings.hideDesks;
    switchHideDesks();
  }

  // --- Preanim glow ---
  restorePreanimGlow();
}
