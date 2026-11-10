<script setup lang="ts">
import { computed } from "vue";
import { state } from "../../core/state";
import { changeArea } from "../../core/commands";
import { settings, setSetting } from "../../core/settings";

const favourites = computed(() => new Set(settings.favouriteAreas));
const isFavourite = (name: string) => favourites.value.has(name.toLowerCase());

function toggleFavourite(name: string) {
  const key = name.toLowerCase();
  const next = new Set(favourites.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  setSetting("favouriteAreas", [...next]);
}

/** Favorites first, otherwise in the server's order; keeps each area's index for changeArea. */
const rows = computed(() =>
  state.areas
    .map((area, index) => ({ area, index, favourite: isFavourite(area.name) }))
    .sort((a, b) => Number(b.favourite) - Number(a.favourite) || a.index - b.index),
);

const STATUS: Record<string, { label: string; tone: string }> = {
  IDLE: { label: "Idle", tone: "idle" },
  "LOOKING-FOR-PLAYERS": { label: "Looking for players", tone: "ok" },
  CASING: { label: "Casing", tone: "warn" },
  RECESS: { label: "Recess", tone: "info" },
  RP: { label: "Roleplay", tone: "info" },
  GAMING: { label: "Gaming", tone: "info" },
};

const status = (raw: string) => STATUS[raw.toUpperCase()] ?? { label: raw || "Unknown", tone: "idle" };
const locked = (lock: string) => lock.toUpperCase() !== "FREE" && lock !== "";
const lockLabel = (lock: string) => (lock.toUpperCase() === "SPECTATABLE" ? "Spectatable" : "Locked");
</script>

<template>
  <div class="areas">
    <p v-if="!state.areas.length" class="empty">No areas yet.</p>
    <ul v-else role="listbox" aria-label="Areas">
      <li v-for="{ area, index: i, favourite } in rows" :key="i" class="row">
        <button
          class="star"
          :class="{ on: favourite }"
          :aria-pressed="favourite"
          :aria-label="favourite ? `Remove ${area.name} from favorites` : `Add ${area.name} to favorites`"
          @click="toggleFavourite(area.name)"
        >
          ★
        </button>
        <button
          class="area"
          role="option"
          :aria-selected="state.self.areaId === i"
          :aria-current="state.self.areaId === i ? 'location' : undefined"
          @click="state.self.areaId !== i && changeArea(i)"
        >
          <span class="top">
            <span class="name">{{ area.name }}</span>
            <span class="players" :title="`${area.players} players`">
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
                <path
                  d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-4 0-8 2-8 5v1h16v-1c0-3-4-5-8-5Z"
                  fill="currentColor"
                />
              </svg>
              {{ area.players }}
            </span>
          </span>
          <span class="meta">
            <span class="status" :class="status(area.status).tone">{{ status(area.status).label }}</span>
            <span v-if="area.caseManager && area.caseManager.toUpperCase() !== 'FREE'" class="cm">
              CM: {{ area.caseManager }}
            </span>
            <span v-if="locked(area.lock)" class="lock">{{ lockLabel(area.lock) }}</span>
            <span v-if="state.self.areaId === i" class="here">You are here</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.areas {
  padding: 8px;
}

.empty {
  margin: 24px 8px;
  color: var(--text-muted);
  text-align: center;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  align-items: stretch;
  gap: 4px;
}

.star {
  flex: none;
  width: 40px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--border);
  font-size: 18px;
  cursor: pointer;
}

.star:hover {
  color: var(--text-muted);
}

.star.on {
  color: var(--warn);
}

.area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.area:hover {
  background: var(--surface-hover);
}

.area[aria-selected="true"] {
  border-color: var(--accent);
  box-shadow: inset 3px 0 var(--accent);
  cursor: default;
}

.top {
  display: flex;
  align-items: center;
  gap: 8px;
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.players {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  color: var(--text-muted);
  font-size: 12px;
}

.status {
  padding: 0 8px;
  border-radius: 999px;
  background: var(--surface-2);
  font-weight: 600;
}

.status.ok {
  background: color-mix(in srgb, var(--ok) 18%, transparent);
  color: var(--ok);
}

.status.warn {
  background: color-mix(in srgb, var(--warn) 18%, transparent);
  color: var(--warn);
}

.status.info {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
}

.lock {
  color: var(--danger);
  font-weight: 600;
}

.here {
  margin-left: auto;
  color: var(--accent);
  font-weight: 600;
}
</style>
