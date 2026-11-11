import { reactive, ref } from "vue";
import { settings, setSetting } from "../../core/settings";

/** Edit mode shows knobs in the seams between panels; it isn't remembered. */
export const editingLayout = ref(false);

export type Seam = "sidebar" | "viewportLandscape" | "viewportPortrait";

const KEYS = {
  sidebar: "layoutSidebar",
  viewportLandscape: "layoutViewportLandscape",
  viewportPortrait: "layoutViewportPortrait",
} as const;

// Fractions of the window. The side column has no upper cap: the layout keeps
// 360px for the viewport and IC options regardless (App.vue).
const LIMITS: Record<Seam, [number, number]> = {
  sidebar: [0.2, 1],
  viewportLandscape: [0.3, 0.9],
  viewportPortrait: [0.2, 0.7],
};

/** A knob's value while it's dragged; saved when it's let go. */
const dragging = reactive<Partial<Record<Seam, number>>>({});

/** The ratio for a seam, 0 when it keeps the default layout. */
export const ratio = (seam: Seam) => dragging[seam] ?? settings[KEYS[seam]];

export const setDragging = (seam: Seam, value: number) => {
  const [min, max] = LIMITS[seam];
  dragging[seam] = Math.min(max, Math.max(min, value));
};

export function commit(seam: Seam) {
  const value = dragging[seam];
  if (value === undefined) return;
  delete dragging[seam];
  setSetting(KEYS[seam], value);
}

export const layoutChanged = () => Object.values(KEYS).some((key) => settings[key] !== 0);

export function resetLayout() {
  for (const key of Object.values(KEYS)) setSetting(key, 0);
}
