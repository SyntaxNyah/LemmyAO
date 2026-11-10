<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { mountStage } from "../../stage";
import LegacyPanel from "./LegacyPanel.vue";
import ICLog from "./ICLog.vue";
import OOCChat from "./OOCChat.vue";

type Tab = "log" | "ooc" | "emotes" | "music" | "players" | "menu";

const TABS: { id: Tab; label: string; mobileOnly?: boolean }[] = [
  { id: "log", label: "Log" },
  { id: "emotes", label: "Emotes", mobileOnly: true },
  { id: "ooc", label: "OOC" },
  { id: "music", label: "Music" },
  { id: "players", label: "Players" },
  { id: "menu", label: "Menu" },
];

const wide = window.matchMedia("(min-width: 900px)");
const isDesktop = ref(wide.matches);
const onWidth = (e: MediaQueryListEvent) => {
  isDesktop.value = e.matches;
  if (e.matches && tab.value === "emotes") tab.value = "log";
};

const tab = ref<Tab>("log");
const stageHost = ref<HTMLElement>();
const icLog = ref<InstanceType<typeof ICLog>>();
const oocChat = ref<InstanceType<typeof OOCChat>>();

watch(tab, async (t) => {
  await nextTick();
  if (t === "log") icLog.value?.onVisible();
  if (t === "ooc") oocChat.value?.onVisible();
});

onMounted(() => {
  mountStage(stageHost.value!);
  wide.addEventListener("change", onWidth);
});
onUnmounted(() => wide.removeEventListener("change", onWidth));
</script>

<template>
  <div class="shell" :class="isDesktop ? 'desktop' : 'mobile'">
    <section class="main">
      <div class="stage-frame">
        <div ref="stageHost" class="legacy stage"></div>
        <form class="ic-input" data-action="preventDefault" data-event="submit">
          <input
            id="client_inputbox"
            class="input"
            type="text"
            data-action="onICEnter"
            data-event="keypress"
            placeholder="Say something in character…"
            aria-label="IC message"
            autocomplete="off"
            enterkeyhint="send"
          />
        </form>
        <div id="client_bars" class="legacy">
          <span id="client_defense_hp" class="health-box"><div class="health-bar"></div></span>
          <span id="client_prosecutor_hp" class="health-box"><div class="health-bar"></div></span>
        </div>
      </div>
      <div v-show="isDesktop" id="controls-desktop" class="controls"></div>
    </section>

    <section class="side">
      <nav class="tabs" role="tablist">
        <button
          v-for="t in TABS"
          v-show="!(t.mobileOnly && isDesktop)"
          :key="t.id"
          role="tab"
          :aria-selected="tab === t.id"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </nav>

      <div class="panels">
        <ICLog v-show="tab === 'log'" ref="icLog" class="panel" />
        <div v-show="tab === 'emotes'" id="controls-mobile" class="panel"></div>
        <OOCChat v-show="tab === 'ooc'" ref="oocChat" class="panel" />
        <LegacyPanel v-show="tab === 'music'" template="music" class="panel" />
        <LegacyPanel v-show="tab === 'players'" template="players" class="panel" />
        <LegacyPanel v-show="tab === 'menu'" template="mainmenu" class="panel" />
      </div>
    </section>

    <Teleport defer :to="isDesktop ? '#controls-desktop' : '#controls-mobile'">
      <LegacyPanel template="icoptions" class="icoptions" />
    </Teleport>
  </div>
</template>

<style scoped>
.shell {
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
}

.desktop {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(340px, 32vw, 480px);
}

.mobile {
  display: flex;
  flex-direction: column;
}

.main {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.desktop .main {
  border-right: 1px solid var(--border);
}

.stage-frame {
  flex: none;
  width: 100%;
  margin: 0 auto;
  background: #000;
}

/* Keep the 4:3 stage from pushing the controls off a short desktop screen. */
.desktop .stage-frame {
  max-width: calc((100dvh - 260px) * 4 / 3);
}

.controls {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.side {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.mobile .side {
  flex: 1;
}

.tabs {
  flex: none;
  display: flex;
  gap: 2px;
  padding: 6px 8px 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  scrollbar-width: none;
}

.tabs button {
  flex: none;
  padding: 8px 12px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
}

.tabs button[aria-selected="true"] {
  border-bottom-color: var(--accent);
  color: var(--text);
}

.panels {
  flex: 1;
  min-height: 0;
  position: relative;
}

.panel {
  position: absolute;
  inset: 0;
  overflow-y: auto;
}

.ic-input {
  padding: 6px;
  background: var(--surface);
}

.ic-input .input {
  min-height: 40px;
}
</style>
