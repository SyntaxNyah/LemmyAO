import { setBlipVolume } from "../viewport/utils/blipAudio";
import { setSetting } from "../core/settings";
/**
 * Triggered by the blip volume slider.
 */
export function changeBlipVolume() {
  const blipVolume = (<HTMLInputElement>(
    document.getElementById("client_bvolume")
  )).value;
  setBlipVolume(Number(blipVolume));
  setSetting("blipVolume", Number(blipVolume));
}
