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
  const checkbox = <HTMLInputElement>document.getElementById("client_pantilt");
  const enabled = !!checkbox?.checked;
  setSetting("panTilt", enabled);
  applyPanTilt(enabled);
}

/** Pans between positions instead of cutting. */
export function applyPanTilt(enabled: boolean) {
  const fullview = document.getElementById("client_fullview");
  if (fullview) fullview.style.transition = enabled ? "0.5s ease-in-out" : "none";
}
