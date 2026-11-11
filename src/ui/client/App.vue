<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, provide, reactive, ref, watch } from "vue";
import { focusICInput } from "./focus";
import { mountViewport } from "../../viewport/mount";
import VoiceSpeakers from "./VoiceSpeakers.vue";
import ICLog from "./ICLog.vue";
import ICControls from "./ICControls.vue";
import SettingsPanel from "./SettingsPanel.vue";
import { DEFAULT_TABS, type TabId } from "./tabs";
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
import { editingLayout, panels, ratio, savePanels, tabDrag } from "./layout";
import { allGroups, flatTabs, showTab } from "./panelLayout";
import { groupKey } from "./tabDrag";
import TabStrip from "./TabStrip.vue";
import SplitKnob from "./SplitKnob.vue";

// Landscape: the viewport with a group of tabs under it, beside the right side's
// columns of groups (see panelLayout.ts). Portrait: the viewport, the message
// bar, then every tab in one strip. Panels stay mounted in one layer and are
// placed over the slot of the group showing them, so moving a tab never remounts it.
const landscapeQuery = window.matchMedia("(orientation: landscape)");
const isLandscape = ref(landscapeQuery.matches);
const onOrientation = (e: MediaQueryListEvent) => (isLandscape.value = e.matches);

const portraitTabs = computed(() => flatTabs(panels.value));
const portraitTab = ref<TabId>(panels.value.under.active ?? portraitTabs.value[0]);
// Turning to portrait lands on what was under the viewport.
watch(isLandscape, (landscape) => {
  if (!landscape) portraitTab.value = panels.value.under.active ?? portraitTabs.value[0];
});

const showUnder = computed(() => panels.value.under.tabs.length > 0 || editingLayout.value);

function select(tab: TabId) {
  if (isLandscape.value) savePanels(showTab(panels.value, tab));
  else portraitTab.value = tab;
}

/** The slot a tab's panel is shown in, or null when it's hidden. */
function slotOf(tab: TabId): string | null {
  if (!isLandscape.value) return portraitTab.value === tab ? "portrait" : null;
  const found = allGroups(panels.value).find(({ group }) => group.active === tab);
  return found ? groupKey(found.ref) : null;
}

const shell = ref<HTMLElement>();
const slotEls = new Map<string, HTMLElement>();
const slotRects = reactive<Record<string, { left: number; top: number; width: number; height: number }>>({});
let slotObserver: ResizeObserver | undefined;

function measureSlots() {
  if (!shell.value) return;
  const base = shell.value.getBoundingClientRect();
  for (const [key, el] of slotEls) {
    if (!el.isConnected) {
      slotEls.delete(key);
      delete slotRects[key];
      continue;
    }
    const r = el.getBoundingClientRect();
    const next = { left: r.left - base.left, top: r.top - base.top, width: r.width, height: r.height };
    const now = slotRects[key];
    // Only real changes: writing equal values would re-render, and re-rendering calls the slot refs again.
    if (!now || now.left !== next.left || now.top !== next.top || now.width !== next.width || now.height !== next.height) {
      slotRects[key] = next;
    }
  }
}

// One stable callback per slot, so re-renders don't detach and reattach it.
const slotRefFns = new Map<string, (el: unknown) => void>();
function slotRef(key: string) {
  let fn = slotRefFns.get(key);
  if (!fn) {
    fn = (el) => {
      // Vue calls function refs on every update; only a new element needs work.
      if (!(el instanceof HTMLElement) || slotEls.get(key) === el) return;
      slotEls.set(key, el);
      slotObserver?.observe(el);
      void nextTick(measureSlots);
    };
    slotRefFns.set(key, fn);
  }
  return fn;
}

function panelStyle(tab: TabId) {
  const key = slotOf(tab);
  const rect = key ? slotRects[key] : undefined;
  if (!rect) return { display: "none" };
  return { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` };
}

watch([panels, isLandscape, editingLayout, showUnder], () => void nextTick(measureSlots), { deep: true });

const tabLabel = (id: TabId) => DEFAULT_TABS.find((t) => t.id === id)!.label;

// Ratios set in edit mode; without one, the CSS fallbacks keep the default layout.
const layoutVars = computed(() => {
  const vars: Record<string, string> = {};
  const sidebar = ratio("sidebar");
  const viewport = ratio(isLandscape.value ? "viewportLandscape" : "viewportPortrait");
  if (sidebar) vars["--sidebar"] = `${sidebar * 100}%`;
  if (viewport) vars["--viewport-height"] = `${viewport * 100}dvh`;
  return vars;
});

/** Evidence and pair order still live in legacy code; copy them into the draft, then send. */
function sendMessage() {
  draft.pair.order = getPairOrder();
  sendIC();
}

const presenting = computed(() => (draft.evidence >= 0 ? state.evidence[draft.evidence] : undefined));

const viewportHost = ref<HTMLElement>();
const icInput = ref<HTMLInputElement>();
provide(focusICInput, () => icInput.value?.focus());
const scrollers: Partial<Record<TabId, { onVisible: () => void }>> = {};
const keepRef = (id: TabId) => (el: unknown) => {
  if (el) scrollers[id] = el as { onVisible: () => void };
};

// A log can't follow new entries while hidden, so let it catch up when shown.
watch(
  () => (["log", "ooc"] as const).map((id) => slotOf(id)),
  async () => {
    await nextTick();
    for (const id of ["log", "ooc"] as const) if (slotOf(id)) scrollers[id]?.onVisible();
  },
);

onMounted(() => {
  slotObserver = new ResizeObserver(measureSlots);
  slotObserver.observe(shell.value!);
  for (const el of slotEls.values()) slotObserver.observe(el);
  measureSlots();
  mountViewport(viewportHost.value!);
  landscapeQuery.addEventListener("change", onOrientation);
  window.addEventListener("resize", measureSlots);
});
onUnmounted(() => {
  landscapeQuery.removeEventListener("change", onOrientation);
  window.removeEventListener("resize", measureSlots);
  slotObserver?.disconnect();
});
</script>

<template>
  <div ref="shell" class="shell" :class="[isLandscape ? 'landscape' : 'portrait', { editing: editingLayout }]" :style="layoutVars">
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

    <div v-if="!isLandscape" class="group under">
      <TabStrip :tabs="portraitTabs" :active="portraitTab" :group="null" @select="select" />
      <div :ref="slotRef('portrait')" class="slot"></div>
    </div>
    <div v-else-if="showUnder" class="group under">
      <TabStrip v-if="panels.under.tabs.length > 1 || editingLayout" :tabs="panels.under.tabs" :active="panels.under.active" group="under" @select="select" />
      <div :ref="slotRef('under')" class="slot" data-drop-slot="under">
        <p v-if="editingLayout && !panels.under.tabs.length" class="drop-hint">Drop a tab here</p>
      </div>
    </div>

    <div v-if="isLandscape" class="side">
      <template v-for="(column, c) in panels.columns" :key="c">
        <SplitKnob v-if="editingLayout && c > 0" :index="c - 1" />
        <div class="column" data-split-item :style="{ flexGrow: column.size }">
          <template v-for="(g, i) in column.groups" :key="i">
            <SplitKnob v-if="editingLayout && i > 0" :column="c" :index="i - 1" />
            <div class="group" data-split-item :style="{ flexGrow: g.size }">
              <TabStrip :tabs="g.tabs" :active="g.active" :group="{ column: c, group: i }" @select="select" />
              <div :ref="slotRef(`${c}-${i}`)" class="slot" :data-drop-slot="`${c}-${i}`"></div>
            </div>
          </template>
        </div>
      </template>
    </div>

    <!-- Every panel stays mounted, placed over the slot of the group showing it. -->
    <div
      v-for="t in DEFAULT_TABS"
      :key="t.id"
      class="panel"
      :style="panelStyle(t.id)"
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

    <template v-if="tabDrag.tab">
      <div
        v-if="tabDrag.target"
        class="drop-target"
        :style="{ left: `${tabDrag.target.rect.left}px`, top: `${tabDrag.target.rect.top}px`, width: `${tabDrag.target.rect.width}px`, height: `${tabDrag.target.rect.height}px` }"
      ></div>
      <div class="drag-ghost" :style="{ left: `${tabDrag.x}px`, top: `${tabDrag.y}px` }">{{ tabLabel(tabDrag.tab) }}</div>
    </template>

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
    "under" 1fr
    / minmax(0, 1fr);
}

.landscape {
  grid-template:
    "viewport side" auto
    "input side" auto
    "under side" 1fr
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

.shell {
  position: relative;
}

.group {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
}

.under {
  grid-area: under;
}

.side {
  grid-area: side;
  display: flex;
  min-width: 0;
  min-height: 0;
  border-left: 1px solid var(--border);
}

.column {
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  min-width: 0;
}

.side .group {
  flex: 1 1 0;
}

.column + .column,
.column + .split-knob + .column {
  border-left: 1px solid var(--border);
}

.group + .group,
.group + .split-knob + .group {
  border-top: 1px solid var(--border);
}

/* Empty boxes the panels are placed over. */
.slot {
  position: relative;
  flex: 1;
  min-height: 0;
}

.panel {
  position: absolute;
  z-index: 1;
  overflow-y: auto;
}

/* Panels size their contents in percentages of this. */
.panel > * {
  height: 100%;
}

.editing .slot {
  outline: 1px dashed color-mix(in srgb, var(--accent) 40%, transparent);
  outline-offset: -4px;
}

.drop-hint {
  display: grid;
  place-items: center;
  height: 100%;
  margin: 0;
  color: var(--text-muted);
}

.drop-target {
  position: fixed;
  z-index: 40;
  border: 2px solid var(--accent);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  pointer-events: none;
}

.drag-ghost {
  position: fixed;
  z-index: 41;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: 600;
  pointer-events: none;
  transform: translate(-50%, -120%);
}
</style>
