<script setup lang="ts">
import { computed, ref } from "vue";
import { holdOffsetPreview, pulseOffsetPreview } from "./offsetPreview";

// Offsets run -100..100; negative y is up, matching the server's y_offset.
const x = defineModel<number>("x", { required: true });
const y = defineModel<number>("y", { required: true });
const props = defineProps<{ lockX?: boolean; lockY?: boolean }>();

const pad = ref<HTMLElement>();
const clamp = (v: number) => Math.min(100, Math.max(-100, Math.round(v)));

function moveTo(e: PointerEvent) {
  const box = pad.value!.getBoundingClientRect();
  if (!props.lockX) x.value = clamp(((e.clientX - box.left) / box.width) * 200 - 100);
  if (!props.lockY) y.value = clamp(((e.clientY - box.top) / box.height) * 200 - 100);
}

function down(e: PointerEvent) {
  if (e.button !== 0) return;
  pad.value!.setPointerCapture(e.pointerId);
  pad.value!.focus();
  holdOffsetPreview();
  moveTo(e);
}

function move(e: PointerEvent) {
  if (pad.value!.hasPointerCapture(e.pointerId)) moveTo(e);
}

function key(e: KeyboardEvent) {
  const step = e.shiftKey ? 10 : 1;
  const dx = props.lockX ? 0 : ({ ArrowLeft: -step, ArrowRight: step }[e.key] ?? 0);
  const dy = props.lockY ? 0 : ({ ArrowUp: -step, ArrowDown: step }[e.key] ?? 0);
  if (!dx && !dy) return;
  e.preventDefault();
  x.value = clamp(x.value + dx);
  y.value = clamp(y.value + dy);
  pulseOffsetPreview();
}

// Scroll for vertical, shift+scroll for horizontal; a locked axis hands the wheel to the other.
function wheel(e: WheelEvent) {
  const toward = e.deltaY < 0 ? -1 : 1;
  const horizontal = props.lockY || (e.shiftKey && !props.lockX);
  if (horizontal && !props.lockX) x.value = clamp(x.value - toward);
  else if (!horizontal && !props.lockY) y.value = clamp(y.value + toward);
  else return;
  pulseOffsetPreview();
}

const dot = computed(() => ({ left: `${(x.value + 100) / 2}%`, top: `${(y.value + 100) / 2}%` }));
const valueText = computed(() => `Horizontal ${x.value}%, vertical ${y.value}%`);
const hint = computed(() =>
  props.lockX && props.lockY
    ? "Both axes are locked"
    : props.lockX
      ? "Drag to move your sprite up and down"
      : props.lockY
        ? "Drag to move your sprite sideways"
        : "Drag to move your sprite",
);
</script>

<template>
  <div
    ref="pad"
    class="pad"
    role="slider"
    tabindex="0"
    aria-label="Sprite offset"
    aria-valuemin="-100"
    aria-valuemax="100"
    :aria-valuenow="x"
    :aria-valuetext="valueText"
    :title="hint"
    :class="{ locked: lockX && lockY }"
    @pointerdown="down"
    @pointermove="move"
    @keydown="key"
    @wheel.prevent="wheel"
  >
    <!-- Guide lines along the axes the dot can travel. -->
    <span v-if="!lockX || lockY" class="axis h" aria-hidden="true"></span>
    <span v-if="!lockY || lockX" class="axis v" aria-hidden="true"></span>
    <span class="dot" :style="dot" aria-hidden="true"></span>
  </div>
</template>

<style scoped>
.pad {
  position: relative;
  flex: none;
  width: 132px;
  aspect-ratio: 1;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background:
    linear-gradient(var(--border) 1px, transparent 1px) 0 0 / 25% 25%,
    linear-gradient(90deg, var(--border) 1px, transparent 1px) 0 0 / 25% 25%,
    var(--surface-2);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}

.pad.locked {
  cursor: not-allowed;
}

.pad:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.axis {
  position: absolute;
  background: var(--text-muted);
  opacity: 0.5;
}

.axis.h {
  top: 50%;
  right: 0;
  left: 0;
  height: 1px;
}

.axis.v {
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
}

.dot {
  position: absolute;
  width: 20px;
  height: 20px;
  border: 2px solid var(--surface);
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
  transform: translate(-50%, -50%);
  pointer-events: none;
}

@media (pointer: coarse) {
  .pad {
    width: 168px;
  }

  .dot {
    width: 26px;
    height: 26px;
  }
}
</style>
