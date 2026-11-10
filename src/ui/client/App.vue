<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { mountStage } from "../../stage";
import LegacyPanel from "./LegacyPanel.vue";
import ICLog from "./ICLog.vue";
import ICControls from "./ICControls.vue";
import TabOrderSettings from "./TabOrderSettings.vue";
import { DEFAULT_TABS, orderTabs, type TabId } from "./tabs";
import { settings } from "../../core/settings";
import { client } from "../../client";
import { draft, sendIC } from "../../core/commands";
import { getPairOrder } from "../../dom/pairOrder";
import OOCChat from "./OOCChat.vue";

// Landscape: the stage with the first tab under it, beside a column for the
// other tabs. Portrait: the stage, the message bar, then every tab.
const landscapeQuery = window.matchMedia("(orientation: landscape)");
const isLandscape = ref(landscapeQuery.matches);
const onOrientation = (e: MediaQueryListEvent) => (isLandscape.value = e.matches);

const tabs = computed(() => orderTabs(settings.tabOrder));
const first = computed(() => tabs.value[0].id);
const stripTabs = computed(() => (isLandscape.value ? tabs.value.slice(1) : tabs.value));
const tab = ref<TabId>(isLandscape.value ? tabs.value[1].id : first.value);

// The first tab is already on screen in landscape; land on what was showing
// under the stage when turning to portrait, and off it when turning back.
watch([isLandscape, first], ([landscape]) => {
  if (!landscape) tab.value = first.value;
  else if (tab.value === first.value) tab.value = tabs.value[1].id;
});

const underStage = (id: TabId) => isLandscape.value && id === first.value;
const shown = (id: TabId) => underStage(id) || tab.value === id;

// Legacy panels fill in during their own mount; teleport into them only after that.
const legacyReady = ref(false);

/** Evidence and pair order still live in legacy code; copy them into the draft, then send. */
function sendMessage() {
  draft.evidence = client.evidence;
  draft.pair.order = getPairOrder();
  sendIC();
}

const stageHost = ref<HTMLElement>();
const scrollers: Partial<Record<TabId, { onVisible: () => void }>> = {};
const keepRef = (id: TabId) => (el: unknown) => {
  if (el) scrollers[id] = el as { onVisible: () => void };
};

// A log can't follow new entries while hidden, so let it catch up when shown.
watch([tab, isLandscape, first], async () => {
  await nextTick();
  for (const id of ["log", "ooc"] as const) if (shown(id)) scrollers[id]?.onVisible();
});

onMounted(() => {
  mountStage(stageHost.value!);
  legacyReady.value = true;
  landscapeQuery.addEventListener("change", onOrientation);
});
onUnmounted(() => landscapeQuery.removeEventListener("change", onOrientation));
</script>

<template>
  <div class="shell" :class="isLandscape ? 'landscape' : 'portrait'">
    <div class="stage-frame">
      <div ref="stageHost" class="legacy stage"></div>
    </div>

    <form class="ic-input" @submit.prevent="sendMessage">
      <input
        id="client_inputbox"
        v-model="draft.message"
        class="input"
        type="text"
        placeholder="Say something…"
        aria-label="IC message"
        autocomplete="off"
        enterkeyhint="send"
      />
      <button class="btn btn-primary send" type="submit" aria-label="Send" title="Send">
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path d="M3.4 20.4 21 12 3.4 3.6 3.4 10.1 15 12 3.4 13.9Z" fill="currentColor" />
        </svg>
      </button>
    </form>

    <nav class="tabs" role="tablist">
      <button
        v-for="t in stripTabs"
        :key="t.id"
        role="tab"
        :aria-selected="tab === t.id"
        @click="tab = t.id"
      >
        {{ t.label }}
      </button>
    </nav>

    <!-- Every panel stays mounted; in landscape the first tab moves to the area under the stage. -->
    <div
      v-for="t in DEFAULT_TABS"
      v-show="shown(t.id)"
      :key="t.id"
      class="panel"
      :class="underStage(t.id) ? 'in-under' : 'in-panels'"
      role="tabpanel"
      :aria-label="t.label"
    >
      <ICControls v-if="t.id === 'emotes'" />
      <ICLog v-else-if="t.id === 'log'" :ref="keepRef('log')" />
      <OOCChat v-else-if="t.id === 'ooc'" :ref="keepRef('ooc')" />
      <LegacyPanel v-else-if="t.id === 'music'" template="music" />
      <LegacyPanel v-else-if="t.id === 'players'" template="players" />
      <LegacyPanel v-else template="mainmenu" />
    </div>

    <Teleport v-if="legacyReady" to="#content_3">
      <TabOrderSettings />
    </Teleport>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  height: 100dvh;
  overflow: hidden;
  background: var(--bg);
}

.portrait {
  grid-template:
    "stage" auto
    "input" auto
    "tabs" auto
    "panels" 1fr
    / minmax(0, 1fr);
}

.landscape {
  grid-template:
    "stage tabs" auto
    "stage panels" auto
    "input panels" auto
    "under panels" 1fr
    / minmax(0, 1fr) clamp(340px, 32vw, 480px);
}

.stage-frame {
  grid-area: stage;
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
  max-width: calc(min(100dvh - 120px, max(60dvh, 100dvh - 260px)) * 4 / 3);
}

.ic-input {
  grid-area: input;
  display: flex;
  gap: 6px;
  width: 100%;
  margin: 0 auto;
  padding: 6px;
  background: var(--surface);
}

.ic-input .input {
  flex: 1;
  min-width: 0;
  min-height: 40px;
}

.ic-input .send {
  width: 44px;
  min-height: 40px;
  padding: 0;
}

.tabs {
  grid-area: tabs;
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

.landscape .tabs,
.landscape .in-panels {
  border-left: 1px solid var(--border);
}

.panel {
  min-height: 0;
  overflow-y: auto;
}

.in-panels {
  grid-area: panels;
}

.in-under {
  grid-area: under;
}

/* Legacy panels size their contents in percentages of this. */
.panel > * {
  height: 100%;
}
</style>
