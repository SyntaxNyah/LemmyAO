<script setup lang="ts">
import { ref } from "vue";
import { commit, setDragging, type Seam } from "./layout";

// "sidebar" moves sideways (the landscape column's width); the viewport seams move up and down.
const props = defineProps<{ seam: Seam }>();
const knob = ref<HTMLElement>();
const sideways = () => props.seam === "sidebar";
const shellRect = () => knob.value!.closest(".shell")!.getBoundingClientRect();

// Where the seam is now, as the fraction the setting stores.
function current() {
  const shell = shellRect();
  const here = knob.value!.getBoundingClientRect();
  return sideways()
    ? (shell.right - (here.left + here.width / 2)) / shell.width
    : (here.top + here.height / 2 - shell.top) / shell.height;
}

function moveTo(e: PointerEvent) {
  const shell = shellRect();
  setDragging(props.seam, sideways() ? (shell.right - e.clientX) / shell.width : (e.clientY - shell.top) / shell.height);
}

function down(e: PointerEvent) {
  knob.value!.setPointerCapture(e.pointerId);
  moveTo(e);
}

function move(e: PointerEvent) {
  if (knob.value!.hasPointerCapture(e.pointerId)) moveTo(e);
}

function key(e: KeyboardEvent) {
  const grow = sideways() ? { ArrowLeft: 1, ArrowRight: -1 } : { ArrowDown: 1, ArrowUp: -1 };
  const by = grow[e.key as keyof typeof grow];
  if (!by) return;
  e.preventDefault();
  setDragging(props.seam, current() + by * (e.shiftKey ? 0.1 : 0.02));
  commit(props.seam);
}
</script>

<template>
  <div
    ref="knob"
    class="knob"
    :class="sideways() ? 'sideways' : 'updown'"
    role="separator"
    tabindex="0"
    :aria-orientation="sideways() ? 'vertical' : 'horizontal'"
    :aria-label="sideways() ? 'Resize the side panel' : 'Resize the viewport'"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="commit(seam)"
    @pointercancel="commit(seam)"
    @keydown="key"
  >
    <span class="grip" aria-hidden="true"></span>
  </div>
</template>

<style scoped>
.knob {
  z-index: 20;
  display: grid;
  place-items: center;
  touch-action: none;
}

.knob:focus-visible {
  outline: none;
}

.knob:focus-visible .grip {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}

.sideways {
  width: 28px;
  height: 64px;
  cursor: col-resize;
}

.updown {
  width: 64px;
  height: 28px;
  cursor: row-resize;
}

.grip {
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
</style>
