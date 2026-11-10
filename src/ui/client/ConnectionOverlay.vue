<script setup lang="ts">
import { computed } from "vue";
import { state } from "../../core/state";
import { reconnect } from "../../client/reconnect";
import queryParser from "../../utils/queryParser";

const replay = queryParser().mode === "replay";

const message = computed(() => {
  const { removal, wasJoined } = state.connection;
  if (replay) return { title: "Replay mode is unavailable for now.", reason: "", retry: false };
  if (removal) {
    return { title: removal.kind === "kicked" ? "You were kicked" : "You are banned", reason: removal.reason, retry: removal.kind === "kicked" };
  }
  return {
    title: wasJoined ? "You were disconnected from the server." : "Could not connect to the server.",
    reason: "",
    retry: true,
  };
});
</script>

<template>
  <div v-if="state.connection.status === 'disconnected'" class="overlay" role="alertdialog" aria-labelledby="connection-title">
    <div class="card">
      <svg class="icon" viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
        <path d="M12 3 22 20H2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
        <path d="M12 10v4.5M12 17v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <strong id="connection-title" class="title">{{ message.title }}</strong>
      <p v-if="message.reason" class="reason">{{ message.reason }}</p>
      <span v-if="!replay && !state.connection.removal && state.connection.closeCode" class="code">
        Code {{ state.connection.closeCode }}
      </span>
      <div class="buttons">
        <button v-if="message.retry" class="btn btn-primary" @click="reconnect">Reconnect</button>
        <a class="btn" href="index.html">Server list</a>
      </div>
      <p v-if="!state.connection.removal" class="help">
        Having trouble? <a href="https://discord.gg/9rYQVVQ" target="_blank" rel="noopener">Join us on Discord</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: grid;
  place-items: center;
  padding: 16px;
  background: color-mix(in srgb, var(--bg) 80%, transparent);
  backdrop-filter: blur(6px);
}

.card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: min(380px, 100%);
  padding: 28px 24px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
  text-align: center;
}

.icon {
  color: var(--danger);
}

.title {
  font-size: 17px;
}

.reason {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.code,
.help {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.help a {
  color: var(--accent);
}

.buttons {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
}

.buttons .btn {
  min-width: 120px;
  text-decoration: none;
}
</style>
