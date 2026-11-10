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
// Kept here, not in the parent, so a missing image re-renders only itself (lists can hold thousands).
const failed = ref(false);
watch(
  () => props.base,
  () => {
    attempt.value = 0;
    loaded.value = false;
    failed.value = false;
  },
);
const src = computed(() => `${props.base}${props.extensions[attempt.value]}`);

function next() {
  if (attempt.value < props.extensions.length - 1) attempt.value++;
  else {
    failed.value = true;
    emit("missing");
  }
}
</script>

<template>
  <slot v-if="failed" name="fallback" />
  <!-- loading must come before src: Vue sets attributes in order, and an image with a src starts fetching. -->
  <img
    v-else
    loading="lazy"
    decoding="async"
    :src="src"
    :alt="alt"
    :style="loaded ? undefined : { visibility: 'hidden' }"
    @load="loaded = true"
    @error="next"
  />
</template>
