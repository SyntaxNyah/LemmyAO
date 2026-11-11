<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { focusICInput } from "./focus";
import { mountViewport } from "../../viewport/mount";
import VoiceSpeakers from "./VoiceSpeakers.vue";
import ICLog from "./ICLog.vue";
import ICControls from "./ICControls.vue";
import SettingsPanel from "./SettingsPanel.vue";
import { DEFAULT_TABS, orderTabs, type TabId } from "./tabs";
import { settings } from "../../core/settings";
import { draft, sendIC } from "../../core/commands";
import { getPairOrder } from "../../dom/pairOrder";
import OOCChat from "./OOCChat.vue";
import BackgroundPanel from "./BackgroundPanel.vue";
import EvidencePanel from "./EvidencePanel.vue";
import { state } from "../../core/state";
import AreasPanel from "./AreasPanel.vue";
import MusicPanel from "./MusicPanel.vue";
import PlayersPanel from "./PlayersPanel.vue";
import OffsetGhost from "./OffsetGhost.vue";
import CharacterSelect from "./CharacterSelect.vue";
import LoadingOverlay from "./LoadingOverlay.vue";
import ConnectionOverlay from "./ConnectionOverlay.vue";
import ServerAlert from "./ServerAlert.vue";
import { offsetPreview } from "./offsetPreview";
import SeamKnob from "./SeamKnob.vue";
import { editingLayout, ratio } from "./layout";

// Landscape: the viewport with the first tab under it, beside a column for the
// other tabs. Portrait: the viewport, the message bar, then every tab.
const landscapeQuery = window.matchMedia("(orientation: landscape)");
const isLandscape = ref(landscapeQuery.matches);
const onOrientation = (e: MediaQueryListEvent) => (isLandscape.value = e.matches);

const tabs = computed(() => orderTabs(settings.tabOrder));
const first = computed(() => tabs.value[0].id);
const stripTabs = computed(() => (isLandscape.value ? tabs.value.slice(1) : tabs.value));
const tab = ref<TabId>(isLandscape.value ? tabs.value[1].id : first.value);

// The first tab is already on screen in landscape; land on what was showing
// under the viewport when turning to portrait, and off it when turning back.
watch([isLandscape, first], ([landscape]) => {
  if (!landscape) tab.value = first.value;
  else if (tab.value === first.value) tab.value = tabs.value[1].id;
});

const underStage = (id: TabId) => isLandscape.value && id === first.value;

// Ratios set in edit mode; without one, the CSS fallbacks keep the default layout.
const layoutVars = computed(() => {
  const vars: Record<string, string> = {};
  const sidebar = ratio("sidebar");
  const viewport = ratio(isLandscape.value ? "viewportLandscape" : "viewportPortrait");
  if (sidebar) vars["--sidebar"] = `${sidebar * 100}%`;
  if (viewport) vars["--viewport-height"] = `${viewport * 100}dvh`;
  return vars;
});
const shown = (id: TabId) => underStage(id) || tab.value === id;


/** Evidence and pair order still live in legacy code; copy them into the draft, then send. */
function sendMessage() {
  draft.pair.order = getPairOrder();
  sendIC();
}

const presenting = computed(() => (draft.evidence >= 0 ? state.evidence[draft.evidence] : undefined));

const tabStrip = ref<HTMLElement>();
const overflow = ref({ left: false, right: false });

function measureTabs() {
  const el = tabStrip.value;
  if (!el) return;
  overflow.value = {
    left: el.scrollLeft > 1,
    right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
  };
}

function scrollTabs(direction: number) {
  const el = tabStrip.value!;
  el.scrollBy({ left: direction * el.clientWidth * 0.7, behavior: "smooth" });
}

// Keep the selected tab fully visible, e.g. after rotating or reordering.
watch([tab, stripTabs], async () => {
  await nextTick();
  tabStrip.value?.querySelector(`[data-tab="${tab.value}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  measureTabs();
});

const viewportHost = ref<HTMLElement>();
const icInput = ref<HTMLInputElement>();
provide(focusICInput, () => icInput.value?.focus());
const scrollers: Partial<Record<TabId, { onVisible: () => void }>> = {};
const keepRef = (id: TabId) => (el: unknown) => {
  if (el) scrollers[id] = el as { onVisible: () => void };
};

// A log can't follow new entries while hidden, so let it catch up when shown.
watch([tab, isLandscape, first], async () => {
  await nextTick();
  for (const id of ["log", "ooc"] as const) if (shown(id)) scrollers[id]?.onVisible();
});

let tabObserver: ResizeObserver | undefined;

onMounted(() => {
  tabObserver = new ResizeObserver(measureTabs);
  tabObserver.observe(tabStrip.value!);
  measureTabs();
  mountViewport(viewportHost.value!);
  landscapeQuery.addEventListener("change", onOrientation);
});
onUnmounted(() => {
  landscapeQuery.removeEventListener("change", onOrientation);
  tabObserver?.disconnect();
});
</script>

<template>
  <div class="shell" :class="[isLandscape ? 'landscape' : 'portrait', { editing: editingLayout }]" :style="layoutVars">
    <div class="viewport-frame">
      <div ref="viewportHost" class="legacy viewport"></div>
      <OffsetGhost v-if="offsetPreview" />
      <VoiceSpeakers />
    </div>

    <form class="ic-input" @submit.prevent="sendMessage">
      <button
        v-if="presenting"
        type="button"
        class="presenting"
        :title="`Presenting ${presenting.name} with your next message. Click to cancel.`"
        @click="draft.evidence = -1"
      >
        Presenting {{ presenting.name }} <span aria-hidden="true">×</span>
      </button>
      <input
        id="client_inputbox"
        ref="icInput"
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

    <div class="tabs-wrap" :class="{ 'more-left': overflow.left, 'more-right': overflow.right }">
      <nav ref="tabStrip" class="tabs" role="tablist" @scroll="measureTabs">
        <button
          v-for="t in stripTabs"
          :key="t.id"
          role="tab"
          :data-tab="t.id"
          :aria-selected="tab === t.id"
          @click="tab = t.id"
        >
          {{ t.label }}
        </button>
      </nav>
      <button v-if="overflow.left" class="tab-scroll left" tabindex="-1" aria-label="Show earlier tabs" @click="scrollTabs(-1)">
        ‹
      </button>
      <button v-if="overflow.right" class="tab-scroll right" tabindex="-1" aria-label="Show more tabs" @click="scrollTabs(1)">
        ›
      </button>
    </div>

    <!-- Every panel stays mounted; in landscape the first tab moves to the area under the viewport. -->
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
      <AreasPanel v-else-if="t.id === 'areas'" />
      <MusicPanel v-else-if="t.id === 'music'" />
      <BackgroundPanel v-else-if="t.id === 'background'" />
      <EvidencePanel v-else-if="t.id === 'evidence'" />
      <PlayersPanel v-else-if="t.id === 'players'" />
      <SettingsPanel v-else />
    </div>

    <template v-if="editingLayout">
      <SeamKnob v-if="isLandscape" seam="sidebar" class="seam-sidebar" />
      <SeamKnob :seam="isLandscape ? 'viewportLandscape' : 'viewportPortrait'" class="seam-viewport" />
    </template>

    <CharacterSelect />
    <LoadingOverlay />
    <ConnectionOverlay />
    <ServerAlert />
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  height: 100dvh;
  overflow: hidden;
  /* Installed on a phone, the page runs under the status bar and notch; the panels pad the bottom themselves. */
  padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
  background: var(--bg);
}

.portrait {
  grid-template:
    "viewport" auto
    "input" auto
    "tabs" auto
    "panels" 1fr
    / minmax(0, 1fr);
}

.landscape {
  grid-template:
    "viewport tabs" auto
    "viewport panels" auto
    "input panels" auto
    "under panels" 1fr
    / minmax(0, 1fr) var(--sidebar-track);
  /* The left side (viewport and IC options) keeps at least 360px; the tab column gives way. */
  --sidebar-track: max(0px, min(var(--sidebar, clamp(340px, 32vw, 480px)), 100% - 360px));
}

.viewport-frame {
  grid-area: viewport;
  position: relative;
  width: 100%;
  margin: 0 auto;
  background: #000;
}

/* The full courtroom view is three screens wide and pans inside the frame. */
.viewport {
  position: relative;
  overflow: hidden;
}

/* Leave room for the message bar and a panel. */
.portrait .viewport-frame {
  max-width: calc(var(--viewport-height, 55dvh) * 4 / 3);
}

/* Keep the 4:3 viewport from pushing the controls off screen: tall screens keep
   260px for them, short ones (landscape phones) give the viewport 60%. */
.landscape .viewport-frame {
  max-width: calc(var(--viewport-height, min(100dvh - 120px, max(60dvh, 100dvh - 260px))) * 4 / 3);
}

/* Knobs sit centered on the seams they move. */
.seam-sidebar {
  grid-column: 2;
  grid-row: 1 / -1;
  align-self: center;
  justify-self: start;
  transform: translateX(-50%);
}

.seam-viewport {
  grid-area: viewport;
  align-self: end;
  justify-self: center;
  transform: translateY(50%);
}

.editing .viewport-frame {
  outline: 1px dashed var(--accent);
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

.presenting {
  flex: none;
  max-width: 40%;
  overflow: hidden;
  padding: 0 10px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent) 15%, transparent);
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.ic-input .send {
  width: 44px;
  min-height: 40px;
  padding: 0;
}

.tabs-wrap {
  grid-area: tabs;
  position: relative;
  min-width: 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
}

.tabs {
  display: flex;
  gap: 2px;
  padding: 6px 8px 0;
  overflow-x: auto;
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

/* Fade the cut-off edge and offer a chevron so hidden tabs are discoverable. */
.more-left .tabs {
  mask-image: linear-gradient(to right, transparent, #000 48px);
}

.more-right .tabs {
  mask-image: linear-gradient(to left, transparent, #000 48px);
}

.more-left.more-right .tabs {
  mask-image: linear-gradient(to right, transparent, #000 48px, #000 calc(100% - 48px), transparent);
}

.tab-scroll {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 32px;
  border: 0;
  background: none;
  color: var(--text);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
}

.tab-scroll.left {
  left: 0;
}

.tab-scroll.right {
  right: 0;
}

.landscape .tabs-wrap,
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
