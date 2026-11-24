<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { state } from "../../core/state";
import { settings, setSetting } from "../../core/settings";
import { setPosition } from "../../core/character";
import { availableBackgroundPositions, backgroundPositionFor, type BackgroundPosition } from "./backgroundPositions";
import { backgrounds, backgroundImages, backgroundPreviewBase, searchBackgrounds } from "../../core/backgrounds";
import { changeBackground, draft, sendOOC } from "../../core/commands";
import ComboBox, { type ComboItem } from "../components/ComboBox.vue";
import AssetImage from "./AssetImage.vue";
import BackgroundPicker from "./BackgroundPicker.vue";
import PictureIcon from "./PictureIcon.vue";

const query = ref("");
const pickerOpen = ref(false);
const current = computed(() => state.court.background);
const currentImage = computed(() => backgroundPositionFor(draft.side)?.image ?? "defenseempty");
const currentPosition = computed(() => backgroundPositionFor(draft.side)?.label ?? "");
const positionFiles = ref<string[] | null>(null);
let positionSeq = 0;
watch(
  () => [state.court.background, state.server.assetHost] as const,
  async ([background]) => {
    const seq = ++positionSeq;
    positionFiles.value = null;
    if (!background) return;
    const files = await backgroundImages(background);
    if (seq === positionSeq) positionFiles.value = files;
  },
  { immediate: true },
);
const positionChoices = computed(() => (positionFiles.value === null ? [] : availableBackgroundPositions(positionFiles.value)));
const showPositions = computed(() => settings.showBackgroundPositions);
const positionsTitle = computed(() => (showPositions.value ? "Hide position previews" : "Show position previews"));
const togglePositions = () => setSetting("showBackgroundPositions", !showPositions.value);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
function choosePosition(position: BackgroundPosition) {
  setPosition(position.side);
  sendOOC(`/pos ${position.side}`);
}

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
            :key="`${current}|${currentImage}`"
            :base="backgroundPreviewBase(state.server.assetHost, current, currentImage)"
            :extensions="backgrounds.extensions"
            :alt="`${current} background`"
          />
        </div>
        <strong>{{ current || "None yet" }}</strong>
        <span v-if="current && currentPosition" class="current-pos">{{ currentPosition }}</span>
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

    <section v-if="current" class="positions">
      <div class="positions-head">
        <h3>Positions</h3>
        <button
          class="dots"
          type="button"
          :aria-expanded="settings.showBackgroundPositions"
          :aria-label="positionsTitle"
          :title="positionsTitle"
          @click="togglePositions"
        >
          ⋯
        </button>
      </div>
      <div
        v-if="settings.showBackgroundPositions && positionChoices.length"
        class="position-strip"
        role="list"
        aria-label="Background positions"
      >
        <button
          v-for="position in positionChoices"
          :key="position.side"
          class="position"
          :class="{ current: position.side === draft.side }"
          type="button"
          :aria-pressed="position.side === draft.side"
          :data-position="position.side"
          :title="`Speak from ${position.label}`"
          @click="choosePosition(position)"
        >
          <span class="position-thumb">
            <AssetImage
              :base="backgroundPreviewBase(state.server.assetHost, current, position.image)"
              :extensions="backgrounds.extensions"
              :alt="`${position.label} background`"
              low-priority
            >
              <template #fallback>
                <span class="initials" aria-hidden="true">{{ initials(position.label) }}</span>
              </template>
            </AssetImage>
          </span>
          <span class="position-label">{{ position.label }}</span>
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
}
.current-pos {
  color: var(--text-muted);
  font-size: 12px;
}

.positions-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.positions-head h3 {
  margin: 0;
}

.dots {
  flex: none;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.dots:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.dots:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.position-strip {
  display: flex;
  gap: 6px;
  padding: 2px 2px 6px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
}

.position {
  flex: 0 0 82px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 3px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text);
  font: inherit;
  text-align: center;
  cursor: pointer;
  scroll-snap-align: start;
}

.position:hover {
  border-color: var(--border);
  background: var(--surface-hover);
}

.position.current {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.position-thumb {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.position-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.position-label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.2;
  overflow-wrap: anywhere;
}

.positions .initials {
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 700;
}

@media (max-width: 600px) {
  .position {
    flex-basis: 72px;
  }

  .position-label {
    font-size: 10px;
  }
}</style>
