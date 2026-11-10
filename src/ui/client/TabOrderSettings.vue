<script setup lang="ts">
import { computed } from "vue";
import { settings, setSetting } from "../../core/settings";
import { orderTabs } from "./tabs";

const tabs = computed(() => orderTabs(settings.tabOrder));

function move(index: number, by: number) {
  const ids = tabs.value.map((t) => t.id);
  const to = index + by;
  if (to < 0 || to >= ids.length) return;
  [ids[index], ids[to]] = [ids[to], ids[index]];
  setSetting("tabOrder", ids);
}
</script>

<template>
  <section class="tab-order">
    <h2>Tab order</h2>
    <ol>
      <li v-for="(tab, i) in tabs" :key="tab.id">
        <span>{{ tab.label }}<small v-if="i === 0"> (under the viewport in landscape)</small></span>
        <button class="btn" :disabled="i === 0" :aria-label="`Move ${tab.label} earlier`" @click="move(i, -1)">↑</button>
        <button class="btn" :disabled="i === tabs.length - 1" :aria-label="`Move ${tab.label} later`" @click="move(i, 1)">↓</button>
      </li>
    </ol>
    <button class="btn" :disabled="!settings.tabOrder.length" @click="setSetting('tabOrder', [])">Reset order</button>
  </section>
</template>

<style scoped>
.tab-order {
  display: block;
  margin-top: 16px;
}

ol {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 320px;
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 4px 4px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
}

li span {
  flex: 1;
}

small {
  color: var(--text-muted);
}

li .btn {
  min-width: 40px;
  padding: 0;
}
</style>
