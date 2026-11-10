<script setup lang="ts">
import { state, type ICEntry } from "../../core/state";
import { messageText, speakerName } from "../../core/log";
import { useStickyScroll } from "./useStickyScroll";
import { RAINBOW, TEXT_COLORS } from "../textColors";

const { el, onScroll, onVisible } = useStickyScroll(() => state.icLog.at(-1));
defineExpose({ onVisible });

const clock = (time: number) =>
  new Date(time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

const minute = (time: number) => Math.floor(time / 60000);

/** Show a time only when the minute changes since the last timed entry, like a chat app. */
const showTime = (i: number) => {
  for (let j = i - 1; j >= 0; j--) {
    const prev = state.icLog[j];
    if (prev.kind !== "notice") return minute(prev.time) !== minute(state.icLog[i].time);
  }
  return true;
};

const speaker = (e: Extract<ICEntry, { kind: "message" }>) => speakerName(e, true);
</script>

<template>
  <div ref="el" class="log" role="log" aria-label="In-character log" @scroll="onScroll">
    <p v-if="!state.icLog.length" class="empty">Messages will appear here.</p>
    <template v-for="(e, i) in state.icLog" :key="i">
      <div v-if="e.kind === 'notice'" class="notice"><span>{{ e.text }}</span></div>
      <div v-else class="entry" :class="{ callword: e.kind === 'message' && e.callword }">
        <template v-if="e.kind === 'message'">
          <span class="name">{{ speaker(e) }}:</span>
          <span class="text" :style="{ color: TEXT_COLORS[e.color].css }">
            <span :class="{ rainbow: e.color === 'rainbow' }">{{ messageText(e.message) }}</span>
          </span>
        </template>
        <span v-else class="music">
          {{ e.showname || "Someone" }} played <b>{{ e.track || "nothing" }}</b>{{ e.looping ? " (looping)" : "" }}
        </span>
        <time v-if="showTime(i)" class="time">{{ clock(e.time) }}</time>
      </div>
    </template>
  </div>
</template>

<style scoped>
.log {
  height: 100%;
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
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 3px 14px;
}

.entry:hover {
  background: var(--surface-hover);
}

.entry.callword {
  background: color-mix(in srgb, var(--warn) 14%, transparent);
  box-shadow: inset 3px 0 var(--warn);
}

.name {
  flex: none;
  max-width: 40%;
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text {
  flex: 1;
  min-width: 0;
  white-space: pre-wrap;
}

.music {
  flex: 1;
  color: var(--text-muted);
  font-style: italic;
}

.time {
  flex: none;
  margin-left: auto;
  color: var(--text-muted);
  font-size: 12px;
}

.notice {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 14px;
  color: var(--text-muted);
  font-size: 12px;
}

.notice::before,
.notice::after {
  content: "";
  flex: 1;
  border-top: 1px solid var(--border);
}

.rainbow {
  background: v-bind(RAINBOW);
  background-clip: text;
  color: transparent !important;
}
</style>
