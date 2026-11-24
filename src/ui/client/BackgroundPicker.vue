<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import {
  backgrounds,
  backgroundFolder,
  backgroundImages,
  backgroundPreviewBase,
  loadBackgrounds,
} from "../../core/backgrounds";
import { state } from "../../core/state";
import { changeBackground } from "../../core/commands";
import { getFavouriteBackgrounds, setFavouriteBackgrounds } from "../../core/settings";
import { orderBackgrounds, type BackgroundChoice } from "./backgroundOrder";
import AssetImage from "./AssetImage.vue";
import PictureIcon from "./PictureIcon.vue";

const open = defineModel<boolean>("open", { default: false });

const FIRST_BATCH = 60;
const query = ref("");
const search = ref<HTMLInputElement>();
const favourites = ref(new Set<string>());
const rendered = ref(FIRST_BATCH);
let fillTimer: ReturnType<typeof setTimeout> | undefined;

const current = computed(() => state.court.background);
const currentKey = computed(() => current.value.toLowerCase());

const names = computed(() => {
  const all = backgrounds.names.slice();
  if (current.value && !all.some((name) => name.toLowerCase() === currentKey.value)) all.push(current.value);
  return all;
});

const tiles = computed<BackgroundChoice[]>(() => {
  const q = query.value.trim().toLowerCase();
  return orderBackgrounds(
    names.value
      .filter((name) => !q || name.toLowerCase().includes(q))
      .map((name) => ({
        name,
        favourite: favourites.value.has(name.toLowerCase()),
        current: name.toLowerCase() === currentKey.value,
      })),
  );
});

const canRandom = computed(() => tiles.value.length > 0);

const initials = (name: string) =>
  name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");

function renderRestSoon(delay: number) {
  rendered.value = FIRST_BATCH;
  clearTimeout(fillTimer);
  fillTimer = setTimeout(() => (rendered.value = Infinity), delay);
}

interface Preview {
  name: string;
  file?: string;
  src?: string;
  base?: string;
  loading?: boolean;
}

const preview = ref<Preview | null>(null);
let previewSeq = 0;

watch(query, () => renderRestSoon(200));
watch(open, async (isOpen) => {
  if (!isOpen) return;
  favourites.value = getFavouriteBackgrounds(state.server.assetHost);
  query.value = "";
  previewSeq++;
  preview.value = null;
  requestAnimationFrame(() => renderRestSoon(0));
  if (!backgrounds.names.length && !backgrounds.loading) void loadBackgrounds();
  await nextTick();
  search.value?.focus();
});

function close() {
  open.value = false;
}

function pick(name: string) {
  changeBackground(name);
  close();
}

function randomize() {
  const pool = tiles.value.filter((tile) => !tile.current);
  const choices = pool.length ? pool : tiles.value;
  if (!choices.length) return;
  pick(choices[Math.floor(Math.random() * choices.length)].name);
}

function toggleFavourite(name: string) {
  const key = name.toLowerCase();
  const next = new Set(favourites.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  favourites.value = next;
  setFavouriteBackgrounds(state.server.assetHost, next);
}

async function previewRandom(name: string) {
  const seq = ++previewSeq;
  preview.value = { name, loading: true };
  const files = await backgroundImages(name);
  if (seq !== previewSeq) return;
  const file = files[Math.floor(Math.random() * files.length)];
  if (file) {
    preview.value = {
      name,
      file,
      src: `${backgroundFolder(state.server.assetHost, name)}${encodeURIComponent(file)}`,
    };
  } else {
    preview.value = {
      name,
      file: "defenseempty",
      base: backgroundPreviewBase(state.server.assetHost, name),
    };
  }
}

function closePreview() {
  previewSeq++;
  preview.value = null;
}

function onEscape() {
  if (preview.value) closePreview();
  else close();
}
</script>
<template>
  <Teleport to="body">
    <div v-if="open" class="overlay" @keydown.esc="onEscape">
      <div class="sheet" role="dialog" aria-modal="true" aria-label="Choose a background">
        <div class="toolbar">
          <input
            ref="search"
            v-model="query"
            class="input search"
            type="search"
            placeholder="Search backgrounds..."
            aria-label="Search backgrounds"
            autocomplete="off"
          />
          <button class="btn" type="button" :disabled="!canRandom" aria-label="Random background" @click="randomize">
            Random
          </button>
          <button class="icon-btn dismiss" type="button" aria-label="Close" title="Close" @click="close">✕</button>
        </div>

        <p class="hint">
          Loaded from the server's background folder. Right-click a tile to preview a random image; on touch, tap the
          picture.
        </p>

        <p v-if="!tiles.length" class="empty">
          {{ backgrounds.loading ? "Loading backgrounds..." : "No backgrounds match." }}
        </p>

        <ul v-else class="grid" role="listbox" aria-label="Backgrounds">
          <li
            v-for="t in tiles.slice(0, rendered)"
            :key="t.name"
            class="tile"
            :class="{ current: t.current }"
            :data-background="t.name"
            @contextmenu.prevent="previewRandom(t.name)"
          >
            <button class="pick" role="option" :aria-selected="t.current" :title="t.name" @click="pick(t.name)">
              <span class="thumb">
                <AssetImage
                  :base="backgroundPreviewBase(state.server.assetHost, t.name)"
                  :extensions="backgrounds.extensions"
                  :alt="`${t.name} background`"
                  low-priority
                >
                  <template #fallback>
                    <span class="initials" aria-hidden="true">{{ initials(t.name) }}</span>
                  </template>
                </AssetImage>
              </span>
              <span class="name">{{ t.name }}</span>
            </button>
            <button
              class="star"
              :class="{ on: t.favourite }"
              type="button"
              :aria-pressed="t.favourite"
              :aria-label="t.favourite ? `Remove ${t.name} from favorites` : `Add ${t.name} to favorites`"
              @click.stop="toggleFavourite(t.name)"
            >
              ★
            </button>
            <button
              class="preview"
              type="button"
              :aria-label="`Preview a random image of ${t.name}`"
              title="Preview a random image"
              @click.stop="previewRandom(t.name)"
            >
              <PictureIcon />
            </button>
          </li>
        </ul>
      </div>

      <div v-if="preview" class="preview-overlay" @click.self="closePreview" @keydown.esc.stop="closePreview">
        <figure class="preview-card" role="dialog" aria-modal="true" aria-label="Background preview">
          <figcaption>
            <strong>{{ preview.name }}</strong>
            <span v-if="preview.file" class="file">{{ preview.file }}</span>
            <button class="icon-btn" type="button" aria-label="Close preview" title="Close preview" @click="closePreview">
              ✕
            </button>
          </figcaption>
          <div class="preview-image">
            <span v-if="preview.loading" class="muted">Loading preview...</span>
            <AssetImage
              v-else-if="preview.base"
              :base="preview.base"
              :extensions="backgrounds.extensions"
              :alt="`${preview.name} preview`"
            >
              <template #fallback><span class="muted">No preview.</span></template>
            </AssetImage>
            <img v-else-if="preview.src" :src="preview.src" :alt="`${preview.name} preview`" />
          </div>
          <p class="preview-hint">Right-click again for another image.</p>
        </figure>
      </div>
    </div>
  </Teleport>
</template>
<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 95;
  display: grid;
  place-items: center;
  padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
  background: rgb(0 0 0 / 0.55);
  backdrop-filter: blur(4px);
}

.sheet {
  display: flex;
  flex-direction: column;
  width: min(1100px, 100%);
  max-height: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  box-shadow: var(--shadow);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.search {
  flex: 1;
  min-width: 0;
  width: auto;
}

.icon-btn {
  flex: none;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
}

.dismiss {
  color: var(--danger);
  font-size: 18px;
  font-weight: 700;
}

.dismiss:hover {
  background: color-mix(in srgb, var(--danger) 15%, transparent);
}

.hint {
  margin: 0;
  padding: 8px 16px 0;
  color: var(--text-muted);
  font-size: 12px;
}

.empty {
  margin: 32px 16px;
  color: var(--text-muted);
  text-align: center;
}

.grid {
  display: grid;
  flex: 1;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  align-items: start;
  gap: 10px;
  min-height: 0;
  margin: 0;
  padding: 12px 16px 16px;
  overflow-y: auto;
  list-style: none;
}

.tile {
  position: relative;
  content-visibility: auto;
  contain-intrinsic-size: auto 140px;
}

.pick {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.pick:hover {
  border-color: var(--border);
  background: var(--surface-hover);
}

.current .pick {
  border-color: var(--accent);
}

.thumb {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.initials {
  color: var(--text-muted);
  font-size: 18px;
  font-weight: 700;
}

.name {
  max-width: 100%;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
}

.star {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.45);
  color: transparent;
  font-size: 15px;
  cursor: pointer;
}

.tile:hover .star,
.star:focus-visible,
.star.on {
  color: var(--warn);
}

.preview {
  position: absolute;
  top: 6px;
  left: 6px;
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 50%;
  background: rgb(0 0 0 / 0.45);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}

.tile:hover .preview,
.preview:focus-visible {
  opacity: 1;
}

.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
  background: rgb(0 0 0 / 0.72);
  backdrop-filter: blur(4px);
}

.preview-card {
  display: flex;
  flex-direction: column;
  width: min(1100px, 100%);
  max-height: 100%;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  box-shadow: var(--shadow);
}

.preview-card figcaption {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--border);
}

.preview-card .file {
  margin-right: auto;
  color: var(--text-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.preview-image {
  display: grid;
  place-items: center;
  min-height: 0;
  overflow: auto;
  background: #000;
}

.preview-image img {
  display: block;
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.preview-hint {
  margin: 0;
  padding: 8px 12px;
  color: var(--text-muted);
  font-size: 12px;
  text-align: center;
}

.muted {
  color: var(--text-muted);
}

@media (pointer: coarse) {
  .preview {
    opacity: 1;
  }

  .star {
    color: var(--text-muted);
  }
}

@media (max-width: 600px) {
  .toolbar {
    padding: 10px;
  }

  .hint {
    padding: 8px 10px 0;
  }

  .grid {
    grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
    gap: 6px;
    padding: 10px;
  }
}
</style>