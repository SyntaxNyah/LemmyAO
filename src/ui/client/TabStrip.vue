<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { DEFAULT_TABS, type TabId } from "./tabs";
import { editingLayout, panels, savePanels } from "./layout";
import { allGroups, MAX_SIDE_GROUPS, moveTab, sideGroupCount, splitWith, type GroupRef } from "./panelLayout";
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

// Moving the shown tab without dragging (keyboard, or where dragging is awkward).
const destinations = computed(() => {
  if (!props.group || !props.active) return [];
  const here = groupKey(props.group);
  let n = 0;
  const options = allGroups(panels.value).flatMap(({ ref, group }) => {
    const name = ref === "under" ? "Under the viewport" : `Panel ${++n}`;
    return groupKey(ref) === here ? [] : [{ value: `into:${groupKey(ref)}`, label: `${name} (${group.tabs.map(label).join(", ") || "empty"})` }];
  });
  if (props.group !== "under" && sideGroupCount(panels.value) < MAX_SIDE_GROUPS) {
    options.push({ value: "split:below", label: "New panel below" }, { value: "split:beside", label: "New panel beside" });
  }
  return options;
});

function moveShown(e: Event) {
  const select = e.target as HTMLSelectElement;
  const [kind, where] = select.value.split(":");
  select.value = "";
  const tab = props.active!;
  if (kind === "split") return savePanels(splitWith(panels.value, tab, props.group!, where as "below" | "beside"));
  const [column, group] = where.split("-").map(Number);
  savePanels(moveTab(panels.value, tab, where === "under" ? "under" : { column, group }));
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
    <select v-if="editing && destinations.length" class="move" aria-label="Move this tab" @change="moveShown">
      <option value="">Move…</option>
      <option v-for="d in destinations" :key="d.value" :value="d.value">{{ d.label }}</option>
    </select>
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

.move {
  flex: none;
  max-width: 7em;
  margin: 6px 8px 4px 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 13px;
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
