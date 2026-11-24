<script setup lang="ts">
defineProps<{ direction: "left" | "right" }>();
</script>

<template>
  <!-- Carets from SVG Repo, supplied for the position preview. -->
  <svg class="caret" viewBox="0 0 1024 1024" aria-hidden="true">
    <path
      v-if="direction === 'left'"
      d="M689 165.1L308.2 493.5c-10.9 9.4-10.9 27.5 0 37L689 858.9c14.2 12.2 35 1.2 35-18.5V183.6c0-19.7-20.8-30.7-35-18.5z"
      fill="currentColor"
    />
    <path
      v-else
      d="M715.8 493.5L335 165.1c-14.2-12.2-35-1.2-35 18.5v656.8c0 19.7 20.8 30.7 35 18.5l380.8-328.4c10.9-9.4 10.9-27.6 0-37z"
      fill="currentColor"
    />
  </svg>
</template>

<style scoped>
.caret {
  display: block;
  width: 1em;
  height: 1em;
}
</style>