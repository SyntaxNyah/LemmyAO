import { unlockAudio } from "../viewport/audio";

/**
 * Startup work the viewport still needs. Settings are applied by the viewport
 * itself (src/viewport/settings.ts), so nothing here reads form fields.
 */
export function loadResources() {
  (document.getElementById("mod_ui") as HTMLLinkElement).href = "styles/nomod.css";

  // Open the message audio stream on the first gesture (autoplay policy), so
  // it is awake before the first message.
  const unlock = () => {
    unlockAudio();
    document.removeEventListener("pointerdown", unlock);
    document.removeEventListener("keydown", unlock);
  };
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });
}
