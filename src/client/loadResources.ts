import { unlockBlipAudio } from "../viewport/utils/blipAudio";

/**
 * Startup work the stage still needs. Settings are applied by the stage
 * itself (src/stage/settings.ts), so nothing here reads form fields.
 */
export function loadResources() {
  (document.getElementById("mod_ui") as HTMLLinkElement).href = "styles/nomod.css";

  // Resume the blip AudioContext on the first user gesture so blips fire
  // reliably from the first message (browser autoplay policy).
  const unlock = () => {
    unlockBlipAudio();
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
}
