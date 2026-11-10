<script setup lang="ts">
import { computed, ref } from "vue";
import { clientUrl, socketUrl, transportFor, type ServerEntry } from "../../core/directory";
import LinkifiedText from "../components/LinkifiedText.vue";

const props = defineProps<{ server: ServerEntry; favourite: boolean }>();
defineEmits<{ toggleFavourite: [] }>();

const open = ref(false);
const page = location.href;
const transport = computed(() => transportFor(props.server, location.protocol));
const socket = computed(() => (transport.value ? socketUrl(props.server, transport.value) : null));
const joinUrl = computed(() =>
  socket.value ? clientUrl(socket.value, { name: props.server.name, page }) : null,
);
const watchUrl = computed(() =>
  socket.value ? clientUrl(socket.value, { name: props.server.name, page, watch: true }) : null,
);
const detailsId = computed(() => `server-${props.server.id.replace(/[^a-z0-9]/gi, "-")}`);
</script>

<template>
  <li class="row" :class="{ open, unreachable: !transport }">
    <div class="head">
      <button
        class="star"
        :class="{ on: favourite }"
        :aria-pressed="favourite"
        :aria-label="favourite ? 'Remove from favorites' : 'Add to favorites'"
        @click="$emit('toggleFavourite')"
      >
        ★
      </button>
      <button class="title" :aria-expanded="open" :aria-controls="detailsId" @click="open = !open">
        <span class="name">{{ server.name }}</span>
        <span class="meta">
          <span class="players">{{ server.players }} online</span>
          <span v-if="server.wssPort" class="badge ok">Secure</span>
          <span v-else-if="server.wsPort" class="badge warn" title="Unencrypted connection">Insecure</span>
          <span v-else class="badge" title="Only the desktop client can join this server">Desktop only</span>
        </span>
      </button>
      <a v-if="joinUrl" class="btn btn-primary join" :href="joinUrl">Join</a>
    </div>
    <div v-show="open" :id="detailsId" class="details">
      <p v-if="server.description" class="description">
        <LinkifiedText :text="server.description" />
      </p>
      <p v-else class="muted">No description.</p>
      <div class="actions">
        <a v-if="watchUrl" class="btn" :href="watchUrl">Watch</a>
        <span class="muted address">{{ socket ?? `${server.host}:${server.tcpPort}` }}</span>
      </div>
    </div>
  </li>
</template>

<style scoped>
.row {
  border-bottom: 1px solid var(--border);
}

.row:last-child {
  border-bottom: 0;
}

.head {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px 6px 6px;
}

.row.unreachable .name {
  color: var(--text-muted);
}

.star {
  flex: none;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--border);
  font-size: 18px;
  cursor: pointer;
}

.star:hover {
  color: var(--text-muted);
}

.star.on {
  color: var(--warn);
}

.title {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 8px 6px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.title:hover {
  background: var(--surface-hover);
}

.name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 13px;
}

.badge {
  padding: 1px 8px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12px;
}

.badge.ok {
  border-color: color-mix(in srgb, var(--ok) 40%, transparent);
  color: var(--ok);
}

.badge.warn {
  border-color: color-mix(in srgb, var(--warn) 40%, transparent);
  color: var(--warn);
}

.join {
  flex: none;
  margin-left: 4px;
}

.details {
  padding: 0 16px 14px 48px;
}

.description {
  margin: 0 0 12px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.address {
  font-family: var(--font-mono);
  font-size: 12px;
  overflow-wrap: anywhere;
}

@media (max-width: 560px) {
  .title {
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
  }

  .name {
    white-space: normal;
  }

  .details {
    padding-left: 16px;
  }
}
</style>
