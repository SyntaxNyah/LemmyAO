<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import type { Emote } from "../../core/state";
import { characterFolder } from "../../core/character";
import { settings } from "../../core/settings";
import { attachSpritePreview } from "../../dom/spritePreview";
import AssetImage from "./AssetImage.vue";

const props = defineProps<{ character: string; emote: Emote; selected: boolean }>();
defineEmits<{ select: [] }>();

const button = ref<HTMLButtonElement>();
const missing = ref(false);
const hasPreanim = computed(() => props.emote.preanim !== "-" && props.emote.preanim !== "");
const label = computed(() => props.emote.label || `Emote ${props.emote.index}`);

onMounted(() => {
  attachSpritePreview(button.value!, props.character.toLowerCase(), props.emote.anim, label.value);
});
</script>

<template>
  <button
    ref="button"
    class="tile"
    :class="{ selected }"
    role="option"
    :aria-selected="selected"
    :title="label"
    @click="$emit('select')"
  >
    <AssetImage
      v-if="!missing"
      :base="`${characterFolder(character)}emotions/button${emote.index}_off`"
      :alt="label"
      @missing="missing = true"
    />
    <span v-else class="fallback">{{ label }}</span>
    <span v-if="hasPreanim && settings.preanimGlow" class="preanim" title="Has a preanimation"></span>
  </button>
</template>

<style scoped>
.tile {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  cursor: pointer;
}

.tile:hover {
  border-color: var(--border);
}

.tile.selected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent);
}

.tile img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.fallback {
  display: grid;
  place-items: center;
  height: 100%;
  padding: 2px;
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.preanim {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--preanim-glow-color, var(--warn));
  box-shadow: 0 0 0 2px var(--surface-2);
}
</style>
