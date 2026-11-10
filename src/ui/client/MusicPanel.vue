<script setup lang="ts">
import { computed, ref } from "vue";
import { state } from "../../core/state";
import { isAudio } from "../../core/protocol";
import { playMusic } from "../../core/commands";

/** "music/Trial ~ Cornered.opus" -> "Trial ~ Cornered" */
const trackTitle = (track: string) =>
  track.substring(track.lastIndexOf("/") + 1).replace(/\.(opus|ogg|mp3|wav)$/i, "").trim();

/** Category entries are often decorated, e.g. "== Ace Attorney ==". */
const categoryTitle = (name: string) => name.replace(/^[=\-~*\s]+|[=\-~*\s]+$/g, "") || name;

interface Section {
  title: string;
  tracks: { track: string; title: string }[];
}

const query = ref("");
const nowPlaying = computed(() => state.court.music.music);

const sections = computed<Section[]>(() => {
  const q = query.value.trim().toLowerCase();
  const out: Section[] = [];
  let current: Section = { title: "", tracks: [] };
  for (const entry of state.music) {
    if (!isAudio(entry)) {
      if (current.tracks.length || current.title) out.push(current);
      current = { title: categoryTitle(entry), tracks: [] };
      continue;
    }
    const title = trackTitle(entry);
    if (!q || title.toLowerCase().includes(q) || current.title.toLowerCase().includes(q)) {
      current.tracks.push({ track: entry, title });
    }
  }
  out.push(current);
  return out.filter((s) => s.tracks.length);
});

const isPlaying = (track: string) => nowPlaying.value?.track === track;
</script>

<template>
  <div class="music">
    <section class="now" aria-live="polite">
      <span class="now-label">Now playing</span>
      <strong v-if="nowPlaying?.track" class="now-title">
        {{ trackTitle(nowPlaying.track) }}
        <span v-if="nowPlaying.looping" class="loop" title="Looping">⟳</span>
      </strong>
      <span v-else class="muted">Nothing</span>
    </section>

    <input
      v-model="query"
      class="input"
      type="search"
      placeholder="Search music…"
      aria-label="Search music"
      autocomplete="off"
    />

    <p v-if="!sections.length" class="empty">{{ query ? "No tracks match." : "No music on this server." }}</p>

    <section v-for="section in sections" :key="section.title" class="section">
      <h3 v-if="section.title">{{ section.title }}</h3>
      <ul role="listbox" :aria-label="section.title || 'Music'">
        <li v-for="t in section.tracks" :key="t.track">
          <button
            class="track"
            role="option"
            :aria-selected="isPlaying(t.track)"
            :title="t.track"
            @click="playMusic(t.track)"
          >
            <span v-if="isPlaying(t.track)" class="icon" aria-hidden="true">♪</span>
            <span class="title">{{ t.title }}</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.music {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px max(32px, env(safe-area-inset-bottom));
}

.now {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.now-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.now-title {
  overflow-wrap: anywhere;
}

.loop {
  margin-left: 4px;
  color: var(--text-muted);
  font-weight: 400;
}

.empty {
  margin: 16px 0;
  color: var(--text-muted);
  text-align: center;
}

.section h3 {
  position: sticky;
  top: -10px;
  z-index: 1;
  margin: 0;
  padding: 8px 0 6px;
  background: var(--bg);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

ul {
  margin: 0;
  padding: 0;
  list-style: none;
}

.track {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.track:hover {
  background: var(--surface-hover);
}

.track[aria-selected="true"] {
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: var(--accent);
  font-weight: 600;
}

.icon {
  flex: none;
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (pointer: coarse) {
  .track {
    min-height: var(--tap);
  }
}
</style>
