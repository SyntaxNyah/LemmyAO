import { settings, setSetting } from "../core/settings";

/**
 * Returns whether the user has chosen to enable pan-tilt.
 * Defaults to `false` so pan-tilt is always off unless the user opts in.
 */
export function isPanTiltEnabled(): boolean {
  return settings.panTilt;
}

/**
 * Triggered by the pantilt checkbox.
 */
export async function switchPanTilt() {
  const fullview = document.getElementById("client_fullview")!;
  const checkbox = <HTMLInputElement>document.getElementById("client_pantilt");
  const enabled = !!checkbox?.checked;

  setSetting("panTilt", enabled);

  if (enabled) {
    fullview.style.transition = "0.5s ease-in-out";
  } else {
    fullview.style.transition = "none";
  }
}
