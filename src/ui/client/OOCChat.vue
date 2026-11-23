<script setup lang="ts">
import { computed, ref } from "vue";
import { state } from "../../core/state";
import { settings, setSetting } from "../../core/settings";
import { sendOOC } from "../../core/commands";
import { exportLog } from "../../dom/exportLog";
import LinkifiedText from "../components/LinkifiedText.vue";
import { useStickyScroll } from "./useStickyScroll";

const { el, onScroll, onVisible } = useStickyScroll(() => state.oocLog.at(-1));
defineExpose({ onVisible });

const message = ref("");

const nameOpen = ref(false);
const customName = computed({
  get: () => settings.customOocName,
  set: (value) => setSetting("customOocName", value),
});

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
    <div class="composer-wrap">
      <div v-if="nameOpen" id="ooc-name-row" class="name-row">
        <label class="name-label" for="ooc-name-input">OOC name</label>
        <input
          id="ooc-name-input"
          v-model="customName"
          class="input"
          type="text"
          placeholder="Uses your character name"
          aria-label="Custom OOC name"
          autocomplete="off"
          maxlength="30"
          enterkeyhint="done"
          @keydown.esc="nameOpen = false"
        />
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
        <button
          class="name-toggle"
          type="button"
          :aria-expanded="nameOpen"
          aria-controls="ooc-name-row"
          aria-label="Change OOC name"
          title="Change OOC name"
          @click="nameOpen = !nameOpen"
        >
          <!-- Notes icon from https://www.svgrepo.com/svg/540071/notes -->
          <svg class="notes" viewBox="0 0 1024 1024" aria-hidden="true">
            <path d="M147.7632 767.488a51.2 51.2 0 0 0 8.3456-0.7168l148.992-25.6a78.6944 78.6944 0 0 0 42.4448-22.016l426.8032-426.8032a79.0528 79.0528 0 0 0 0-111.872L686.08 92.16a79.0528 79.0528 0 0 0-111.872 0l-426.5984 426.8032a78.3872 78.3872 0 0 0-22.016 42.4448l-25.856 148.992a48.7936 48.7936 0 0 0 48.0256 57.088z m470.0672-631.8592a17.7152 17.7152 0 0 1 25.0368 0l88.0128 88.0128a17.7152 17.7152 0 0 1 0 25.0368l-394.7008 394.7008-113.0496-113.0496z m-432.9472 443.3408l102.4 102.4-124.2112 21.504zM457.7792 698.9824a30.72 30.72 0 0 0 30.72 30.72h330.0864a30.72 30.72 0 0 0 0-61.44H488.4992a30.72 30.72 0 0 0-30.72 30.72zM928 849.0496H99.6352a30.72 30.72 0 0 0 0 61.44h828.3648a30.72 30.72 0 0 0 0-61.44z" fill="currentColor" />
          </svg>
          <svg class="chevron" :class="{ open: nameOpen }" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button class="btn btn-primary send" type="submit" aria-label="Send" title="Send">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.1 15 12 3.4 13.9Z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
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

.composer-wrap {
  flex: none;
  border-top: 1px solid var(--border);
  background: var(--surface);
}

.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-bottom: 1px solid var(--border);
}

.name-label {
  flex: none;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.name-row .input {
  flex: 1;
  min-width: 0;
}

.composer {
  flex: none;
  display: flex;
  gap: 8px;
  padding: 8px 8px max(8px, env(safe-area-inset-bottom));
}

.name-toggle {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 52px;
  min-height: 40px;
  padding: 0 4px;
  border: 0;
  border-radius: var(--radius-sm);
  background: none;
  color: var(--text-muted);
  cursor: pointer;
}

.name-toggle:hover {
  background: var(--surface-hover);
  color: var(--text);
}

.name-toggle:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.notes {
  width: 16px;
  height: 16px;
}

.chevron {
  width: 14px;
  height: 14px;
  transition: transform 0.15s;
}

.chevron.open {
  transform: rotate(180deg);
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
