/**
 * Preanim glow indicator settings.
 *
 * Emotes that ship a preanimation are flagged with a glow on their button
 * (see changeChar.ts + the `[data-preanim]` rule in client.css). These
 * settings let the player turn the glow off and tune its colour and
 * intensity.
 */

import { settings, setSetting } from "../core/settings";

export function isPreanimGlowEnabled(): boolean {
  return settings.preanimGlow;
}

export function getPreanimGlowColor(): string {
  return settings.preanimGlowColor;
}

export function getPreanimGlowIntensity(): number {
  return settings.preanimGlowIntensity;
}

/** Applies the current settings to the DOM (CSS vars + body class). */
export function applyPreanimGlow() {
  const enabled = isPreanimGlowEnabled();
  document.body.classList.toggle("no-preanim-glow", !enabled);

  const intensity = getPreanimGlowIntensity();
  // 0..100 maps to a 0..12px blur and 0..4px spread; 50 = the shipped 6px/2px.
  const blur = Math.round(intensity * 0.12);
  const spread = Math.round(intensity * 0.04);
  const root = document.documentElement;
  root.style.setProperty("--preanim-glow-blur", `${blur}px`);
  root.style.setProperty("--preanim-glow-spread", `${spread}px`);
  root.style.setProperty("--preanim-glow-color", getPreanimGlowColor());
}

/** Checkbox toggle. */
export function switchPreanimGlow() {
  const checkbox = <HTMLInputElement>(
    document.getElementById("client_preanimglow")
  );
  setSetting("preanimGlow", !!checkbox?.checked);
  applyPreanimGlow();
}

/** Colour picker. */
export function changePreanimGlowColor() {
  const input = <HTMLInputElement>(
    document.getElementById("client_preanimglow_color")
  );
  if (input?.value) setSetting("preanimGlowColor", input.value);
  applyPreanimGlow();
}

/** Intensity slider. */
export function changePreanimGlowIntensity() {
  const input = <HTMLInputElement>(
    document.getElementById("client_preanimglow_intensity")
  );
  if (input) setSetting("preanimGlowIntensity", Number(input.value));
  applyPreanimGlow();
}

/** Restore the settings UI and apply. Called once on load and on reset. */
export function restorePreanimGlow() {
  const checkbox = <HTMLInputElement>(
    document.getElementById("client_preanimglow")
  );
  if (checkbox) checkbox.checked = isPreanimGlowEnabled();

  const colorInput = <HTMLInputElement>(
    document.getElementById("client_preanimglow_color")
  );
  if (colorInput) colorInput.value = getPreanimGlowColor();

  const intensityInput = <HTMLInputElement>(
    document.getElementById("client_preanimglow_intensity")
  );
  if (intensityInput) {
    intensityInput.value = String(getPreanimGlowIntensity());
  }

  applyPreanimGlow();
}
