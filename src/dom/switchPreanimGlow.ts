/**
 * Preanim glow indicator settings.
 *
 * Emotes that ship a preanimation are flagged with a glow on their button
 * (see changeChar.ts + the `[data-preanim]` rule in client.css). These
 * settings let the player turn the glow off and tune its colour and
 * intensity. Defaults apply when the keys are absent.
 */

const KEY_ENABLED = "preanimGlowEnabled";
const KEY_COLOR = "preanimGlowColor";
const KEY_INTENSITY = "preanimGlowIntensity";

export const DEFAULT_PREANIM_GLOW_COLOR = "#ffcf4d";
export const DEFAULT_PREANIM_GLOW_INTENSITY = 50;

const clampIntensity = (n: number) => Math.min(100, Math.max(0, n));

/** Glow is ON by default; only an explicit "false" disables it. */
export function isPreanimGlowEnabled(): boolean {
  return localStorage.getItem(KEY_ENABLED) !== "false";
}

export function getPreanimGlowColor(): string {
  return localStorage.getItem(KEY_COLOR) || DEFAULT_PREANIM_GLOW_COLOR;
}

export function getPreanimGlowIntensity(): number {
  const raw = localStorage.getItem(KEY_INTENSITY);
  if (raw === null) return DEFAULT_PREANIM_GLOW_INTENSITY;
  const n = Number(raw);
  return Number.isFinite(n) ? clampIntensity(n) : DEFAULT_PREANIM_GLOW_INTENSITY;
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
  localStorage.setItem(KEY_ENABLED, checkbox?.checked ? "true" : "false");
  applyPreanimGlow();
}

/** Colour picker. */
export function changePreanimGlowColor() {
  const input = <HTMLInputElement>(
    document.getElementById("client_preanimglow_color")
  );
  if (input?.value) localStorage.setItem(KEY_COLOR, input.value);
  applyPreanimGlow();
}

/** Intensity slider. */
export function changePreanimGlowIntensity() {
  const input = <HTMLInputElement>(
    document.getElementById("client_preanimglow_intensity")
  );
  if (input) localStorage.setItem(KEY_INTENSITY, input.value);
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
