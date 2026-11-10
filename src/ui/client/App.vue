<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { mountStage } from "../../stage";
import LegacyPanel from "./LegacyPanel.vue";
import ICLog from "./ICLog.vue";
import ICControls from "./ICControls.vue";
import TabOrderSettings from "./TabOrderSettings.vue";
import { orderTabs, type TabId } from "./tabs";
import { settings } from "../../core/settings";
import { client } from "../../client";
import { draft, sendIC } from "../../core/commands";
import { parsePairedCharID } from "../../utils/pairCharID";
import { getPairOrder } from "../../dom/pairOrder";
import OOCChat from "./OOCChat.vue";

type Tab = TabId;

// Landscape: stage and controls beside the chat column. Portrait: stage, message bar, tabs.
const landscapeQuery = window.matchMedia("(orientation: landscape)");
const isLandscape = ref(landscapeQuery.matches);
const onWidth = (e: MediaQueryListEvent) => {
  isLandscape.value = e.matches;
  if (e.matches && tab.value === "emotes") tab.value = "log";
};

const tab = ref<Tab>("log");
const tabs = computed(() => orderTabs(settings.tabOrder));
// Legacy panels fill in during their own mount; teleport into them only after that.
const legacyReady = ref(false);

const legacyNumber = (id: string) =>
  Number((document.getElementById(id) as HTMLInputElement | null)?.value) || 0;

/** Evidence and pairing still live in legacy panels; copy them into the draft, then send. */
function sendMessage() {
  draft.evidence = client.evidence;
  const partner = document.getElementById("pair_select") as HTMLSelectElement | null;
  draft.pair = {
    charId: parsePairedCharID(partner?.value ?? ""),
    order: getPairOrder(),
    offset: { x: legacyNumber("pair_offset"), y: legacyNumber("pair_y_offset") },
  };
  sendIC();
}
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
  legacyReady.value = true;
  landscapeQuery.addEventListener("change", onWidth);
});
onUnmounted(() => landscapeQuery.removeEventListener("change", onWidth));
</script>

<template>
  <div class="shell" :class="isLandscape ? 'landscape' : 'portrait'">
    <section class="main">
      <div class="stage-frame">
        <div ref="stageHost" class="legacy stage"></div>
      </div>
      <form class="ic-input" @submit.prevent="sendMessage">
        <input
          id="client_inputbox"
          v-model="draft.message"
          class="input"
          type="text"
          placeholder="Say something in character…"
          aria-label="IC message"
          autocomplete="off"
          enterkeyhint="send"
        />
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
      <div v-show="isLandscape" id="controls-landscape" class="controls"></div>
    </section>

    <section class="side">
      <nav class="tabs" role="tablist">
        <button
          v-for="t in tabs"
          v-show="!(t.portraitOnly && isLandscape)"
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
        <div v-show="tab === 'emotes'" id="controls-portrait" class="panel"></div>
        <OOCChat v-show="tab === 'ooc'" ref="oocChat" class="panel" />
        <LegacyPanel v-show="tab === 'music'" template="music" class="panel" />
        <LegacyPanel v-show="tab === 'players'" template="players" class="panel" />
        <LegacyPanel v-show="tab === 'menu'" template="mainmenu" class="panel" />
      </div>
    </section>

    <Teleport v-if="legacyReady" to="#content_3">
      <TabOrderSettings />
    </Teleport>

    <Teleport defer :to="isLandscape ? '#controls-landscape' : '#controls-portrait'">
      <ICControls />
    </Teleport>
  </div>
</template>

<style scoped>
.shell {
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
}

.landscape {
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(340px, 32vw, 480px);
}

.portrait {
  display: flex;
  flex-direction: column;
}

.main {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.landscape .main {
  border-right: 1px solid var(--border);
}

.stage-frame {
  flex: none;
  width: 100%;
  margin: 0 auto;
  background: #000;
}

/* The full courtroom view is three screens wide and pans inside the frame. */
.stage {
  position: relative;
  overflow: hidden;
}

/* Leave room for the message bar and a panel. */
.portrait .stage-frame {
  max-width: calc(55dvh * 4 / 3);
}

/* Keep the 4:3 stage from pushing the controls off screen: tall screens keep
   260px for them, short ones (landscape phones) give the stage 60%. The
   message bar matches the stage's width. */
.landscape .stage-frame,
.landscape .ic-input {
  width: 100%;
  max-width: calc(min(100dvh - 120px, max(60dvh, 100dvh - 260px)) * 4 / 3);
  margin: 0 auto;
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

.portrait .side {
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
  display: flex;
  gap: 6px;
  padding: 6px;
  background: var(--surface);
}

.ic-input .input {
  flex: 1;
  min-width: 0;
  min-height: 40px;
}

.ic-input .btn {
  min-height: 40px;
}
</style>
