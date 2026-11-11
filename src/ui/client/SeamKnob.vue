<script setup lang="ts">
import { ref } from "vue";
import { commit, setDragging } from "./layout";

// The bottom edge of portrait's viewport.
const knob = ref<HTMLElement>();
const shellRect = () => knob.value!.closest(".shell")!.getBoundingClientRect();

function moveTo(e: PointerEvent) {
  const shell = shellRect();
  setDragging((e.clientY - shell.top) / shell.height);
}

function down(e: PointerEvent) {
  knob.value!.setPointerCapture(e.pointerId);
  moveTo(e);
}

function move(e: PointerEvent) {
  if (knob.value!.hasPointerCapture(e.pointerId)) moveTo(e);
}

function key(e: KeyboardEvent) {
  const by = { ArrowDown: 1, ArrowUp: -1 }[e.key];
  if (!by) return;
  e.preventDefault();
  const shell = shellRect();
  const here = knob.value!.getBoundingClientRect();
  setDragging((here.top + here.height / 2 - shell.top) / shell.height + by * (e.shiftKey ? 0.1 : 0.02));
  commit();
}
</script>

<template>
  <div
    ref="knob"
    class="knob"
    role="separator"
    tabindex="0"
    aria-orientation="horizontal"
    aria-label="Resize the viewport"
    @pointerdown="down"
    @pointermove="move"
    @pointerup="commit()"
    @pointercancel="commit()"
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
  width: 64px;
  height: 28px;
  touch-action: none;
  cursor: row-resize;
}

.knob:focus-visible {
  outline: none;
}

.knob:focus-visible .grip {
  outline: 2px solid var(--text);
  outline-offset: 2px;
}

.grip {
  width: 48px;
  height: 10px;
  border: 2px solid var(--surface);
  border-radius: 999px;
  background: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), var(--shadow);
}
</style>
