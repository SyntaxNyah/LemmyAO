<script setup lang="ts">
import { computed, ref } from "vue";
import { state } from "../../core/state";
import { backgrounds, searchBackgrounds } from "../../core/backgrounds";
import { changeBackground } from "../../core/commands";
import PickList, { type PickItem } from "../components/PickList.vue";
import AssetImage from "./AssetImage.vue";

const BG_EXTENSIONS = [".png", ".gif", ".webp", ".apng"];

const query = ref("");
const current = computed(() => state.court.background);
const previewBase = (name: string) =>
  `${state.server.assetHost}background/${encodeURI(name.toLowerCase())}/defenseempty`;

const results = computed<PickItem[]>(() => {
  const isCurrent = (name: string) => name.toLowerCase() === current.value.toLowerCase();
  const items: PickItem[] = searchBackgrounds(backgrounds.names, query.value).map((name) => ({
    key: name,
    label: name,
    hint: isCurrent(name) ? "Current" : undefined,
  }));
  // Servers may have backgrounds no list knows about; let a typed name through.
  const typed = query.value.trim();
  if (typed && !backgrounds.names.some((n) => n.toLowerCase() === typed.toLowerCase())) {
    items.push({ key: `typed:${typed}`, label: typed, hint: "Use this name" });
  }
  return items;
});

function pick(item: PickItem) {
  changeBackground(String(item.key).replace(/^typed:/, ""));
  query.value = "";
}
</script>

<template>
  <div class="background-panel">
    <section class="current">
      <h3>Current background</h3>
      <div class="current-row">
        <div class="preview">
          <AssetImage
            v-if="current"
            :key="current"
            :base="previewBase(current)"
            :extensions="BG_EXTENSIONS"
            :alt="`${current} background`"
          />
        </div>
        <strong>{{ current || "None yet" }}</strong>
      </div>
    </section>

    <section>
      <h3>Change background</h3>
      <div class="search">
        <input
          v-model="query"
          class="input"
          type="search"
          placeholder="Search backgrounds…"
          aria-label="Search backgrounds"
          autocomplete="off"
        />
        <PickList v-if="results.length" :items="results" label="Backgrounds" @pick="pick" />
        <p v-else-if="backgrounds.loading" class="muted">Loading backgrounds…</p>
        <p v-else class="muted">No backgrounds found. Type a background's folder name to use it.</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.background-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 12px 12px 16px;
}

h3 {
  margin: 0 0 8px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.current-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview {
  flex: none;
  width: 128px;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.search {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 420px;
}
</style>
