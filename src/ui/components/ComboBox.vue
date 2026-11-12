<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, useId, watch } from "vue";

export interface ComboItem {
  key: string | number;
  label: string;
  /** Right-aligned action or state, e.g. "Mute" or "Current". */
  hint?: string;
  /** Rendered struck through and announced as selected. */
  selected?: boolean;
}

const props = withDefaults(
  defineProps<{
    items: ComboItem[];
    label: string;
    placeholder?: string;
    emptyText?: string;
    /** Keep the list open after a pick, for toggling several items. */
    stayOpen?: boolean;
  }>(),
  { placeholder: "", emptyText: "Nothing matches.", stayOpen: false },
);
const emit = defineEmits<{ pick: [item: ComboItem] }>();
const query = defineModel<string>({ default: "" });

const id = useId();
const input = ref<HTMLInputElement>();
const open = ref(false);
const active = ref(-1);
// Fixed positioning keeps the list from being clipped by scrolling panels.
const place = ref<Record<string, string>>({});

const LIST_HEIGHT = 280;

watch(
  () => props.items,
  () => (active.value = props.items.length ? 0 : -1),
);

function position() {
  const rect = input.value!.getBoundingClientRect();
  const below = window.innerHeight - rect.bottom;
  const upward = below < LIST_HEIGHT && rect.top > below;
  place.value = {
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    maxHeight: `${Math.min(LIST_HEIGHT, (upward ? rect.top : below) - 12)}px`,
    ...(upward ? { bottom: `${window.innerHeight - rect.top + 4}px` } : { top: `${rect.bottom + 4}px` }),
  };
}

function show() {
  position();
  if (!open.value) {
    window.addEventListener("scroll", position, true);
    window.addEventListener("resize", position);
  }
  open.value = true;
  active.value = props.items.length ? 0 : -1;
}

function hide() {
  open.value = false;
  window.removeEventListener("scroll", position, true);
  window.removeEventListener("resize", position);
}

onUnmounted(hide);

function pick(item: ComboItem) {
  emit("pick", item);
  if (!props.stayOpen) {
    hide();
    input.value?.blur();
  }
}

async function onKey(e: KeyboardEvent) {
  if (!open.value && (e.key === "ArrowDown" || e.key === "ArrowUp")) return show();
  const n = props.items.length;
  if (e.key === "ArrowDown" && n) active.value = (active.value + 1) % n;
  else if (e.key === "ArrowUp" && n) active.value = (active.value - 1 + n) % n;
  else if (e.key === "Enter" && open.value && props.items[active.value]) pick(props.items[active.value]);
  else if (e.key === "Escape") hide();
  else return;
  e.preventDefault();
  await nextTick();
  document.getElementById(`${id}-${active.value}`)?.scrollIntoView({ block: "nearest" });
}

const activeId = computed(() => (open.value && active.value >= 0 ? `${id}-${active.value}` : undefined));
</script>

<template>
  <div class="combo">
    <input
      ref="input"
      v-model="query"
      class="input"
      type="search"
      role="combobox"
      :aria-label="label"
      :aria-expanded="open"
      :aria-controls="`${id}-list`"
      :aria-activedescendant="activeId"
      aria-autocomplete="list"
      :placeholder="placeholder"
      autocomplete="off"
      @focus="show"
      @input="open || show()"
      @blur="hide"
      @keydown="onKey"
    />
    <!-- Outside the panel, whose stacking context would let later panels cover the list. -->
    <Teleport to="body">
      <ul
        v-if="open"
        :id="`${id}-list`"
        class="list"
        :style="place"
        role="listbox"
        :aria-label="label"
        @mousedown.prevent
      >
        <li
          v-for="(item, i) in items"
          :id="`${id}-${i}`"
          :key="item.key"
          role="option"
          :aria-selected="!!item.selected"
          :class="{ active: i === active }"
          @mouseenter="active = i"
          @click="pick(item)"
        >
          <span class="label">{{ item.label }}</span>
          <span v-if="item.hint" class="hint">{{ item.hint }}</span>
        </li>
        <li v-if="!items.length" class="empty">{{ emptyText }}</li>
      </ul>
    </Teleport>
  </div>
</template>

<style scoped>
.combo {
  position: relative;
}

.list {
  position: fixed;
  z-index: 30;
  margin: 0;
  padding: 4px;
  overflow-y: auto;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: var(--shadow);
}

li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  padding: 0 10px;
  border-radius: 4px;
  cursor: pointer;
}

li.active {
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

li[aria-selected="true"] .label {
  color: var(--text-muted);
  text-decoration: line-through;
}

.empty {
  color: var(--text-muted);
  cursor: default;
}

@media (pointer: coarse) {
  li {
    min-height: var(--tap);
  }
}
</style>
