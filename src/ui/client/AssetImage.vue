<script setup lang="ts">
import { computed, ref, watch } from "vue";

// Asset hosts ship either format; try each before giving up.
const props = withDefaults(defineProps<{ base: string; alt: string; extensions?: string[] }>(), {
  extensions: () => [".png", ".webp"],
});
const emit = defineEmits<{ missing: [] }>();

const attempt = ref(0);
// Hidden until a candidate loads, so failed tries never show the broken-image icon.
const loaded = ref(false);
watch(
  () => props.base,
  () => {
    attempt.value = 0;
    loaded.value = false;
  },
);
const src = computed(() => `${props.base}${props.extensions[attempt.value]}`);

function next() {
  if (attempt.value < props.extensions.length - 1) attempt.value++;
  else emit("missing");
}
</script>

<template>
  <img
    :src="src"
    :alt="alt"
    :style="loaded ? undefined : { visibility: 'hidden' }"
    loading="lazy"
    decoding="async"
    @load="loaded = true"
    @error="next"
  />
</template>
