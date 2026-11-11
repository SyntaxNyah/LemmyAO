import { reactive } from "@vue/reactivity";
import {
  isVoiceAvailable,
  isPTTOnly,
  isInVoice,
  joinVoice,
  joinVoiceListenOnly,
  isListenOnly,
  leaveVoice,
  setPTT,
  onCapsChange,
  onSpeakingChange,
  getSpeakingUids,
  isLocalSpeaking,
  isLocalOpenMic,
  setLocalOpenMic,
  getLocalPlayerID,
  getSpeakerDisplayName,
  setInputDevice,
  getInputDeviceId,
  setOutputVolume,
  isVCMuted,
  setVCMuted,
} from "./voice";
import { settings, setSetting } from "../core/settings";

export interface Speaker {
  uid: number;
  label: string;
  self: boolean;
}

/** Voice chat as the UI sees it; refreshed whenever the voice layer reports a change. */
export const voiceUi = reactive({
  available: false,
  joined: false,
  listenOnly: false,
  pttOnly: false,
  openMic: false,
  muted: false,
  /** Tap to talk is held on. */
  talking: false,
  busy: false,
  error: "",
  devices: [] as { id: string; label: string }[],
  device: "",
  volume: 1,
  speakers: [] as Speaker[],
});

let installed = false;
let pttKeyEngaged = false;

function sync() {
  voiceUi.available = isVoiceAvailable();
  voiceUi.joined = isInVoice();
  voiceUi.listenOnly = isListenOnly();
  voiceUi.pttOnly = isPTTOnly();
  voiceUi.openMic = isLocalOpenMic();
  voiceUi.muted = isVCMuted();

  const speakers: Speaker[] = [];
  const self = getLocalPlayerID();
  if (voiceUi.available && isLocalSpeaking() && self >= 0) {
    speakers.push({ uid: self, label: getSpeakerDisplayName(self), self: true });
  }
  if (voiceUi.available) {
    for (const uid of getSpeakingUids()) speakers.push({ uid, label: getSpeakerDisplayName(uid), self: false });
  }
  voiceUi.speakers = speakers;
}

async function loadDevices() {
  if (typeof navigator.mediaDevices?.enumerateDevices !== "function") return;
  try {
    const inputs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput" && d.deviceId);
    voiceUi.devices = inputs.map((d, i) => ({ id: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
    const wanted = voiceUi.device || settings.voiceInputDevice || getInputDeviceId() || "";
    voiceUi.device = voiceUi.devices.some((d) => d.id === wanted) ? wanted : "";
  } catch (e) {
    console.warn("Failed to enumerate audio devices", e);
  }
}

const joinListening = () => joinVoiceListenOnly().then(sync, (e) => console.error("Joining voice failed", e));

/** Joins voice chat (listening only) and remembers it for next time. */
export async function joinVoiceChat(): Promise<void> {
  if (!isVoiceAvailable() || voiceUi.busy) return;
  setSetting("voiceEnabled", true);
  voiceUi.busy = true;
  await joinListening();
  voiceUi.busy = false;
  sync();
}

/** Leaves voice chat entirely and stays out until joined again. */
export function leaveVoiceChat(): void {
  if (voiceUi.talking) {
    voiceUi.talking = false;
    setPTT(false);
  }
  setSetting("voiceEnabled", false);
  leaveVoice();
  sync();
}

/** Steps through listen-only, then microphone on, then back to listen-only. */
export async function toggleVoice(): Promise<void> {
  if (!isVoiceAvailable() || voiceUi.busy) return;
  voiceUi.busy = true;
  voiceUi.error = "";
  try {
    if (isInVoice() && !isListenOnly()) {
      if (voiceUi.talking) {
        voiceUi.talking = false;
        setPTT(false);
      }
      leaveVoice();
      await joinVoiceListenOnly();
    } else if (isListenOnly()) {
      await joinVoice();
      await loadDevices();
    } else {
      await joinVoiceListenOnly();
    }
  } catch (e) {
    console.error("Voice toggle failed", e);
    voiceUi.error = "Microphone unavailable";
  } finally {
    voiceUi.busy = false;
    sync();
  }
}

export function toggleTalk() {
  if (!isInVoice()) return;
  voiceUi.talking = !voiceUi.talking;
  setPTT(voiceUi.talking);
  sync();
}

export function setOpenMic(enabled: boolean) {
  setLocalOpenMic(enabled);
  setSetting("voiceOpenMic", enabled);
  sync();
}

export function setVoiceMuted(muted: boolean) {
  setVCMuted(muted);
  setSetting("voiceMuted", muted);
  sync();
}

export async function chooseDevice(id: string) {
  voiceUi.device = id;
  setSetting("voiceInputDevice", id);
  voiceUi.error = "";
  try {
    await setInputDevice(id);
  } catch {
    voiceUi.error = "Could not switch microphone";
  }
  sync();
}

export function setVoiceVolume(volume: number) {
  voiceUi.volume = volume;
  setOutputVolume(volume);
  setSetting("voiceOutputVolume", volume);
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

function releasePttFromKey() {
  if (!pttKeyEngaged) return;
  pttKeyEngaged = false;
  setPTT(false);
  sync();
}

function onKeyDown(e: KeyboardEvent) {
  if (!isVoiceAvailable() || !isInVoice() || !isPTTOnly()) return;
  if (e.key !== "v" && e.key !== "V") return;
  if (isTypingTarget(e.target) || e.repeat) return;
  pttKeyEngaged = true;
  setPTT(true);
  sync();
}

function onKeyUp(e: KeyboardEvent) {
  // Release even if focus moved into a text field mid-press, or the mic sticks on.
  if (e.key === "v" || e.key === "V") releasePttFromKey();
}

export function installVoiceUI(): void {
  if (installed) return;
  installed = true;

  if (settings.voiceMuted) setVCMuted(true);
  if (settings.voiceOpenMic) setLocalOpenMic(true);
  voiceUi.volume = settings.voiceOutputVolume;
  setOutputVolume(settings.voiceOutputVolume);

  void loadDevices();
  navigator.mediaDevices?.addEventListener?.("devicechange", () => void loadDevices());

  onCapsChange(() => {
    if (settings.voiceEnabled && isVoiceAvailable() && !isInVoice()) void joinListening();
    sync();
  });
  onSpeakingChange(sync);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  // Losing focus swallows the keyup.
  window.addEventListener("blur", releasePttFromKey);

  sync();
}
