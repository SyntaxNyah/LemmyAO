<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  clientUrl,
  directory,
  fetchMasterVersion,
  parseDirectConnect,
  refreshDirectory,
  transportFor,
} from "../../core/directory";
import { settings, setSetting } from "../../core/settings";
import { version } from "../../version";
import ServerRow from "./ServerRow.vue";
import { applyUpdate, dismissIosHint, install, installable, iosInstallSteps, showIosHint, updateReady } from "../pwa";

const page = location.href;
const query = ref("");
const tab = ref<"all" | "favourites">("all");
const direct = ref("");
const directError = ref("");

const favourites = computed(() => new Set(settings.favouriteServers));

function toggleFavourite(id: string) {
  const next = new Set(favourites.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  setSetting("favouriteServers", [...next]);
}

const visible = computed(() => {
  const q = query.value.trim().toLowerCase();
  return directory.servers.filter(
    (s) =>
      (tab.value === "all" || favourites.value.has(s.id)) &&
      (!q || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)),
  );
});
const reachable = computed(() => visible.value.filter((s) => transportFor(s, location.protocol)));
const desktopOnly = computed(() => visible.value.filter((s) => !transportFor(s, location.protocol)));
const playerTotal = computed(() => directory.servers.reduce((n, s) => n + s.players, 0));

function connectDirect() {
  const socket = parseDirectConnect(direct.value, location.protocol);
  if (!socket) {
    directError.value = "Enter host:port, or a ws:// or wss:// address.";
    return;
  }
  directError.value = "";
  location.href = clientUrl(socket, { page });
}

onMounted(() => {
  refreshDirectory();
  fetchMasterVersion();
});
</script>

<template>
  <main class="page">
    <div class="toolbar">
      <div class="tabs" role="tablist">
        <button role="tab" :aria-selected="tab === 'all'" @click="tab = 'all'">All</button>
        <button role="tab" :aria-selected="tab === 'favourites'" @click="tab = 'favourites'">
          Favorites
          <span v-if="favourites.size" class="count">{{ favourites.size }}</span>
        </button>
      </div>
      <input v-model="query" class="input search" type="search" placeholder="Search servers" aria-label="Search servers" />
      <button class="btn btn-ghost" :disabled="directory.loading" title="Refresh" @click="refreshDirectory()">
        {{ directory.loading ? "Loading…" : "Refresh" }}
      </button>
    </div>

    <p v-if="directory.fromCache" class="notice" role="status">
      Couldn't reach the master server. Showing the list from your last visit.
    </p>

    <ul v-if="reachable.length" class="card list">
      <ServerRow
        v-for="server in reachable"
        :key="server.id"
        :server="server"
        :favourite="favourites.has(server.id)"
        @toggle-favourite="toggleFavourite(server.id)"
      />
    </ul>
    <p v-else-if="!directory.loading" class="empty muted">
      {{ tab === "favourites" && !query ? "Star a server to keep it here." : "No servers match." }}
    </p>

    <details v-if="desktopOnly.length" class="desktop-only">
      <summary>{{ desktopOnly.length }} more need the desktop client</summary>
      <ul class="card list">
        <ServerRow
          v-for="server in desktopOnly"
          :key="server.id"
          :server="server"
          :favourite="favourites.has(server.id)"
          @toggle-favourite="toggleFavourite(server.id)"
        />
      </ul>
    </details>

    <form class="direct card" @submit.prevent="connectDirect">
      <label for="direct">Direct connect</label>
      <div class="direct-row">
        <input
          id="direct"
          v-model="direct"
          class="input"
          placeholder="host:port or wss://host:port"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
        />
        <button class="btn btn-primary" type="submit">Connect</button>
      </div>
      <p v-if="directError" class="error" role="alert">{{ directError }}</p>
    </form>

    <div v-if="updateReady" class="app card" role="status">
      <span>A new version of LemmyAO is ready.</span>
      <button class="btn btn-primary" @click="applyUpdate">Reload</button>
    </div>
    <div v-else-if="installable" class="app card">
      <span>Install LemmyAO for a home screen icon and a full-screen window.</span>
      <button class="btn btn-primary" @click="install">Install</button>
    </div>
    <div v-else-if="showIosHint" class="app card">
      <span>Install LemmyAO for a home screen icon and a full-screen window. {{ iosInstallSteps }}</span>
      <button class="btn" @click="dismissIosHint">Dismiss</button>
    </div>

    <footer class="footer muted">
      <span>{{ directory.servers.length }} servers · {{ playerTotal }} players online</span>
      <nav class="links">
        <a href="https://aceattorneyonline.com/download.html">Download</a>
        <a href="https://aceattorneyonline.com/support.html">Help</a>
        <a href="https://discord.gg/wWvQ3pw">Discord</a>
        <a href="https://servers.aceattorneyonline.com/privacy">Privacy</a>
      </nav>
      <span>
        LemmyAO {{ version }}<template v-if="directory.masterVersion"> · master server {{ directory.masterVersion }}</template>
      </span>
    </footer>
  </main>
</template>

<style scoped>

.page {
  max-width: 920px;
  margin: 0 auto;
  padding: max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
}

.card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.direct {
  padding: 14px 16px;
  margin-top: 24px;
}

.direct label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
}

.direct-row {
  display: flex;
  gap: 8px;
}

.error {
  margin: 8px 0 0;
  color: var(--danger);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.tabs {
  display: flex;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

.tabs button {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 12px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--text-muted);
  font: inherit;
  cursor: pointer;
}

.tabs button[aria-selected="true"] {
  background: var(--surface-2);
  color: var(--text);
}

.count {
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-hover);
  font-size: 12px;
}

.search {
  flex: 1;
}

.notice {
  margin: 0 0 12px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--warn) 40%, transparent);
  border-radius: var(--radius-sm);
  color: var(--warn);
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
  overflow: hidden;
}

.empty {
  padding: 32px 0;
  text-align: center;
}

.desktop-only {
  margin-top: 20px;
}

.desktop-only summary {
  margin-bottom: 10px;
  color: var(--text-muted);
  cursor: pointer;
}

.app {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px 16px;
  margin-top: 16px;
  padding: 12px 16px;
}

.footer {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin-top: 32px;
  font-size: 13px;
}

.footer a {
  color: inherit;
}

.links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}

@media (max-width: 560px) {

  .toolbar {
    flex-wrap: wrap;
  }

  .search {
    order: 3;
    flex-basis: 100%;
  }
}
</style>
