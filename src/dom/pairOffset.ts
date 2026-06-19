/**
 * Pairing offset controls (horizontal + vertical).
 *
 * Each axis pairs a slider (quick coarse dragging) with a number box (exact
 * value); the two stay in sync and the mouse wheel nudges either one. The
 * number box keeps the canonical id (`pair_offset` / `pair_y_offset`) that
 * `onICEnter` reads, so the slider sitting alongside it doesn't affect the
 * send path. The Reset button routes through `resetPairOffsets` so both
 * controls zero together.
 */

const MIN = -100;
const MAX = 100;
const STEP = 1;

// [number box id, slider id] per axis.
const AXES: ReadonlyArray<readonly [string, string]> = [
  ["pair_offset", "pair_offset_slider"],
  ["pair_y_offset", "pair_y_offset_slider"],
];

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

const byId = (id: string) =>
  document.getElementById(id) as HTMLInputElement | null;

/** Write a clamped value into both controls of an axis. */
function setAxis(box: HTMLInputElement, slider: HTMLInputElement | null, value: number) {
  const v = String(clamp(value));
  box.value = v;
  if (slider) slider.value = v;
}

/**
 * Wire slider<->box syncing and mouse-wheel adjustment for both pairing
 * offset axes. Call once on load.
 */
export function initPairOffsets() {
  for (const [boxId, sliderId] of AXES) {
    const box = byId(boxId);
    if (!box) continue;
    if (box.dataset.offsetBound) continue; // guard against double-binding
    box.dataset.offsetBound = "true";
    const slider = byId(sliderId);

    // Slider drag updates the (canonical) box live.
    slider?.addEventListener("input", () => setAxis(box, slider, Number(slider.value) || 0));

    // A typed value snaps into range and updates the slider when committed.
    box.addEventListener("change", () => setAxis(box, slider, Number(box.value) || 0));

    // Wheel over either control nudges the value (scroll up = increase).
    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // adjust the value instead of scrolling the panel
      setAxis(box, slider, (Number(box.value) || 0) + (e.deltaY < 0 ? STEP : -STEP));
    };
    box.addEventListener("wheel", onWheel);
    slider?.addEventListener("wheel", onWheel);
  }
}

/** Zero both axes (slider + box). Used by the Reset button. */
export function resetPairOffsets() {
  for (const [boxId, sliderId] of AXES) {
    const box = byId(boxId);
    if (box) setAxis(box, byId(sliderId), 0);
  }
}
