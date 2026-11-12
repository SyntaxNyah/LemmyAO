<script setup lang="ts">
import { ref } from "vue";
import { state } from "../../core/state";
import { sendOOC } from "../../core/commands";
import { exportLog } from "../../dom/exportLog";
import LinkifiedText from "../components/LinkifiedText.vue";
import { useStickyScroll } from "./useStickyScroll";

const { el, onScroll, onVisible } = useStickyScroll(() => state.oocLog.at(-1));
defineExpose({ onVisible });

const message = ref("");

const LOCAL_COMMANDS: Record<string, () => void> = { "/save_chatlog": () => exportLog("txt") };

function send() {
  const text = message.value.trim();
  if (!text) return;
  const local = LOCAL_COMMANDS[text.toLowerCase()];
  if (local) local();
  else sendOOC(text);
  message.value = "";
}
</script>

<template>
  <div class="ooc">
    <div ref="el" class="log" role="log" aria-label="Out-of-character chat" @scroll="onScroll">
      <p v-if="!state.oocLog.length" class="empty">Server messages and OOC chat appear here.</p>
      <div v-for="(e, i) in state.oocLog" :key="i" class="entry" :class="e.kind">
        <template v-if="e.kind === 'chat'">
          <span class="name" :class="{ server: e.fromServer }">{{ `${e.name}: ` }}</span>
          <LinkifiedText class="text" :text="e.message" />
        </template>
        <template v-else-if="e.kind === 'modcall'">
          <span class="label">Mod call</span>
          <LinkifiedText class="text" :text="e.message" />
        </template>
        <template v-else>
          <span class="label">Case</span>
          <span class="text">
            <LinkifiedText :text="e.message" />
            <template v-if="e.roles.length"> · looking for {{ e.roles.join(", ") }}</template>
          </span>
        </template>
      </div>
    </div>
    <form class="composer" @submit.prevent="send">
      <input
        v-model="message"
        class="input"
        placeholder="Say something out of character…"
        aria-label="OOC message"
        autocomplete="off"
        enterkeyhint="send"
      />
      <button class="btn btn-primary send" type="submit" aria-label="Send" title="Send">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.1 15 12 3.4 13.9Z" fill="currentColor" />
        </svg>
      </button>
    </form>
  </div>
</template>

<style scoped>
.ooc {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.log {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 0;
  overflow-wrap: anywhere;
}

.empty {
  margin: 24px 16px;
  color: var(--text-muted);
  text-align: center;
}

.entry {
  padding: 3px 14px;
}

.entry:hover {
  background: var(--surface-hover);
}

.name {
  font-weight: 600;
}

.name.server {
  color: var(--accent);
}

.label {
  margin-right: 8px;
  padding: 0 6px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 600;
}

.modcall {
  background: color-mix(in srgb, var(--danger) 12%, transparent);
}

.modcall .label {
  background: var(--danger);
  color: var(--bg);
}

.case .label {
  background: var(--warn);
  color: var(--bg);
}

.composer {
  flex: none;
  display: flex;
  gap: 8px;
  padding: 8px 8px max(8px, env(safe-area-inset-bottom));
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.composer .input {
  flex: 1;
  min-width: 0;
}

.send {
  width: 44px;
  min-height: 40px;
  padding: 0;
}
</style>
