<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { DEFAULT_TABS, type TabId } from "./tabs";
import { editingLayout } from "./layout";
import type { GroupRef } from "./panelLayout";
import { groupKey, startTabDrag } from "./tabDrag";

// `group` is null for portrait's single strip, which isn't part of the arrangement.
const props = defineProps<{ tabs: TabId[]; active: TabId | null; group: GroupRef | null }>();
const emit = defineEmits<{ select: [tab: TabId] }>();

const label = (id: TabId) => DEFAULT_TABS.find((t) => t.id === id)!.label;
const editing = computed(() => editingLayout.value && props.group !== null);

const strip = ref<HTMLElement>();
const overflow = ref({ left: false, right: false });

function measure() {
  const el = strip.value;
  if (!el) return;
  overflow.value = { left: el.scrollLeft > 1, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 };
}

function scrollBy(direction: number) {
  const el = strip.value!;
  el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
}

// Keep the selected tab fully visible, e.g. after rotating or rearranging.
watch(
  () => [props.active, props.tabs.join()],
  async () => {
    await nextTick();
    strip.value?.querySelector(`[data-tab="${props.active}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
    measure();
  },
);

function down(tab: TabId, e: PointerEvent) {
  if (!editing.value || e.button !== 0) return;
  e.preventDefault();
  startTabDrag(tab, e, () => emit("select", tab));
}

let observer: ResizeObserver | undefined;
onMounted(() => {
  observer = new ResizeObserver(measure);
  observer.observe(strip.value!);
  measure();
});
onUnmounted(() => observer?.disconnect());
</script>

<template>
  <div class="tabs-wrap" :class="{ 'more-left': overflow.left, 'more-right': overflow.right, editing }">
    <nav ref="strip" class="tabs" role="tablist" :data-drop-strip="group ? groupKey(group) : undefined" @scroll="measure">
      <button
        v-for="t in tabs"
        :key="t"
        role="tab"
        :data-tab="t"
        :aria-selected="active === t"
        @click="!editing && emit('select', t)"
        @pointerdown="down(t, $event)"
      >
        {{ label(t) }}
      </button>
    </nav>
    <button v-if="overflow.left" class="tab-scroll left" tabindex="-1" aria-label="Show earlier tabs" @click="scrollBy(-1)">‹</button>
    <button v-if="overflow.right && !editing" class="tab-scroll right" tabindex="-1" aria-label="Show more tabs" @click="scrollBy(1)">
      ›
    </button>
  </div>
</template>

<style scoped>
.tabs-wrap {
  position: relative;
  display: flex;
  align-items: stretch;
  min-width: 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.tabs {
  display: flex;
  flex: 1;
  gap: 2px;
  min-width: 0;
  padding: 6px 8px 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.tabs button {
  flex: none;
  padding: 8px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.tabs button[aria-selected="true"] {
  border-bottom-color: var(--accent);
  color: var(--text);
}

/* In edit mode the tabs are grabbed and dragged; pointer events do the work, so stop touch scrolling. */
.editing .tabs button {
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  outline: 1px dashed color-mix(in srgb, var(--accent) 50%, transparent);
  outline-offset: -3px;
  cursor: grab;
  touch-action: none;
}


/* Fade the cut-off edge and offer a chevron so hidden tabs are discoverable. */
.more-left .tabs {
  mask-image: linear-gradient(to right, transparent, #000 48px);
}

.more-right .tabs {
  mask-image: linear-gradient(to left, transparent, #000 48px);
}

.more-left.more-right .tabs {
  mask-image: linear-gradient(to right, transparent, #000 48px, #000 calc(100% - 48px), transparent);
}

.tab-scroll {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 32px;
  border: 0;
  background: none;
  color: var(--text);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.tab-scroll.left {
  left: 0;
}

.tab-scroll.right {
  right: 0;
}
</style>
