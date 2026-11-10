<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PenaltyBar, RTAnimation, ShoutModifier, Side, TextColor } from "aolib-ts";
import { state } from "../../core/state";
import { settings, setSetting } from "../../core/settings";
import { draft, changeHealth, playTestimony, sendOOC, setMuted } from "../../core/commands";
import { characterFolder, selectEmote, setPosition } from "../../core/character";
import { changeCharacter } from "../../dom/changeCharacter";
import { openBackgroundList } from "../../dom/backgroundList";
import { RAINBOW, TEXT_COLORS } from "../textColors";
import EmoteTile from "./EmoteTile.vue";
import AssetImage from "./AssetImage.vue";

const character = computed(() => state.self.character);
const features = computed(() => new Set(state.server.features));

const showname = computed({
  get: () => draft.showname,
  set: (v: string) => {
    draft.showname = v;
    setSetting("showname", v);
  },
});
draft.showname = settings.showname;

const POSITIONS: [Side | "", string][] = [
  ["", "Default"],
  [Side.def, "Defense"],
  [Side.pro, "Prosecution"],
  [Side.jud, "Judge"],
  [Side.wit, "Witness"],
  [Side.hld, "Helper defense"],
  [Side.hlp, "Helper prosecution"],
  [Side.jur, "Jury"],
  [Side.sea, "Seance"],
];

function choosePosition(e: Event) {
  const position = (e.target as HTMLSelectElement).value as Side | "";
  setPosition(position);
  if (position) sendOOC(`/pos ${position}`);
}

const colors = Object.values(TextColor);
const dotFor = (c: TextColor) => (c === TextColor.rainbow ? RAINBOW : TEXT_COLORS[c].css);

const hasCustomShout = ref(false);
watch(
  () => character.value?.name,
  (name) => {
    hasCustomShout.value = false;
    if (!name) return;
    const folder = characterFolder(name);
    for (const ext of [".gif", ".webp", ".apng", ".png"]) {
      const probe = new Image();
      probe.onload = () => (hasCustomShout.value = true);
      probe.src = `${folder}custom${ext}`;
    }
  },
  { immediate: true },
);

const showJudge = computed(
  () =>
    state.self.judgeControls === "shown" ||
    (state.self.judgeControls === "by_position" && draft.side === Side.jud),
);

// Scrolling up moves the sprite right, or up for the vertical axis.
function nudge(axis: "x" | "y", e: WheelEvent) {
  const toward = (e.deltaY < 0 ? 1 : -1) * (axis === "y" ? -1 : 1);
  const next = draft.pair.offset[axis] + toward;
  draft.pair.offset[axis] = Math.min(100, Math.max(-100, next));
}

function resetOffsets() {
  draft.pair.offset.x = 0;
  draft.pair.offset.y = 0;
}

const openCharacterSelect = () => changeCharacter(new Event("click"));

const menuOpen = ref(false);
function menu(action: () => void) {
  menuOpen.value = false;
  action();
}

function toggleMute(e: Event) {
  const select = e.target as HTMLSelectElement;
  const id = Number(select.value);
  if (id >= 0) setMuted(id, !state.self.muted.includes(id));
  select.value = "-1";
}
</script>

<template>
  <div class="ic-controls">
    <div class="who">
      <button class="chip" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
        <AssetImage v-if="character" class="chip-icon" :base="`${characterFolder(character.name)}char_icon`" alt="" />
        <span>{{ character?.showname ?? "Spectating" }}</span>
        <span aria-hidden="true" class="caret">▾</span>
      </button>
      <div v-if="menuOpen" class="menu" role="menu">
        <button role="menuitem" @click="menu(openCharacterSelect)">Change character</button>
        <button role="menuitem" @click="menu(() => sendOOC('/randomchar'))">Random character</button>
        <button role="menuitem" @click="menu(openBackgroundList)">Backgrounds</button>
      </div>
    </div>

    <div v-if="character" class="emotes" role="listbox" aria-label="Emotes">
      <EmoteTile
        v-for="(emote, i) in character.emotes"
        :key="emote.index"
        :character="character.name"
        :emote="emote"
        :selected="state.self.emoteIndex === i"
        @select="selectEmote(i)"
      />
    </div>

    <div class="name-row">
      <label class="field grow">
        <span class="field-label">Showname</span>
        <input v-model.lazy="showname" class="input" placeholder="Pick a name…" maxlength="30" />
      </label>
    </div>

    <div class="fields">
      <label class="field">
        <span class="field-label">Text color</span>
        <span class="color-select" :class="{ rainbow: draft.color === TextColor.rainbow }">
          <span class="dot" :style="{ background: dotFor(draft.color) }" aria-hidden="true"></span>
          <select v-model="draft.color" class="input select" :style="{ color: TEXT_COLORS[draft.color].css }">
            <option v-for="c in colors" :key="c" :value="c" :style="{ color: TEXT_COLORS[c].css }">
              {{ TEXT_COLORS[c].label }}
            </option>
          </select>
        </span>
      </label>
      <label class="field">
        <span class="field-label">Position</span>
        <select class="input select" :value="state.self.position" @change="choosePosition">
          <option v-for="[value, label] in POSITIONS" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
      <label class="field">
        <span class="field-label">Shout</span>
        <select v-model="draft.shout" class="input select">
          <option :value="ShoutModifier.none">None</option>
          <option :value="ShoutModifier.hold_it">Hold it!</option>
          <option :value="ShoutModifier.objection">Objection!</option>
          <option :value="ShoutModifier.take_that">Take that!</option>
          <option v-if="hasCustomShout" :value="ShoutModifier.custom">Custom</option>
        </select>
      </label>
      <label v-if="features.has('effects')" class="field">
        <span class="field-label">Effect</span>
        <select
          class="input select"
          :value="`${draft.effect.name}|${draft.effect.folder}|${draft.effect.sound}`"
          @change="
            ([draft.effect.name, draft.effect.folder, draft.effect.sound] = ($event.target as HTMLSelectElement).value.split('|'))
          "
        >
          <option value="||">None</option>
          <option value="realization||sfx-realization">Realization</option>
          <option value="confetti||sfx-gallerycheer">Confetti</option>
          <option value="rain-weak||sfx-rain">Weak rain</option>
          <option value="rain||sfx-rain">Rain</option>
          <option value="rain-strong||sfx-rain">Strong rain</option>
        </select>
      </label>
    </div>

    <section class="group">
      <h3>Emote options</h3>
      <div class="options">
        <label class="check"><input v-model="draft.sendPreanim" type="checkbox" /> Preanim</label>
        <label class="check"><input v-model="draft.sendSfx" type="checkbox" /> SFX</label>
        <label class="check"><input v-model="draft.flip" type="checkbox" /> Flip</label>
        <label class="check"><input v-model="draft.flash" type="checkbox" /> Flash</label>
        <label class="check"><input v-model="draft.screenshake" type="checkbox" /> Shake</label>
        <label class="check"><input v-model="draft.nonInterrupting" type="checkbox" /> Non-interrupting preanim</label>
        <label class="check"><input v-model="draft.loopSfx" type="checkbox" /> Looping SFX</label>
        <label v-if="features.has('effects')" class="check"><input v-model="draft.additive" type="checkbox" /> Additive</label>
      </div>
    </section>

    <section v-if="showJudge" class="group">
      <h3>Judge</h3>
      <div class="judge">
        <button class="btn" @click="playTestimony(RTAnimation.witness_testimony)">Witness testimony</button>
        <button class="btn" @click="playTestimony(RTAnimation.cross_examination)">Cross-examination</button>
        <button class="btn" @click="playTestimony(RTAnimation.not_guilty)">Not guilty</button>
        <button class="btn" @click="playTestimony(RTAnimation.guilty)">Guilty</button>
        <span class="hp">
          Defense
          <button class="btn" aria-label="Lower defense health" @click="changeHealth(PenaltyBar.defense, -1)">−</button>
          <button class="btn" aria-label="Raise defense health" @click="changeHealth(PenaltyBar.defense, 1)">+</button>
        </span>
        <span class="hp">
          Prosecution
          <button class="btn" aria-label="Lower prosecution health" @click="changeHealth(PenaltyBar.prosecution, -1)">−</button>
          <button class="btn" aria-label="Raise prosecution health" @click="changeHealth(PenaltyBar.prosecution, 1)">+</button>
        </span>
      </div>
    </section>

    <section class="group">
      <h3>Position</h3>
      <div class="offsets">
        <label class="field horizontal">
          <span class="field-label">Horizontal <span class="value">{{ draft.pair.offset.x }}%</span></span>
          <input
            v-model.number="draft.pair.offset.x"
            class="range"
            type="range"
            min="-100"
            max="100"
            step="1"
            @wheel.prevent="nudge('x', $event)"
          />
        </label>
        <label v-if="features.has('y_offset')" class="field vertical">
          <span class="field-label">Vertical <span class="value">{{ draft.pair.offset.y }}%</span></span>
          <input
            v-model.number="draft.pair.offset.y"
            class="range range-vertical"
            type="range"
            min="-100"
            max="100"
            step="1"
            aria-orientation="vertical"
            @wheel.prevent="nudge('y', $event)"
          />
        </label>
        <button class="btn" :disabled="!draft.pair.offset.x && !draft.pair.offset.y" @click="resetOffsets">Reset</button>
      </div>
    </section>

    <section class="group">
      <h3>Mute</h3>
      <label class="field">
        <span class="field-label">Hide a character's messages</span>
        <select class="input select" value="-1" @change="toggleMute">
          <option value="-1">Choose a character…</option>
          <option v-for="(c, id) in state.characters" :key="id" :value="id">
            {{ c.name }}{{ state.self.muted.includes(id) ? " (muted)" : "" }}
          </option>
        </select>
      </label>
    </section>
  </div>
</template>

<style scoped>
.ic-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px 16px;
}


.who {
  position: relative;
  align-self: flex-start;
}

.chip {
  display: flex;
  align-items: center;
  gap: 8px;
  max-width: 220px;
  min-height: 40px;
  padding: 4px 10px 4px 4px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}

.chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-icon {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--surface);
}

.caret {
  color: var(--text-muted);
}

.menu {
  position: absolute;
  z-index: 20;
  top: calc(100% + 4px);
  left: 0;
  display: flex;
  flex-direction: column;
  min-width: 200px;
  padding: 4px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  box-shadow: var(--shadow);
}

.menu button {
  padding: 8px 10px;
  border: 0;
  border-radius: 4px;
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.menu button:hover {
  background: var(--surface-hover);
}


.emotes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(52px, 1fr));
  gap: 6px;
}

.options {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.options label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.select {
  width: auto;
  min-height: 40px;
  padding: 0 8px;
}

.color-select {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.color-select .dot {
  position: absolute;
  left: 10px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  box-shadow: 0 0 0 1px var(--border);
  pointer-events: none;
}

.color-select .select {
  padding-left: 30px;
  font-weight: 600;
}

/* A select can't paint gradient text, so Rainbow gets a gradient dot and plain label. */
.color-select.rainbow .select {
  color: var(--text) !important;
}

.color-select option {
  background: var(--surface);
}

.name-row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
}

.fields {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.field.grow {
  flex: 1 1 220px;
}

.field-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.fields .select,
.fields .color-select {
  width: 100%;
}

.group .field {
  max-width: 360px;
}

.offsets {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px 16px;
}

.offsets .horizontal {
  flex: 1 1 200px;
  align-self: center;
}

.offsets .vertical {
  align-items: center;
}

.value {
  margin-left: 4px;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.group h3 {
  margin: 4px 0 8px;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.judge {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.hp {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  color: var(--text-muted);
}

.hp .btn {
  min-width: 36px;
  padding: 0;
}




</style>
