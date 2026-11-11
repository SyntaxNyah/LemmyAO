<script setup lang="ts">
import { editingLayout } from "./layout";
import type { PanelNode } from "./panelLayout";
import { groupKey } from "./tabDrag";
import type { TabId } from "./tabs";
import TabStrip from "./TabStrip.vue";
import SplitKnob from "./SplitKnob.vue";

defineProps<{ node: PanelNode; path: number[]; slotRef: (key: string) => (el: unknown) => void }>();
const emit = defineEmits<{ select: [tab: TabId] }>();
</script>

<template>
  <div v-if="node.kind === 'group'" class="group" data-split-item :style="{ flexGrow: node.size }">
    <TabStrip v-if="node.tabs.length > 1 || editingLayout" :tabs="node.tabs" :active="node.active" :group="path" @select="emit('select', $event)" />
    <div :ref="slotRef(groupKey(path))" class="slot" :data-drop-slot="groupKey(path)"></div>
  </div>
  <div v-else class="split" :class="node.dir" data-split-item :style="{ flexGrow: node.size }">
    <template v-for="(child, i) in node.children" :key="i">
      <SplitKnob v-if="editingLayout && i > 0" :path="path" :index="i - 1" :dir="node.dir" />
      <PanelTree :node="child" :path="[...path, i]" :slot-ref="slotRef" @select="emit('select', $event)" />
    </template>
  </div>
</template>

<style scoped>
.group,
.split {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  min-height: 0;
}

.group,
.split.column {
  flex-direction: column;
}

.row > [data-split-item]:not(:first-child) {
  border-left: 1px solid var(--border);
}

.column > [data-split-item]:not(:first-child) {
  border-top: 1px solid var(--border);
}

/* Empty boxes the panels are placed over. */
.slot {
  position: relative;
  flex: 1;
  min-height: 0;
}

:global(.editing) .slot {
  outline: 1px dashed color-mix(in srgb, var(--accent) 40%, transparent);
  outline-offset: -4px;
}
</style>
