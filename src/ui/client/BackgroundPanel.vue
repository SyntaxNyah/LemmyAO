<script setup lang="ts">
import { computed, ref } from "vue";
import { state } from "../../core/state";
import { backgrounds, backgroundPreviewBase, searchBackgrounds } from "../../core/backgrounds";
import { changeBackground } from "../../core/commands";
import ComboBox, { type ComboItem } from "../components/ComboBox.vue";
import AssetImage from "./AssetImage.vue";
import BackgroundPicker from "./BackgroundPicker.vue";
import PictureIcon from "./PictureIcon.vue";

const query = ref("");
const pickerOpen = ref(false);
const current = computed(() => state.court.background);

const results = computed<ComboItem[]>(() => {
  const isCurrent = (name: string) => name.toLowerCase() === current.value.toLowerCase();
  const items: ComboItem[] = searchBackgrounds(backgrounds.names, query.value).map((name) => ({
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

function pick(item: ComboItem) {
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
            :base="backgroundPreviewBase(state.server.assetHost, current)"
            :extensions="backgrounds.extensions"
            :alt="`${current} background`"
          />
        </div>
        <strong>{{ current || "None yet" }}</strong>
      </div>
    </section>

    <section>
      <h3>Change background</h3>
      <div class="browse-row">
        <div class="search">
        <ComboBox
          v-model="query"
          :items="results"
          label="Backgrounds"
          placeholder="Search backgrounds…"
          :empty-text="backgrounds.loading ? 'Loading backgrounds…' : 'No backgrounds found.'"
          @pick="pick"
        />
        </div>
        <button
          class="browse"
          type="button"
          aria-label="Browse backgrounds"
          title="Browse the server's full background list. Right-click a tile to preview a random image."
          @click="pickerOpen = true"
        >
          <PictureIcon />
        </button>
      </div>
    </section>
    <BackgroundPicker v-model:open="pickerOpen" />
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

.browse-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 480px;
}

.browse-row .search {
  flex: 1;
  min-width: 0;
  max-width: none;
}

.browse {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font-size: 22px;
  cursor: pointer;
}

.browse:hover {
  border-color: var(--accent);
  background: var(--surface-hover);
  color: var(--accent);
}

.browse:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}</style>
