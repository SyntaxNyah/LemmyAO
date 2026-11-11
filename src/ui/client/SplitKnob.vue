<script setup lang="ts">
import { ref } from "vue";
import { panels, previewPanels, savePanels } from "./layout";
import { nodeAt, resizeSplit } from "./panelLayout";

// Between children `index` and `index + 1` of the split at `path`.
const props = defineProps<{ path: number[]; index: number; dir: "row" | "column" }>();
const knob = ref<HTMLElement>();
const sideways = () => props.dir === "row";
const MIN_SHARE = 0.15;

// The two neighbours this knob sits between, from the DOM.
function neighbours() {
  const container = knob.value!.parentElement!;
  const items = [...container.querySelectorAll<HTMLElement>(":scope > [data-split-item]")];
  return [items[props.index].getBoundingClientRect(), items[props.index + 1].getBoundingClientRect()];
}

function resize(share: number) {
  const node = nodeAt(panels.value, props.path);
  if (node?.kind !== "split") return;
  const sizes = node.children.map((c) => c.size);
  const total = sizes[props.index] + sizes[props.index + 1];
  const clamped = Math.min(1 - MIN_SHARE, Math.max(MIN_SHARE, share));
  sizes[props.index] = total * clamped;
  sizes[props.index + 1] = total * (1 - clamped);
  previewPanels(resizeSplit(panels.value, props.path, sizes));
}

function moveTo(e: PointerEvent) {
  const [a, b] = neighbours();
  resize(sideways() ? (e.clientX - a.left) / (a.width + b.width) : (e.clientY - a.top) / (a.height + b.height));
}

function down(e: PointerEvent) {
  knob.value!.setPointerCapture(e.pointerId);
  moveTo(e);
}

function move(e: PointerEvent) {
  if (knob.value!.hasPointerCapture(e.pointerId)) moveTo(e);
}

function key(e: KeyboardEvent) {
  const grow = sideways() ? { ArrowRight: 1, ArrowLeft: -1 } : { ArrowDown: 1, ArrowUp: -1 };
  const by = grow[e.key as keyof typeof grow];
  if (!by) return;
  e.preventDefault();
  const [a, b] = neighbours();
  const now = sideways() ? a.width / (a.width + b.width) : a.height / (a.height + b.height);
  resize(now + by * (e.shiftKey ? 0.1 : 0.02));
  savePanels();
}
</script>

<template>
  <div
    ref="knob"
    class="split-knob"
    :class="sideways() ? 'sideways' : 'updown'"
    role="separator"
    tabindex="0"
    :aria-orientation="sideways() ? 'vertical' : 'horizontal'"
    :aria-label="sideways() ? 'Resize the panels beside each other' : 'Resize the panels above and below'"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="savePanels()"
    @pointercancel="savePanels()"
    @keydown="key"
  >
    <span class="grip" aria-hidden="true"></span>
  </div>
</template>

<style scoped>
.split-knob {
  position: relative;
  z-index: 20;
  flex: none;
  display: grid;
  place-items: center;
  touch-action: none;
}

.sideways {
  width: 0;
  cursor: col-resize;
}

.updown {
  height: 0;
  cursor: row-resize;
}

.grip {
  position: absolute;
  border: 2px solid var(--surface);
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), var(--shadow);
}

.sideways .grip {
  width: 10px;
  height: 48px;
}

.updown .grip {
  width: 48px;
  height: 10px;
}

/* A larger, invisible hit area around the grip. */
.split-knob::before {
  content: "";
  position: absolute;
}

.sideways::before {
  inset: -32px -14px;
}

.updown::before {
  inset: -14px -32px;
}

.split-knob:focus-visible {
  outline: none;
}

.split-knob:focus-visible .grip {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}
</style>
