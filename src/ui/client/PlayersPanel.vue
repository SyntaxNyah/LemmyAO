<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { state, type Player } from "../../core/state";
import { pairWith, removePlayer } from "../../core/commands";
import { characterFolder } from "../../core/character";
import { pairMentions } from "../../core/log";
import { getLocalPlayerID, getSpeakingUids, isLocalSpeaking, isVoiceAvailable, onSpeakingChange } from "../../voice/voice";
import AssetImage from "./AssetImage.vue";

const allAreas = ref(false);
const missingIcons = ref(new Set<number>());

const players = computed(() =>
  Object.values(state.players)
    .filter((p) => allAreas.value || p.area === state.self.areaId)
    .sort((a, b) => a.id - b.id),
);
const elsewhere = computed(() => Object.keys(state.players).length - players.value.length);

const displayName = (p: Player) => p.showName || p.charName || p.name || `Player ${p.id}`;
const areaName = (p: Player) => state.areas[p.area]?.name ?? `Area ${p.area}`;

// Voice chat reports speakers through a callback; mirror it reactively.
const speaking = ref(new Set<number>());
const readSpeaking = (): void => {
  if (!isVoiceAvailable()) {
    speaking.value = new Set();
    return;
  }
  const ids = new Set(getSpeakingUids());
  if (isLocalSpeaking()) ids.add(getLocalPlayerID());
  speaking.value = ids;
};
const stopSpeaking = onSpeakingChange(readSpeaking);
onUnmounted(stopSpeaking);

// Briefly highlight players an OOC message mentions pairing with.
const flashing = ref(new Set<number>());
watch(
  () => state.oocLog.length,
  () => {
    const last = state.oocLog.at(-1);
    const ids = last?.kind === "chat" ? pairMentions(last.message) : null;
    if (!ids?.length) return;
    flashing.value = new Set(ids);
    setTimeout(() => (flashing.value = new Set()), 2200);
  },
);

// Moderation: one open form at a time, instead of browser prompts.
const moderating = ref<{ id: number; ban: boolean } | null>(null);
const reason = ref("");
const minutes = ref(60);

function openModeration(id: number, ban: boolean) {
  moderating.value = { id, ban };
  reason.value = "";
}

function confirmModeration() {
  const m = moderating.value;
  if (!m) return;
  removePlayer(m.id, reason.value.trim(), m.ban ? Math.max(1, minutes.value) : 0);
  moderating.value = null;
}
</script>

<template>
  <div class="players">
    <div class="head">
      <span class="muted">
        {{ players.length }} {{ allAreas ? "online" : "here" }}<template v-if="!allAreas && elsewhere">
          · {{ elsewhere }} elsewhere</template
        >
      </span>
      <label class="check"><input v-model="allAreas" type="checkbox" /> All areas</label>
    </div>

    <p v-if="!players.length" class="empty">Nobody else is here.</p>

    <ul>
      <li
        v-for="p in players"
        :key="p.id"
        class="player"
        :class="{ you: p.id === state.server.playerId, speaking: speaking.has(p.id), flash: flashing.has(p.id) }"
      >
        <div class="row">
          <span class="avatar">
            <AssetImage
              v-if="p.charName && !missingIcons.has(p.id)"
              :base="`${characterFolder(p.charName)}char_icon`"
              alt=""
              @missing="missingIcons = new Set(missingIcons).add(p.id)"
            />
            <span v-else class="initial" aria-hidden="true">{{ displayName(p)[0]?.toUpperCase() }}</span>
          </span>
          <span class="who">
            <span class="name">
              {{ displayName(p) }}
              <span v-if="p.id === state.server.playerId" class="tag">You</span>
              <span v-if="speaking.has(p.id)" class="tag talking">Talking</span>
            </span>
            <span class="detail">
              <span class="id">[{{ p.id }}]</span>
              <template v-if="p.charName && p.charName !== displayName(p)"> {{ p.charName }}</template>
              <template v-if="p.name"> · {{ p.name }}</template>
              <template v-if="allAreas"> · {{ areaName(p) }}</template>
            </span>
          </span>
          <span v-if="p.id !== state.server.playerId" class="actions">
            <button class="btn" @click="pairWith(p.id)">Pair</button>
            <template v-if="state.self.moderator">
              <button class="btn" @click="openModeration(p.id, false)">Kick</button>
              <button class="btn danger" @click="openModeration(p.id, true)">Ban</button>
            </template>
          </span>
        </div>

        <form v-if="moderating?.id === p.id" class="moderate" @submit.prevent="confirmModeration">
          <input v-model="reason" class="input" :placeholder="moderating.ban ? 'Ban reason' : 'Kick reason'" required />
          <label v-if="moderating.ban" class="minutes">
            <input v-model.number="minutes" class="input" type="number" min="1" aria-label="Ban length in minutes" />
            min
          </label>
          <button class="btn danger" type="submit">{{ moderating.ban ? "Ban" : "Kick" }}</button>
          <button class="btn" type="button" @click="moderating = null">Cancel</button>
        </form>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.players {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px max(32px, env(safe-area-inset-bottom));
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.empty {
  margin: 24px 0;
  color: var(--text-muted);
  text-align: center;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.player {
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  transition: background 0.3s;
}

.player.you {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
}

.player.speaking .avatar {
  box-shadow: 0 0 0 2px var(--ok);
}

.player.flash {
  background: color-mix(in srgb, var(--warn) 18%, var(--surface));
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  overflow: hidden;
  border-radius: 50%;
  background: var(--surface-2);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.initial {
  color: var(--text-muted);
  font-weight: 700;
}

.who {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.tag {
  margin-left: 6px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  vertical-align: 1px;
}

.tag.talking {
  background: color-mix(in srgb, var(--ok) 20%, transparent);
  color: var(--ok);
}

.detail {
  color: var(--text-muted);
  font-size: 12px;
  overflow-wrap: anywhere;
}

.id {
  font-variant-numeric: tabular-nums;
}

.actions {
  flex: none;
  display: flex;
  gap: 4px;
}

.danger {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  color: var(--danger);
}

.moderate {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.moderate > .input {
  flex: 1 1 160px;
}

.minutes {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
}

.minutes .input {
  width: 80px;
}
</style>
