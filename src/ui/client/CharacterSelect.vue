<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { state } from "../../core/state";
import { getFavourites, setFavourites } from "../../core/settings";
import { pickCharacter, sendOOC } from "../../core/commands";
import { characterFolder } from "../../core/character";
import AssetImage from "./AssetImage.vue";
import { charSelectOpen } from "./overlays";

const query = ref("");
const search = ref<HTMLInputElement>();
const favourites = ref(new Set<number>());

// Big rosters (thousands) render a first screenful, then the rest once the
// list is open or typing in the search pauses.
const FIRST_BATCH = 240;
const rendered = ref(FIRST_BATCH);
let fillTimer: ReturnType<typeof setTimeout> | undefined;
function renderRestSoon(delay: number) {
  rendered.value = FIRST_BATCH;
  clearTimeout(fillTimer);
  fillTimer = setTimeout(() => (rendered.value = Infinity), delay);
}
watch(query, () => renderRestSoon(200));
watch(charSelectOpen, async (open) => {
  if (!open) return;
  requestAnimationFrame(() => renderRestSoon(0));
  favourites.value = getFavourites(state.server.assetHost);
  query.value = "";
  await nextTick();
  search.value?.focus();
});

function toggleFavourite(id: number) {
  const next = new Set(favourites.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  favourites.value = next;
  setFavourites(state.server.assetHost, next);
}

const tiles = computed(() => {
  const q = query.value.trim().toLowerCase();
  return state.characters
    .map((c, id) => ({ id, name: c?.name ?? "", taken: !!c?.taken, favourite: favourites.value.has(id) }))
    .filter((t) => t.name && (!q || t.name.toLowerCase().includes(q)))
    .sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.id - b.id);
});

const initials = (name: string) =>
  name
    .split(/[\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

const canClose = computed(() => state.self.charId >= 0);

function pick(id: number) {
  pickCharacter(id);
}

function spectate() {
  pickCharacter(-1);
  charSelectOpen.value = false;
}

function close() {
  if (canClose.value) charSelectOpen.value = false;
}
</script>

<template>
  <div v-if="charSelectOpen" class="overlay" @keydown.esc="close">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="Choose your character">
      <div class="toolbar">
        <input
          ref="search"
          v-model="query"
          class="input search"
          type="search"
          placeholder="Search characters…"
          aria-label="Search characters"
          autocomplete="off"
        />
        <button class="btn" @click="sendOOC('/randomchar')">Random</button>
        <button
          class="icon-btn dismiss"
          :aria-label="canClose ? 'Close' : 'Spectate'"
          :title="canClose ? 'Close' : 'Spectate'"
          @click="canClose ? close() : spectate()"
        >
          ✕
        </button>
      </div>

      <p v-if="!tiles.length" class="empty">
        {{ state.characters.length ? "No characters match." : "Waiting for the character list…" }}
      </p>

      <ul class="grid" role="listbox" aria-label="Characters">
        <li v-for="t in tiles.slice(0, rendered)" :key="t.id" class="tile" :class="{ taken: t.taken, current: state.self.charId === t.id }">
          <button
            class="pick"
            role="option"
            :aria-selected="state.self.charId === t.id"
            :aria-disabled="t.taken"
            :disabled="t.taken"
            :title="t.taken ? `${t.name} (taken)` : t.name"
            @click="pick(t.id)"
          >
            <span class="icon">
              <AssetImage :base="`${characterFolder(t.name)}char_icon`" alt="">
                <template #fallback>
                  <span class="initials" aria-hidden="true">{{ initials(t.name) }}</span>
                </template>
              </AssetImage>
              <span v-if="t.taken" class="badge">Taken</span>
            </span>
            <span class="name">{{ t.name }}</span>
          </button>
          <button
            class="star"
            :class="{ on: t.favourite }"
            :aria-pressed="t.favourite"
            :aria-label="t.favourite ? `Remove ${t.name} from favorites` : `Add ${t.name} to favorites`"
            @click="toggleFavourite(t.id)"
          >
            ★
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: max(12px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom));
  background: rgb(0 0 0 / 0.55);
  backdrop-filter: blur(4px);
}

.sheet {
  display: flex;
  flex-direction: column;
  width: min(960px, 100%);
  max-height: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg);
  box-shadow: var(--shadow);
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

.empty {
  margin: 32px 16px;
  color: var(--text-muted);
  text-align: center;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  align-items: start;
  gap: 2px;
  margin: 0;
  padding: 12px 16px 16px;
  overflow-y: auto;
  list-style: none;
}

.tile {
  position: relative;
  /* Rosters can hold thousands; skip layout and paint for tiles off screen. */
  content-visibility: auto;
  contain-intrinsic-size: auto 110px;
}

.pick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 4px 2px 6px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.pick:hover:not(:disabled) {
  border-color: var(--border);
  background: var(--surface-hover);
}

.current .pick {
  border-color: var(--accent);
}

.pick:disabled {
  cursor: not-allowed;
}

.icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  overflow: hidden;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
}

.icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.taken .icon img,
.taken .initials {
  filter: grayscale(1);
  opacity: 0.35;
}

.initials {
  color: var(--text-muted);
  font-size: 20px;
  font-weight: 700;
}

.badge {
  position: absolute;
  bottom: 3px;
  left: 50%;
  transform: translateX(-50%);
  padding: 0 6px;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.75);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}

/* Wrap long names instead of truncating them. */
.name {
  max-width: 100%;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.25;
  text-align: center;
  overflow-wrap: anywhere;
  hyphens: auto;
}

.taken .name {
  color: var(--text-muted);
}

.star {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: transparent;
  font-size: 14px;
  cursor: pointer;
}

.tile:hover .star,
.star:focus-visible {
  color: var(--text-muted);
}

.star.on {
  color: var(--warn);
}

@media (pointer: coarse) {
  .star {
    color: var(--border);
  }
}
</style>
