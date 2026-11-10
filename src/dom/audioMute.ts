/**
 * Audio mute state management.
 * Uses HTMLAudioElement.muted to silence without changing volume levels.
 */

import { setBlipMuted } from "../viewport/utils/blipAudio";
import { settings, setSetting } from "../core/settings";

export function isMusicMuted(): boolean {
  return settings.musicMuted;
}

export function isSfxMuted(): boolean {
  return settings.sfxMuted;
}

export function isBlipMuted(): boolean {
  return settings.blipMuted;
}

export function applyMusicMute(muted: boolean): void {
  setSetting("musicMuted", muted);
  const channels = document.getElementsByClassName(
    "audioChannel",
  ) as HTMLCollectionOf<HTMLAudioElement>;
  for (let i = 0; i < channels.length; i++) {
    channels[i].muted = muted;
  }
}

export function applySfxMute(muted: boolean): void {
  setSetting("sfxMuted", muted);
  const ids = ["client_sfxaudio", "client_shoutaudio", "client_testimonyaudio"];
  for (const id of ids) {
    const el = document.getElementById(id) as HTMLAudioElement | null;
    if (el) el.muted = muted;
  }
}

export function applyBlipMute(muted: boolean): void {
  setSetting("blipMuted", muted);
  setBlipMuted(muted);
}

export function toggleMuteMusic(): void {
  const checkbox = document.getElementById(
    "client_mute_music",
  ) as HTMLInputElement;
  applyMusicMute(checkbox.checked);
}

export function toggleMuteSfx(): void {
  const checkbox = document.getElementById(
    "client_mute_sfx",
  ) as HTMLInputElement;
  applySfxMute(checkbox.checked);
}

export function toggleMuteBlips(): void {
  const checkbox = document.getElementById(
    "client_mute_blips",
  ) as HTMLInputElement;
  applyBlipMute(checkbox.checked);
}

