import { computed, reactive, ref } from "vue";
import { settings, setSetting } from "../../core/settings";
import { loadLayout, type GroupRef, type PanelLayout, type Side } from "./panelLayout";
import type { TabId } from "./tabs";

/** Edit mode shows knobs in the seams between panels; it isn't remembered. */
export const editingLayout = ref(false);

/** Portrait's viewport height while its knob is dragged; saved when it's let go. */
const dragging = ref<number | null>(null);

/** Portrait's viewport height as a fraction of the window, 0 for the default. */
export const portraitViewport = () => dragging.value ?? settings.layoutViewportPortrait;

export const setDragging = (value: number) => (dragging.value = Math.min(0.7, Math.max(0.2, value)));

export function commit() {
  if (dragging.value === null) return;
  setSetting("layoutViewportPortrait", dragging.value);
  dragging.value = null;
}

export const layoutChanged = () => settings.layoutViewportPortrait !== 0 || settings.panelLayout !== "" || settings.tabOrder.length > 0;

export function resetLayout() {
  setSetting("layoutViewportPortrait", 0);
  setSetting("panelLayout", "");
  setSetting("tabOrder", []);
}

/** The landscape panel arrangement; a draft overrides the saved one while something is dragged. */
const draftPanels = ref<PanelLayout | null>(null);
const savedPanels = computed(() => loadLayout(settings.panelLayout, settings.tabOrder));
export const panels = computed(() => draftPanels.value ?? savedPanels.value);

export const previewPanels = (layout: PanelLayout) => (draftPanels.value = layout);

export function savePanels(layout: PanelLayout = panels.value) {
  draftPanels.value = null;
  setSetting("panelLayout", JSON.stringify(layout));
}

/** A tab being dragged in edit mode, and where it would land. */
export const tabDrag = reactive({
  tab: null as TabId | null,
  x: 0,
  y: 0,
  /** Where it lands: into a group at an index, or splitting a group. */
  target: null as
    | { kind: "into"; group: GroupRef; index: number; rect: DOMRect; label: string; marker?: DOMRect }
    | { kind: "split"; at: number[]; side: Side; rect: DOMRect; label: string; marker?: undefined }
    | null,
});
