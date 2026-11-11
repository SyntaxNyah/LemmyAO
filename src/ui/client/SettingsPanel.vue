<script setup lang="ts">
import { computed, ref } from "vue";
import { settings, setSetting, resetSettings, type SettingKey } from "../../core/settings";
import { exportLog } from "../../dom/exportLog";
import { modcall_test } from "../../dom/modCallTest";
import chatboxStyles from "../../constants/chatboxes";
import { version } from "../../version";
import {
  voiceUi,
  joinVoiceChat,
  leaveVoiceChat,
  toggleVoice,
  toggleTalk,
  setOpenMic,
  setVoiceMuted,
  chooseDevice,
  setVoiceVolume,
} from "../../voice/voiceUI";
import TabOrderSettings from "./TabOrderSettings.vue";
import { state } from "../../core/state";
import queryParser from "../../utils/queryParser";
import LinkifiedText from "../components/LinkifiedText.vue";

// Bound, not a literal src: the template compiler would turn a literal into an import.
const logo = "logo-new.png";
const { serverName, connect } = queryParser();
const address = connect.replace(/^wss?:\/\//, "");
const query = ref("");

/** Each section's searchable words; a section shows when the query matches any. */
const SECTIONS: Record<string, string> = {
  audio: "audio volume music sfx sound effects blips mute",
  voice: "voice chat microphone mic push to talk ptt",
  appearance:
    "appearance theme modern classic accent colour color chatbox style font dialogue courtroom 16:9 widescreen aspect inset offset pan tilt desks",
  chat: "chat callwords mention modcall sound",
  layout: "layout tabs tab order",
  log: "log chat log download export transcript txt html",
  server: "server name address software version players description list leave disconnect exit",
  advanced: "advanced reset defaults",
  about: "about version credits lemmyao webao",
};
const visible = (id: string) => {
  const q = query.value.trim().toLowerCase();
  return !q || SECTIONS[id].includes(q) || q.split(/\s+/).every((w) => SECTIONS[id].includes(w));
};
const anyVisible = computed(() => Object.keys(SECTIONS).some(visible));

const CHATBOX_LABELS: Record<string, string> = {
  aa: "AA", dd: "DD / SoJ", dgs: "Chronicles", plvsaa: "PL vs AA", trilogy: "Trilogy", future: "Future",
  legacy: "Old webAO", "999": "999", acww: "Animal Crossing", dr1: "DR 1", dr2: "DR 2", drv3: "DR 3",
  drae: "DR: AE", ddlc: "DDLC", homestuck: "Homestuck", key: "Key", n64zelda: "N64 Zelda",
  papermario: "Paper Mario", p1: "Persona 1", p2: "Persona 2", p3: "Persona 3", p4: "Persona 4",
  p5: "Persona 5", stardew: "Stardew Valley", halla: "VA-11 HALL-A", whentheycry: "When They Cry",
  yakuza: "Yakuza", yttd: "YTTD",
};
const chatboxes = chatboxStyles.filter((c) => c in CHATBOX_LABELS);

const FONTS: [string, string][] = [
  ["sans-serif", "Default (sans-serif)"],
  ["Igiari Cyrillic, Ace Attorney, sans-serif", "Igiari (Ace Attorney)"],
  ["Arial, sans-serif", "Arial"],
  ["Georgia, serif", "Georgia"],
  ["Times New Roman, Times, serif", "Times New Roman"],
  ["Courier New, Courier, monospace", "Courier New"],
  ["monospace", "Monospace"],
  ["Comic Sans MS, cursive", "Comic Sans"],
  ["Impact, fantasy", "Impact"],
  ["Trebuchet MS, sans-serif", "Trebuchet MS"],
  ["IM Fell English, Georgia, serif", "IM Fell English"],
  ["custom", "Custom font…"],
];

const VOLUMES = [
  { key: "musicVolume", mute: "musicMuted", label: "Music" },
  { key: "sfxVolume", mute: "sfxMuted", label: "Sound effects" },
  { key: "blipVolume", mute: "blipMuted", label: "Blips" },
] as const;

const newCallword = ref("");
function addCallword() {
  const word = newCallword.value.trim();
  if (word && !settings.callwords.some((w) => w.toLowerCase() === word.toLowerCase())) {
    setSetting("callwords", [...settings.callwords, word]);
  }
  newCallword.value = "";
}
const removeCallword = (word: string) =>
  setSetting(
    "callwords",
    settings.callwords.filter((w) => w !== word),
  );

const DEFAULT_ACCENT = "#6d8cff";

// Voice, OOC name, favorites and saved lists survive a reset, as before.
const RESET_KEYS: SettingKey[] = [
  "chatbox", "font", "customFont", "musicVolume", "sfxVolume", "blipVolume", "blipPitch",
  "musicMuted", "sfxMuted", "blipMuted", "callwords", "showname",
  "panTilt", "hideDesks", "widescreen", "chatOffset", "preanimGlow", "preanimGlowColor",
  "preanimGlowIntensity", "theme", "accent", "tabOrder", "offsetLockX", "offsetLockY",
];
const confirmReset = ref(false);
function reset() {
  resetSettings(RESET_KEYS);
  confirmReset.value = false;
}

const micOn = computed(() => voiceUi.joined && !voiceUi.listenOnly);
const voiceStatus = computed(() => {
  if (voiceUi.error) return voiceUi.error;
  if (micOn.value) return voiceUi.pttOnly && !voiceUi.openMic ? "Microphone on: tap to talk or hold V." : "Microphone on: open mic.";
  if (voiceUi.joined) return voiceUi.muted ? "Listening, with voice audio muted." : "Listening. Turn on your microphone to talk.";
  return "Joining voice…";
});

const checkbox = (key: SettingKey) => ({
  checked: settings[key] as boolean,
  onChange: (e: Event) => setSetting(key, (e.target as HTMLInputElement).checked as never),
});
</script>

<template>
  <div class="settings">
    <input v-model="query" class="input" type="search" placeholder="Search settings…" aria-label="Search settings" />
    <p v-if="!anyVisible" class="empty">No settings match.</p>

    <section v-show="visible('audio')" class="section">
      <h3>Audio</h3>
      <div v-for="v in VOLUMES" :key="v.key" class="volume">
        <label class="field">
          <span class="field-label">{{ v.label }} <span class="value">{{ Math.round(settings[v.key] * 100) }}%</span></span>
          <input
            class="range"
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="settings[v.key]"
            @input="setSetting(v.key, Number(($event.target as HTMLInputElement).value))"
          />
        </label>
        <label class="check"><input type="checkbox" v-bind="checkbox(v.mute)" /> Mute</label>
      </div>
    </section>

    <section v-show="visible('appearance')" class="section">
      <h3>Appearance</h3>
      <div class="grid">
        <label class="field">
          <span class="field-label">Theme</span>
          <select
            class="input"
            :value="settings.theme === 'classic' ? 'classic' : 'modern'"
            @change="setSetting('theme', ($event.target as HTMLSelectElement).value)"
          >
            <option value="modern">Modern</option>
            <option value="classic">Classic</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">Accent color</span>
          <span class="inline">
            <input
              class="color"
              type="color"
              :value="settings.accent || DEFAULT_ACCENT"
              @input="setSetting('accent', ($event.target as HTMLInputElement).value)"
            />
            <button class="link-btn" :disabled="!settings.accent" @click="setSetting('accent', '')">Default</button>
          </span>
        </label>
        <label class="field">
          <span class="field-label">Chatbox style</span>
          <select class="input" :value="settings.chatbox" @change="setSetting('chatbox', ($event.target as HTMLSelectElement).value)">
            <option value="dynamic">Each character's own</option>
            <option value="default">LemmyAO default</option>
            <option v-for="c in chatboxes" :key="c" :value="c">{{ CHATBOX_LABELS[c] }}</option>
          </select>
        </label>
        <label class="field">
          <span class="field-label">Dialogue font</span>
          <select class="input" :value="settings.font" @change="setSetting('font', ($event.target as HTMLSelectElement).value)">
            <option v-for="[value, label] in FONTS" :key="value" :value="value">{{ label }}</option>
          </select>
        </label>
        <label v-if="settings.font === 'custom'" class="field">
          <span class="field-label">Custom font name</span>
          <input
            class="input"
            :value="settings.customFont"
            placeholder="e.g. Verdana"
            @change="setSetting('customFont', ($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
      <div class="checks">
        <label class="check"><input type="checkbox" v-bind="checkbox('widescreen')" /> 16:9 viewport</label>
        <label class="check"><input type="checkbox" v-bind="checkbox('panTilt')" /> Pan between positions</label>
        <label class="check"><input type="checkbox" v-bind="checkbox('hideDesks')" /> Hide desks</label>
      </div>
      <label v-if="settings.widescreen" class="field narrow">
        <span class="field-label">Chatbox inset <span class="value">{{ settings.chatOffset }}%</span></span>
        <input
          class="range"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="settings.chatOffset"
          @input="setSetting('chatOffset', Number(($event.target as HTMLInputElement).value))"
        />
      </label>
    </section>

    <section v-show="visible('voice')" class="section">
      <h3>Voice chat</h3>
      <p v-if="!voiceUi.available" class="muted">This server doesn't have voice chat.</p>
      <template v-else-if="!voiceUi.joined">
        <p class="muted">This server has voice chat. You're not in it.</p>
        <div><button class="btn btn-primary" :disabled="voiceUi.busy" @click="joinVoiceChat">Join voice chat</button></div>
      </template>
      <template v-else>
        <p class="muted" role="status">{{ voiceStatus }}</p>
        <div class="buttons">
          <button class="btn" :class="{ 'btn-primary': !micOn }" :disabled="voiceUi.busy" @click="toggleVoice">
            {{ micOn ? "Turn off microphone" : "Turn on microphone" }}
          </button>
          <button
            v-if="micOn && voiceUi.pttOnly && !voiceUi.openMic"
            class="btn"
            :class="{ talking: voiceUi.talking }"
            :aria-pressed="voiceUi.talking"
            @click="toggleTalk"
          >
            {{ voiceUi.talking ? "Stop talking" : "Tap to talk" }}
          </button>
          <button class="btn" @click="leaveVoiceChat">Leave voice chat</button>
        </div>
        <div class="checks">
          <label class="check">
            <input type="checkbox" :checked="voiceUi.muted" @change="setVoiceMuted(($event.target as HTMLInputElement).checked)" />
            Mute voice chat
          </label>
          <label class="check" title="Transmit whenever the microphone is on, without push to talk.">
            <input type="checkbox" :checked="voiceUi.openMic" @change="setOpenMic(($event.target as HTMLInputElement).checked)" />
            Always transmit
          </label>
        </div>
        <div class="grid">
          <label class="field">
            <span class="field-label">Microphone</span>
            <select class="input" :value="voiceUi.device" @change="chooseDevice(($event.target as HTMLSelectElement).value)">
              <option value="">Default</option>
              <option v-for="d in voiceUi.devices" :key="d.id" :value="d.id">{{ d.label }}</option>
            </select>
          </label>
          <label class="field">
            <span class="field-label">Voice volume <span class="value">{{ Math.round(voiceUi.volume * 100) }}%</span></span>
            <input
              class="range"
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="voiceUi.volume"
              @input="setVoiceVolume(Number(($event.target as HTMLInputElement).value))"
            />
          </label>
        </div>
        <p class="muted">
          Speaking: {{ voiceUi.speakers.length ? voiceUi.speakers.map((sp) => sp.label).join(", ") : "nobody" }}
        </p>
      </template>
    </section>

    <section v-show="visible('chat')" class="section">
      <h3>Chat</h3>
      <span class="field-label">Callwords: a sound plays when an IC message contains one</span>
      <ul v-if="settings.callwords.length" class="word-list">
        <li v-for="word in settings.callwords" :key="word">
          <span>{{ word }}</span>
          <button class="link-btn danger-text" :aria-label="`Remove ${word}`" @click="removeCallword(word)">Remove</button>
        </li>
      </ul>
      <p v-else class="muted">No callwords yet.</p>
      <form class="add-callword" @submit.prevent="addCallword">
        <input v-model="newCallword" class="input" placeholder="e.g. your name" aria-label="New callword" />
        <button class="btn" type="submit" :disabled="!newCallword.trim()">Add callword</button>
      </form>
      <div><button class="btn" @click="modcall_test">Test mod call sound</button></div>
    </section>

    <section v-show="visible('layout')" class="section">
      <h3>Layout</h3>
      <TabOrderSettings />
    </section>

    <section v-show="visible('server')" class="section">
      <h3>Server</h3>
      <dl class="info">
        <dt>Name</dt>
        <dd>{{ serverName }}</dd>
        <template v-if="address">
          <dt>Address</dt>
          <dd>{{ address }}</dd>
        </template>
        <template v-if="state.server.software">
          <dt>Software</dt>
          <dd>{{ state.server.software }} {{ state.server.version }}</dd>
        </template>
        <template v-if="state.server.maxPlayers">
          <dt>Players</dt>
          <dd>{{ state.server.playerCount }} / {{ state.server.maxPlayers }}</dd>
        </template>
      </dl>
      <p v-if="state.server.description" class="description"><LinkifiedText :text="state.server.description" /></p>
      <div><a class="btn" href="index.html">Back to server list</a></div>
    </section>

    <section v-show="visible('log')" class="section">
      <h3>Chat log</h3>
      <div class="buttons">
        <button class="btn" @click="exportLog('txt')">Download as text</button>
        <button class="btn" @click="exportLog('html')">Download as HTML</button>
      </div>
    </section>

    <section v-show="visible('advanced')" class="section">
      <h3>Advanced</h3>
      <div class="buttons">
        <button v-if="!confirmReset" class="btn danger" @click="confirmReset = true">Reset settings</button>
        <template v-else>
          <button class="btn danger" @click="reset">Reset to defaults</button>
          <button class="btn" @click="confirmReset = false">Cancel</button>
        </template>
      </div>
    </section>

    <section v-show="visible('about')" class="section about">
      <h3>About</h3>
      <div class="about-head">
        <img :src="logo" alt="" width="48" height="48" />
        <div>
          <strong>LemmyAO</strong>
          <div class="muted">version {{ version }}</div>
        </div>
      </div>
      <p>
        <strong>LemmyAO</strong> is the official
        <a href="https://github.com/SyntaxNyah/LemmyAO">Skrapegropen webAO fork</a>,
        maintained by <a href="https://github.com/SyntaxNyah">@SyntaxNyah</a>.
      </p>
      <p>
        This fork is dedicated to <strong>Lemmy</strong> — the single biggest reason
        any of this exists. Without them, there would have been no motivation to keep
        maintaining the Nyathena server fork, no drive to continue this webAO fork,
        and none of the new features that have been added along the way. Skrapegropen
        as a community wouldn't have grown the way it did without their presence —
        they brought people in, kept things lively, and made the whole trashpit worth
        caring about. They were, and remain, the main inspiration behind wanting to
        keep it all alive and worth playing on. This one's for you. 🐀
      </p>
      <p>
        <strong>A note on this fork:</strong> LemmyAO is <em>not</em> intended to
        replace or compete with the upstream
        <a href="https://github.com/AttorneyOnline/webAO">webAO</a> client. It is
        purely a community fork maintained for Skrapegropen. All the hard work that
        makes this possible belongs to the original developers — we are just building
        on top of what they created.
      </p>
      <p>
        Special thanks to <a href="https://github.com/OmniTroid">@OmniTroid</a>
        for their help with the preview feature, contributions to the client, and
        support for Skrapegropen.
      </p>
      <p>Massive credit and gratitude to the people who built webAO from the ground up:</p>
      <ul>
        <li><a href="https://github.com/stonedDiscord">@stonedDiscord</a> — original creator of webAO</li>
        <li><a href="https://github.com/oldmud0">@oldmud0</a> — major refactor and fixes</li>
        <li><a href="https://github.com/qubrick">Qubrick</a> — fixes and improvements</li>
        <li>Aleks — first webAO proof of concept</li>
      </ul>
      <p>
        <a href="https://github.com/AttorneyOnline/webAO">Upstream webAO on GitHub</a> ·
        <a href="styles/igiari/readme.txt">Igiari font by Caveras</a>
      </p>
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 10px 12px 0;
}

/* Padding is lost when the content overflows the panel, so leave room with a spacer. */
.settings::after {
  content: "";
  flex: none;
  height: max(18px, env(safe-area-inset-bottom));
}

.empty {
  margin: 16px 0;
  color: var(--text-muted);
  text-align: center;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
}

h3 {
  margin: 0;
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.field.narrow {
  max-width: 420px;
}

.field-label {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 600;
}

.value {
  margin-left: 4px;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.volume {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  max-width: 480px;
}

.volume .field {
  flex: 1;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
}

.inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color {
  width: 48px;
  height: 36px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface-2);
  cursor: pointer;
}

.link-btn {
  border: 0;
  background: none;
  color: var(--accent);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.link-btn:disabled {
  color: var(--text-muted);
  cursor: default;
}

.checks,
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.word-list {
  max-width: 420px;
  margin: 0;
  padding: 0;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.word-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 40px;
  padding: 0 4px 0 12px;
  overflow-wrap: anywhere;
}

.word-list li + li {
  border-top: 1px solid var(--border);
}

.danger-text {
  color: var(--danger);
}

.add-callword {
  display: flex;
  gap: 6px;
  max-width: 420px;
}

.danger {
  border-color: color-mix(in srgb, var(--danger) 45%, var(--border));
  color: var(--danger);
}

.about p,
.about ul {
  margin: 0;
  line-height: 1.5;
}

.about ul {
  padding-left: 20px;
}

.about-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 12px;
  margin: 0;
  font-size: 14px;
}

.info dt {
  color: var(--text-muted);
}

.info dd {
  margin: 0;
  overflow-wrap: anywhere;
}

.description {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.talking {
  border-color: var(--danger);
  background: var(--danger);
  color: #fff;
}
</style>
