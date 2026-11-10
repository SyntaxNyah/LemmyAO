<script setup lang="ts">
export interface PickItem {
  key: string | number;
  label: string;
  /** Right-aligned action or state, e.g. "Mute" or "Current". */
  hint?: string;
  /** Rendered struck through and announced as selected. */
  selected?: boolean;
}

defineProps<{ items: PickItem[]; label: string }>();
defineEmits<{ pick: [item: PickItem] }>();
</script>

<template>
  <ul class="pick-list" role="listbox" :aria-label="label">
    <li v-for="item in items" :key="item.key">
      <button role="option" :aria-selected="!!item.selected" @click="$emit('pick', item)">
        <span class="label">{{ item.label }}</span>
        <span v-if="item.hint" class="hint">{{ item.hint }}</span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.pick-list {
  max-height: 320px;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

button {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

button:hover {
  background: var(--surface-hover);
}

.label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hint {
  flex: none;
  color: var(--text-muted);
}

button[aria-selected="true"] .label {
  color: var(--text-muted);
  text-decoration: line-through;
}

@media (pointer: coarse) {
  button {
    min-height: var(--tap);
  }
}
</style>
