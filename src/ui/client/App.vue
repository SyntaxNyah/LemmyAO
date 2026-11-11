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
import { editingLayout, panels, portraitViewport, savePanels, tabDrag } from "./layout";
import { settings } from "../../core/settings";
import { allGroups, flatTabs, showTab } from "./panelLayout";
import { groupKey } from "./tabDrag";
import TabStrip from "./TabStrip.vue";
import PanelTree from "./PanelTree.vue";

// Landscape: a tree of split groups (see panelLayout.ts), the viewport among the
// tabs. Portrait: the viewport on top, then every other tab in one strip. Panels
// stay mounted in one layer and are placed over the slot of the group showing
// them, so moving a tab never remounts it.
const landscapeQuery = window.matchMedia("(orientation: landscape)");
const isLandscape = ref(landscapeQuery.matches);
const onOrientation = (e: MediaQueryListEvent) => (isLandscape.value = e.matches);

const portraitTabs = computed(() => flatTabs(panels.value).filter((t) => t !== "viewport"));
// Turning to portrait lands on the first tab showing in landscape.
const firstShown = () => allGroups(panels.value).map(({ group }) => group.active).find((t) => t && t !== "viewport") ?? portraitTabs.value[0];
const portraitTab = ref<TabId>(firstShown());
watch(isLandscape, (landscape) => {
  if (!landscape) portraitTab.value = firstShown();
});

function select(tab: TabId) {
  if (isLandscape.value) savePanels(showTab(panels.value, tab));
  else portraitTab.value = tab;
}

/** The slot a tab's panel is shown in, or null when it's hidden. */
function slotOf(tab: TabId): string | null {
  if (!isLandscape.value) return tab === "viewport" ? "portrait-viewport" : portraitTab.value === tab ? "portrait" : null;
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

watch([panels, isLandscape, editingLayout], () => void nextTick(measureSlots), { deep: true });

const tabLabel = (id: TabId) => DEFAULT_TABS.find((t) => t.id === id)!.label;

const stripMarker = computed(() => (tabDrag.target?.kind === "into" ? (tabDrag.target.marker ?? null) : null));
const boxStyle = (r: DOMRect) => ({ left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });

// While a tab is dragged: every landscape panel area, in page coordinates.
const dropZones = computed(() => {
  if (!tabDrag.tab || !shell.value) return [];
  const base = shell.value.getBoundingClientRect();
  return Object.entries(slotRects)
    .filter(([key]) => !key.startsWith("portrait"))
    .map(([key, r]) => ({
      key,
      style: { left: `${base.left + r.left}px`, top: `${base.top + r.top}px`, width: `${r.width}px`, height: `${r.height}px` },
    }));
});

const layoutVars = computed(() => {
  const vars: Record<string, string> = { "--aspect": settings.widescreen ? `${16 / 9}` : `${4 / 3}` };
  if (portraitViewport()) vars["--viewport-height"] = `${portraitViewport() * 100}dvh`;
  return vars;
});

/** Evidence and pair order still live in legacy code; copy them into the draft, then send. */
function sendMessage() {
  draft.pair.order = getPairOrder();
  sendIC();
}

const presenting = computed(() => (draft.evidence >= 0 ? state.evidence[draft.evidence] : undefined));

// Function refs: inside the panels' v-for, plain refs would collect arrays.
let viewportHost: HTMLElement | undefined;
let icInput: HTMLInputElement | undefined;
const setViewportHost = (el: unknown) => (viewportHost = el as HTMLElement);
const setICInput = (el: unknown) => (icInput = el as HTMLInputElement);
provide(focusICInput, () => icInput?.focus());
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
  mountViewport(viewportHost!);
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
    <template v-if="!isLandscape">
      <div :ref="slotRef('portrait-viewport')" class="portrait-viewport"></div>
      <div class="portrait-tabs">
        <TabStrip :tabs="portraitTabs" :active="portraitTab" :group="null" @select="select" />
        <div :ref="slotRef('portrait')" class="slot"></div>
      </div>
    </template>
    <div v-else class="tree">
      <PanelTree :node="panels.root" :path="[]" :slot-ref="slotRef" @select="select" />
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
      <div v-if="t.id === 'viewport'" class="viewport-panel">
        <div class="viewport-box">
          <div class="viewport-frame">
            <div :ref="setViewportHost" class="legacy viewport"></div>
            <OffsetGhost v-if="offsetPreview" />
            <VoiceSpeakers />
          </div>
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
            :ref="setICInput"
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
      </div>
      <ICControls v-else-if="t.id === 'emotes'" />
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
      <!-- Where a tab can go: every panel, and the edges that split it. -->
      <div v-for="zone in dropZones" :key="zone.key" class="drop-zone" :style="zone.style">
        <span class="split-zone beside">→ New panel</span>
        <span class="split-zone below">↓ New panel</span>
      </div>
      <div v-if="tabDrag.target && !tabDrag.target.marker" class="drop-target" :style="boxStyle(tabDrag.target.rect)">
        <span class="drop-label">{{ tabDrag.target.label }}</span>
      </div>
      <template v-if="tabDrag.target && stripMarker">
        <div class="drop-strip" :style="boxStyle(tabDrag.target.rect)"></div>
        <div class="drop-marker" :style="boxStyle(stripMarker)"></div>
      </template>
      <div class="drag-ghost" :style="{ left: `min(${tabDrag.x}px, calc(100vw - 160px))`, top: `${tabDrag.y}px` }">
        <span aria-hidden="true">⠿</span>{{ tabLabel(tabDrag.tab) }}
      </div>
    </template>

    <SeamKnob v-if="editingLayout && !isLandscape" class="seam-viewport" />

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
  overflow: clip;
  /* Installed on a phone, the page runs under the status bar and notch; the panels pad the bottom themselves. */
  padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left);
  background: var(--bg);
}

.portrait {
  grid-template:
    "viewport" auto
    "tabs" 1fr
    / minmax(0, 1fr);
}

.landscape {
  grid-template: "tree" 1fr / minmax(0, 1fr);
}

/* Room for the viewport and the message bar; the panel shows both. */
.portrait-viewport {
  grid-area: viewport;
  height: calc(min(100vw / var(--aspect), var(--viewport-height, 55dvh)) + 52px);
}

.viewport-panel {
  display: flex;
  flex-direction: column;
}

/* The viewport fits its panel at its aspect ratio, letterboxed. */
.viewport-box {
  display: grid;
  flex: 1;
  place-items: center;
  min-height: 0;
  container-type: size;
  background: #000;
}

.viewport-frame {
  position: relative;
  width: min(100cqw, 100cqh * var(--aspect));
}

/* The full courtroom view is three screens wide and pans inside the frame. */
.viewport {
  position: relative;
  overflow: hidden;
}

.seam-viewport {
  grid-area: viewport;
  align-self: end;
  justify-self: center;
  transform: translateY(50%);
}

.ic-input {
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

.portrait-tabs {
  grid-area: tabs;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.tree {
  grid-area: tree;
  display: flex;
  min-width: 0;
  min-height: 0;
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

/* Drag feedback sits above the panels and never takes the pointer. */
.drop-zone,
.drop-target,
.drop-strip,
.drop-marker,
.drag-ghost {
  position: fixed;
  pointer-events: none;
}

/* Dims the panels so the drop areas read clearly. */
.drop-zone {
  z-index: 38;
  border: 2px dashed color-mix(in srgb, var(--accent) 60%, transparent);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg) 70%, transparent);
}

/* The right and bottom quarters of a right-side panel split it. */
.split-zone {
  position: absolute;
  display: grid;
  place-items: center;
  color: color-mix(in srgb, var(--accent) 70%, var(--text));
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: color-mix(in srgb, var(--accent) 16%, transparent);
}

.split-zone.beside {
  top: 0;
  right: 0;
  bottom: 25%;
  width: 25%;
  border-left: 2px dashed color-mix(in srgb, var(--accent) 60%, transparent);
}

.split-zone.below {
  right: 0;
  bottom: 0;
  left: 0;
  height: 25%;
  border-top: 2px dashed color-mix(in srgb, var(--accent) 60%, transparent);
}

.drop-target {
  z-index: 40;
  display: grid;
  place-items: center;
  border: 2px solid var(--accent);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent) 22%, transparent);
}

.drop-label {
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-contrast);
  font-weight: 600;
}

.drop-strip {
  z-index: 40;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.drop-marker {
  z-index: 41;
  border-radius: 2px;
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

.drag-ghost {
  z-index: 42;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  color: var(--text);
  font-weight: 600;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.45);
  /* Below and right of the pointer, so it never hides the spot being dropped on. */
  transform: translate(14px, 16px) rotate(-2deg);
}
</style>
