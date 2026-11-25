<script setup lang="ts">
import { computed } from "vue";
import { state } from "../../core/state";
import { settings } from "../../core/settings";
import { penaltyPips } from "./penaltyBars";

const bars = computed(() => [
  { key: "defense", label: "Defense", value: state.court.hp.defense },
  { key: "prosecution", label: "Prosecution", value: state.court.hp.prosecution },
].map((bar) => ({ ...bar, pips: penaltyPips(bar.value) })));
</script>

<template>
  <div v-if="settings.showPenaltyBars" class="penalty-bars" role="group" aria-label="Penalty bars">
    <div
      v-for="bar in bars"
      :key="bar.key"
      class="penalty"
      :class="bar.key"
      role="meter"
      :aria-label="bar.label"
      aria-valuemin="0"
      aria-valuemax="10"
      :aria-valuenow="bar.value"
      :aria-valuetext="`${bar.label} ${bar.value} of 10`"
    >
      <span class="label">{{ bar.label }}</span>
      <span class="track" aria-hidden="true">
        <span v-for="(filled, index) in bar.pips" :key="index" class="pip" :class="{ filled }"></span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.penalty-bars {
  position: absolute;
  top: 8px;
  right: 8px;
  left: 8px;
  z-index: 30;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  pointer-events: none;
}

.penalty {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: min(38%, 220px);
  min-width: 0;
  padding: 4px 6px;
  border: 1px solid rgb(255 255 255 / 0.16);
  border-radius: var(--radius-sm);
  background: rgb(0 0 0 / 0.5);
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
  backdrop-filter: blur(6px);
}

.penalty.prosecution {
  align-items: flex-end;
}

.label {
  color: rgb(255 255 255 / 0.85);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  text-transform: uppercase;
}

.track {
  display: flex;
  gap: 2px;
  width: 100%;
  height: 9px;
}

.pip {
  flex: 1;
  min-width: 0;
  border-radius: 1px;
  background: rgb(255 255 255 / 0.16);
  transition: background-color 120ms ease;
}

.defense .pip.filled {
  background: var(--penalty-defense);
  box-shadow: 0 0 4px var(--penalty-defense);
}

.prosecution .pip.filled {
  background: var(--penalty-prosecution);
  box-shadow: 0 0 4px var(--penalty-prosecution);
}

@media (max-width: 600px) {
  .penalty-bars {
    top: 4px;
    right: 4px;
    left: 4px;
    gap: 6px;
  }

  .penalty {
    gap: 3px;
    padding: 3px 4px;
  }

  .label {
    font-size: 8px;
  }

  .track {
    height: 7px;
    gap: 1px;
  }
}
</style>