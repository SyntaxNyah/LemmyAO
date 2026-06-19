/**
 * Chatbox offset control.
 *
 * In 16:9 mode the chatbox spans the full width; this lets the user inset it
 * by a percentage so it sits centred over the action. The value is a per-side
 * inset in %, adjustable two ways for QoL:
 *   - type a number directly (committed on Enter / blur / spinner -> `change`)
 *   - scroll the mouse wheel over the field (scroll up = wider inset)
 */

const STORAGE_KEY = "chatOffset";
const MIN = 0;
const MAX = 40;
const STEP = 1;

const clamp = (n: number) => Math.min(MAX, Math.max(MIN, n));

const offsetField = () =>
  document.getElementById("client_hdviewport_offset") as HTMLInputElement | null;

/**
 * The saved per-side inset (%), clamped, defaulting to 0 (no offset).
 */
export function getChatOffset(): number {
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(saved) ? clamp(saved) : MIN;
}

/**
 * Apply a per-side inset to the chat container and persist it.
 *
 * `pct` is the margin on each side, so the box stays centred:
 *   width = 100 - 2*pct,  left = pct      (pct = 10 reproduces the old 80%/10%)
 *
 * To make this a signed left/right shift instead (like the pair_offset slider,
 * which runs -100..100), change only this function.
 */
export function applyChatOffset(pct: number) {
  const p = clamp(pct);
  const container = document.getElementById("client_chatcontainer")!;
  container.style.width = `${100 - 2 * p}%`;
  container.style.left = `${p}%`;
  localStorage.setItem(STORAGE_KEY, String(p));
}

/**
 * Read the field, clamp it, reflect the clamped value back, and apply.
 * Wired to the field's `change` event and called by the wheel handler — both
 * are commit points, so rewriting the field here won't fight live typing.
 */
export function switchChatOffset() {
  const field = offsetField();
  if (!field) return;
  const p = clamp(Number(field.value) || 0);
  field.value = String(p);
  applyChatOffset(p);
}

/**
 * Restore the saved offset into the field, apply it, and enable mouse-wheel
 * adjustment over the field. Call once on load.
 */
export function initChatOffset() {
  const field = offsetField();
  if (!field) return;

  const saved = getChatOffset();
  field.value = String(saved);
  applyChatOffset(saved);

  if (field.dataset.wheelBound) return; // guard against double-binding
  field.dataset.wheelBound = "true";
  field.addEventListener("wheel", (e) => {
    if (field.disabled) return;
    e.preventDefault(); // adjust the value instead of scrolling the panel
    const delta = e.deltaY < 0 ? STEP : -STEP;
    field.value = String((Number(field.value) || 0) + delta);
    switchChatOffset(); // clamps, writes back, applies, persists
  });
}
