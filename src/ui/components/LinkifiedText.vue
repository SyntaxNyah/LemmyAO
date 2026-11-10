<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ text: string }>();

const URL_PATTERN = /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]])/g;

const parts = computed(() =>
  props.text.split(URL_PATTERN).map((value, i) => ({ value, isLink: i % 2 === 1 })),
);
</script>

<template>
  <span class="linkified">
    <template v-for="(part, i) in parts" :key="i">
      <a v-if="part.isLink" :href="part.value" target="_blank" rel="noopener noreferrer">{{ part.value }}</a>
      <template v-else>{{ part.value }}</template>
    </template>
  </span>
</template>

<style scoped>
.linkified {
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
