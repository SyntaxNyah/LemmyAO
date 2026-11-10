<script setup lang="ts">
import { computed, ref, watch } from "vue";

// Asset hosts ship either format; try each before giving up.
const props = withDefaults(defineProps<{ base: string; alt: string; extensions?: string[] }>(), {
  extensions: () => [".png", ".webp"],
});
const emit = defineEmits<{ missing: [] }>();

const attempt = ref(0);
watch(
  () => props.base,
  () => (attempt.value = 0),
);
const src = computed(() => `${props.base}${props.extensions[attempt.value]}`);

function next() {
  if (attempt.value < props.extensions.length - 1) attempt.value++;
  else emit("missing");
}
</script>

<template>
  <img :src="src" :alt="alt" loading="lazy" decoding="async" @error="next" />
</template>
