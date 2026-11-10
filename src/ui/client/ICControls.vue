<script setup lang="ts">
import { computed, inject, ref, watch } from "vue";
import { PenaltyBar, RTAnimation, ShoutModifier, Side, TextColor } from "aolib-ts";
import { state } from "../../core/state";
import { settings, setSetting } from "../../core/settings";
import { draft, changeHealth, playTestimony, sendOOC, setMuted } from "../../core/commands";
import { characterFolder, selectEmote, setPosition } from "../../core/character";
import { RAINBOW, TEXT_COLORS } from "../textColors";
import EmoteTile from "./EmoteTile.vue";
import { focusICInput } from "./focus";
import { charSelectOpen } from "./overlays";
import OffsetPad from "./OffsetPad.vue";
import ComboBox, { type ComboItem } from "../components/ComboBox.vue";

const character = computed(() => state.self.character);

const focusIC = inject(focusICInput, () => {});
function pickEmote(index: number) {
  selectEmote(index);
  focusIC();
}
const features = computed(() => new Set(state.server.features));

const showname = computed({
  get: () => draft.showname,
  set: (v: string) => {
    draft.showname = v;
    setSetting("showname", v);
  },
});
// Follows the setting, including a reset to defaults.
watch(
  () => settings.showname,
  (name) => (draft.showname = name),
  { immediate: true },
);

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
  (name, _old, onCleanup) => {
    hasCustomShout.value = false;
    if (draft.shout === ShoutModifier.custom) draft.shout = ShoutModifier.none;
    if (!name) return;
    let current = true;
    onCleanup(() => (current = false));
    const folder = characterFolder(name);
    for (const ext of [".gif", ".webp", ".apng", ".png"]) {
      const probe = new Image();
      probe.onload = () => {
        if (current) hasCustomShout.value = true;
      };
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

function resetOffsets() {
  draft.pair.offset.x = 0;
  draft.pair.offset.y = 0;
}

const openCharacterSelect = () => (charSelectOpen.value = true);

const muteQuery = ref("");
const muteResults = computed(() => {
  const q = muteQuery.value.trim().toLowerCase();
  const out: ComboItem[] = [];
  state.characters.forEach((c, id) => {
    if (out.length < 50 && c?.name.toLowerCase().includes(q)) {
      const muted = state.self.muted.includes(id);
      out.push({ key: id, label: c.name, hint: muted ? "Unmute" : "Mute", selected: muted });
    }
  });
  return out;
});
</script>

<template>
  <div class="ic-controls">
    <div v-if="character" class="emotes" role="listbox" aria-label="Emotes">
      <EmoteTile
        v-for="(emote, i) in character.emotes"
        :key="emote.index"
        :character="character.name"
        :emote="emote"
        :selected="state.self.emoteIndex === i"
        @select="pickEmote(i)"
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
        <span class="field-label">Side</span>
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
        <div class="pad-col">
          <OffsetPad v-model:x="draft.pair.offset.x" v-model:y="draft.pair.offset.y" :lock-y="!features.has('y_offset')" />
          <button class="btn" :disabled="!draft.pair.offset.x && !draft.pair.offset.y" @click="resetOffsets">Reset</button>
        </div>
        <dl class="readout">
          <dt>Horizontal</dt>
          <dd>{{ draft.pair.offset.x }}%</dd>
          <template v-if="features.has('y_offset')">
            <dt>Vertical</dt>
            <dd>{{ draft.pair.offset.y }}%</dd>
          </template>
        </dl>
      </div>
    </section>

    <section class="group">
      <h3>Character</h3>
      <button class="btn" @click="openCharacterSelect">Change character</button>
    </section>

    <section class="group">
      <h3>Mute</h3>
      <div class="mute">
        <ComboBox
          v-model="muteQuery"
          :items="muteResults"
          label="Characters to mute"
          placeholder="Search characters to mute…"
          empty-text="No characters match."
          stay-open
          @pick="(item) => setMuted(Number(item.key), !item.selected)"
        />
        <div v-if="state.self.muted.length" class="chips" aria-label="Muted characters">
          <button v-for="id in state.self.muted" :key="id" class="chip-muted" :title="`Unmute ${state.characters[id]?.name}`" @click="setMuted(id, false)">
            {{ state.characters[id]?.name ?? `#${id}` }} <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ic-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px 0;
}

/* Padding is lost when the content overflows the panel, so leave room with a spacer. */
.ic-controls::after {
  content: "";
  flex: none;
  height: max(22px, env(safe-area-inset-bottom));
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
  align-items: flex-start;
  gap: 16px;
  max-width: 480px;
}

.pad-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.readout {
  display: grid;
  grid-template-columns: auto auto;
  gap: 4px 10px;
  margin: 0;
  font-size: 13px;
}

.readout dt {
  color: var(--text-muted);
  font-weight: 600;
}

.readout dd {
  margin: 0;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.mute {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-width: 360px;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip-muted {
  min-height: 30px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface-2);
  color: var(--text);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
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
