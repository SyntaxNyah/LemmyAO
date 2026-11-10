<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { state } from "../../core/state";

const ok = ref<HTMLButtonElement>();
watch(
  () => state.alerts.length,
  async (count, before) => {
    if (count <= before) return;
    await nextTick();
    ok.value?.focus();
  },
);
</script>

<template>
  <div v-if="state.alerts.length" class="overlay" role="alertdialog" aria-labelledby="server-alert-title" aria-describedby="server-alert-message">
    <div class="card" @keydown.esc="state.alerts.shift()">
      <strong id="server-alert-title" class="title">Message from the server</strong>
      <p id="server-alert-message" class="message">{{ state.alerts[0] }}</p>
      <button ref="ok" class="btn btn-primary" @click="state.alerts.shift()">
        OK<template v-if="state.alerts.length > 1"> ({{ state.alerts.length - 1 }} more)</template>
      </button>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  padding: 16px;
  background: color-mix(in srgb, var(--bg) 70%, transparent);
  backdrop-filter: blur(4px);
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: min(420px, 100%);
  max-height: 80dvh;
  padding: 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: center;
}

.title {
  font-size: 17px;
}

.message {
  margin: 0;
  overflow-y: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.btn {
  min-width: 120px;
}
</style>
