<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { state } from "../../core/state";
import { draft } from "../../core/commands";
import { buildEmoteUrls } from "../../utils/emoteUrls";

const EMOTE_EXTENSIONS = [".gif", ".png", ".apng", ".webp", ".webp.static"];

const urls = computed(() => {
  const character = state.self.character;
  const emote = character?.emotes[state.self.emoteIndex];
  if (!character || !emote) return [];
  return buildEmoteUrls(state.server.assetHost, EMOTE_EXTENSIONS, character.name.toLowerCase(), emote.anim, "(a)");
});

const attempt = ref(0);
watch(urls, () => (attempt.value = 0));
const src = computed(() => urls.value[attempt.value]);

// Same placement the viewport gives the speaking character.
const style = computed(() => ({
  left: `${draft.pair.offset.x}%`,
  top: `${draft.pair.offset.y}%`,
  transform: draft.flip ? `scale(-1, 1)` : undefined,
}));
</script>

<template>
  <div v-if="src" class="ghost-layer" aria-hidden="true">
    <div class="ghost" :style="style">
      <img :src="src" alt="" @error="attempt++" />
    </div>
    <span class="readout">{{ draft.pair.offset.x }}%, {{ draft.pair.offset.y }}%</span>
  </div>
</template>

<style scoped>
.ghost-layer {
  position: absolute;
  inset: 0;
  z-index: 50;
  overflow: hidden;
  pointer-events: none;
}

.ghost {
  position: absolute;
  width: 100%;
  height: 100%;
  opacity: 0.45;
  filter: drop-shadow(0 0 2px var(--accent));
}

.ghost img {
  position: absolute;
  top: 50%;
  left: 50%;
  height: 100%;
  transform: translate(-50%, -50%);
}

.readout {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.6);
  color: #fff;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
</style>
