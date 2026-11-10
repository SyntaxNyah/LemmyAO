<script setup lang="ts">
import { ref, watch } from "vue";

// Evidence images carry their own extension; hide until loaded so a missing
// file never shows the broken-image icon.
const props = defineProps<{ src: string; alt: string }>();
const loaded = ref(false);
const failed = ref(false);
watch(
  () => props.src,
  () => {
    loaded.value = false;
    failed.value = false;
  },
);
</script>

<template>
  <img
    v-if="!failed"
    loading="lazy"
    :src="src"
    :alt="alt"
    :style="loaded ? undefined : { visibility: 'hidden' }"
    @load="loaded = true"
    @error="failed = true"
  />
</template>
