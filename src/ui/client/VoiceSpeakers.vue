<script setup lang="ts">
import { voiceUi } from "../../voice/voiceUI";
</script>

<template>
  <ul v-if="voiceUi.speakers.length" class="speakers" aria-live="polite" aria-label="Speaking in voice chat">
    <li v-for="s in voiceUi.speakers" :key="`${s.self}:${s.uid}`" :class="{ self: s.self }">
      <span class="dot" aria-hidden="true"></span>
      <span class="name">{{ s.label }}</span>
    </li>
  </ul>
</template>

<style scoped>
.speakers {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  max-width: 45%;
  margin: 0;
  padding: 0;
  list-style: none;
  pointer-events: none;
}

li {
  display: flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgb(14 16 22 / 0.8);
  color: #fff;
  font-size: 12px;
  animation: fade-in 120ms ease-out;
}

.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ok);
  animation: pulse 1.1s ease-in-out infinite;
}

.self .dot {
  background: var(--accent);
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes pulse {
  50% {
    opacity: 0.5;
    transform: scale(1.3);
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .dot,
  li {
    animation: none;
  }
}
</style>
