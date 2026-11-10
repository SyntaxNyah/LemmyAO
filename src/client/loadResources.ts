import vanilla_evidence_arr from "../constants/evidence";
import vanilla_background_arr from "../constants/backgrounds";
import { changeMusicVolume } from "../dom/changeMusicVolume";
import { setChatbox } from "../dom/setChatbox";
import { changeSFXVolume } from "../dom/changeVolume";
import { showname_click } from "../dom/showNameClick";
import { changeBlipVolume } from "../dom/changeBlipVolume";
import { unlockBlipAudio } from "../viewport/utils/blipAudio";
import { reloadTheme } from "../dom/reloadTheme";
import { setFont } from "../dom/setFont";
import { restoreThemeMaker, restoreBlipPitch } from "../dom/themeMaker";
import { isHideDesksEnabled } from "../dom/switchHideDesks";
import { isPanTiltEnabled, switchPanTilt } from "../dom/switchPanTilt";
import { initChatOffset } from "../dom/switchChatOffset";
import { initPairOffsets } from "../dom/pairOffset";
import { initPairOrder } from "../dom/pairOrder";
import { restorePreanimGlow } from "../dom/switchPreanimGlow";
import {
  isMusicMuted,
  isSfxMuted,
  isBlipMuted,
  applyMusicMute,
  applySfxMute,
  applyBlipMute,
} from "../dom/audioMute";
import { version } from "../version";
import { settings } from "../core/settings";
import { client } from "../client";

/**
 * Load game resources and stored settings.
 */
export function loadResources() {
  document.getElementById("client_version")!.innerText = `version ${version}`;
  (document.getElementById("mod_ui") as HTMLLinkElement).href = "styles/nomod.css";
  // Load background array to select
  const background_select = <HTMLSelectElement>(
    document.getElementById("bg_select")
  );
  background_select.add(new Option("Custom", "0"));
  vanilla_background_arr.forEach((background) => {
    background_select.add(new Option(background));
  });

  // Load evidence array to select
  const evidence_select = <HTMLSelectElement>(
    document.getElementById("evi_select")
  );
  evidence_select.add(new Option("Custom", "0"));
  vanilla_evidence_arr.forEach((evidence) => {
    evidence_select.add(new Option(evidence));
  });

  const storedTheme = localStorage.getItem("theme") || "default";

  // Restore theme maker before theme link so custom style takes precedence
  restoreThemeMaker();

  const themeOption = <HTMLOptionElement>(
    document.querySelector(`#client_themeselect [value="${storedTheme}"]`)
  );
  if (themeOption) themeOption.selected = true;
  reloadTheme();

  const storedChatbox = settings.chatbox;

  (<HTMLOptionElement>(
    document.querySelector(`#client_chatboxselect [value="${storedChatbox}"]`)
  )).selected = true;
  setChatbox(storedChatbox);

  (<HTMLInputElement>document.getElementById("client_mvolume")).value =
    String(settings.musicVolume);
  changeMusicVolume();
  (<HTMLInputElement>document.getElementById("client_svolume")).value =
    String(settings.sfxVolume);
  changeSFXVolume();
  (<HTMLInputElement>document.getElementById("client_bvolume")).value =
    String(settings.blipVolume);
  changeBlipVolume();
  restoreBlipPitch();

  // Restore mute states
  const musicMuted = isMusicMuted();
  (<HTMLInputElement>document.getElementById("client_mute_music")).checked = musicMuted;
  applyMusicMute(musicMuted);

  const sfxMuted = isSfxMuted();
  (<HTMLInputElement>document.getElementById("client_mute_sfx")).checked = sfxMuted;
  applySfxMute(sfxMuted);

  const blipMuted = isBlipMuted();
  (<HTMLInputElement>document.getElementById("client_mute_blips")).checked = blipMuted;
  applyBlipMute(blipMuted);

  // Resume the blip AudioContext on the first user gesture so blips fire
  // reliably from the first message (browser autoplay policy).
  const unlock = () => {
    unlockBlipAudio();
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });

  (<HTMLInputElement>document.getElementById("ic_chat_name")).value =
    settings.showname;
  (<HTMLInputElement>document.getElementById("showname")).checked =
    settings.shownamesEnabled;
  showname_click(null);

  (<HTMLInputElement>document.getElementById("client_callwords")).value =
    settings.callwords.join("\n");
  client.callwords = [...settings.callwords];

  // Restore pan-tilt setting (defaults to off)
  const panTiltCheckbox = <HTMLInputElement>document.getElementById("client_pantilt");
  if (panTiltCheckbox) {
    panTiltCheckbox.checked = isPanTiltEnabled();
    switchPanTilt();
  }

  // Restore hide-desks setting (defaults to off)
  const hideDesksCheckbox = <HTMLInputElement>document.getElementById("client_hidedesks");
  if (hideDesksCheckbox) {
    hideDesksCheckbox.checked = isHideDesksEnabled();
  }

  // Restore preanim glow settings (defaults: on, gold, 50%)
  restorePreanimGlow();

  // Restore chatbox offset (defaults to 0%) and enable mouse-wheel adjustment
  initChatOffset();

  // Enable type/scroll adjustment for the pairing offset fields
  initPairOffsets();

  // Pair-order controls (group roster reorder) — render + subscribe to GP changes.
  initPairOrder();

  // Restore font setting
  const storedFont = settings.font;
  const fontSelect = <HTMLSelectElement>document.getElementById("client_fontselect");
  if (fontSelect) {
    const fontOption = <HTMLOptionElement>(
      fontSelect.querySelector(`[value="${storedFont}"]`)
    );
    if (fontOption) fontOption.selected = true;
    const customFontInput = <HTMLInputElement>document.getElementById("client_customfont");
    if (customFontInput) {
      customFontInput.value = settings.customFont;
    }
    setFont();
  }
}
