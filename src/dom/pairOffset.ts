/**
 * Pairing offset controls (horizontal + vertical).
 *
 * These set how far your character is shifted when paired, in % (-100..100),
 * and are read into the outgoing IC message by `onICEnter`. The fields are
 * number inputs so the user can type an exact value; this module adds the QoL
 * extras: mouse-wheel adjustment (scroll up = increase) and keeping typed
 * values inside range. `resetOffset` (the Reset button) still sets them to 0.
 */

const MIN = -100;
const MAX = 100;
const STEP = 1;
const FIELD_IDS = ["pair_offset", "pair_y_offset"];

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

/** Clamp the field's current value into range and write it back. */
function clampField(field: HTMLInputElement) {
  field.value = String(clamp(Number(field.value) || 0));
}

/**
 * Wire up clamp-on-commit and mouse-wheel adjustment for both pairing offset
 * fields. Call once on load. The fields keep their ids, so the send path
 * (`onICEnter`) and the Reset button (`resetOffset`) are unaffected.
 */
export function initPairOffsets() {
  for (const id of FIELD_IDS) {
    const field = document.getElementById(id) as HTMLInputElement | null;
    if (!field) continue;
    if (field.dataset.offsetBound) continue; // guard against double-binding
    field.dataset.offsetBound = "true";

    // Snap a typed value back into range when the user commits it.
    field.addEventListener("change", () => clampField(field));

    // Scroll the wheel over the field to nudge the value (up = increase).
    field.addEventListener("wheel", (e) => {
      e.preventDefault(); // adjust the value instead of scrolling the panel
      field.value = String((Number(field.value) || 0) + (e.deltaY < 0 ? STEP : -STEP));
      clampField(field);
    });
  }
}
