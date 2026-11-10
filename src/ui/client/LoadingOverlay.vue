<script setup lang="ts">
import { computed } from "vue";
import { state } from "../../core/state";

const serverName = document.title;

const step = computed(() => {
  if (state.connection.status !== "handshaking") return "Connecting…";
  const { charCount } = state.server;
  const loaded = state.characters.filter(Boolean).length;
  if (charCount && loaded < charCount) return `Loading characters (${loaded}/${charCount})…`;
  return "Joining…";
});

// From page load until joined; a failed connection shows the error overlay instead.
const visible = computed(() => ["idle", "connecting", "handshaking"].includes(state.connection.status));
</script>

<template>
  <div v-if="visible" class="overlay" role="status" aria-live="polite">
    <div class="card">
      <div class="spinner" aria-hidden="true"></div>
      <strong class="server">{{ serverName }}</strong>
      <span class="step">{{ step }}</span>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 16px;
  background: color-mix(in srgb, var(--bg) 88%, transparent);
  backdrop-filter: blur(6px);
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-width: min(320px, 100%);
  padding: 28px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: center;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--surface-2);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.server {
  font-size: 17px;
  overflow-wrap: anywhere;
}

.step {
  color: var(--text-muted);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation-duration: 2.4s;
  }
}
</style>
