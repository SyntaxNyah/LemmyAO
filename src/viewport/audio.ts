/**
 * Sounds that are part of an IC message (shouts, sound effects, blips) play
 * through one Web Audio context: one open output stream, so Bluetooth devices
 * don't wake per sound, and every sound is scheduled ahead on the audio clock,
 * so a busy page can't delay or bunch them up.
 */

let ctx: AudioContext | null = null;
let blipGain: GainNode | null = null;
let sfxGain: GainNode | null = null;

const buffers = new Map<string, Promise<AudioBuffer | null>>();
const scheduled = new Set<AudioBufferSourceNode>();

let blipVolume = 0.5;
let blipPitch = 1;
let blipMuted = false;
let sfxVolume = 1;
let sfxMuted = false;

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor({ latencyHint: "interactive" });
  blipGain = ctx.createGain();
  sfxGain = ctx.createGain();
  blipGain.connect(ctx.destination);
  sfxGain.connect(ctx.destination);
  applyGains();
  return ctx;
}

function applyGains() {
  if (blipGain) blipGain.gain.value = blipMuted ? 0 : blipVolume;
  if (sfxGain) sfxGain.gain.value = sfxMuted ? 0 : sfxVolume;
}

async function fetchSound(audio: AudioContext, url: string): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    return res.ok ? await audio.decodeAudioData(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

/** Fetches and decodes a sound once; null when it's missing or unreadable. */
export function loadSound(url: string): Promise<AudioBuffer | null> {
  let pending = buffers.get(url);
  if (!pending) {
    const audio = context();
    pending = audio ? fetchSound(audio, url) : Promise.resolve(null);
    buffers.set(url, pending);
  }
  return pending;
}

/**
 * Resumes the context from a user gesture and plays a moment of silence, so the
 * output device (a Bluetooth headset especially) is awake before the first message.
 */
export function unlockAudio(): void {
  const audio = context();
  if (!audio) return;
  void audio.resume().catch(() => {});
  const silence = audio.createBufferSource();
  silence.buffer = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.1), audio.sampleRate);
  silence.connect(audio.destination);
  silence.start();
}

/** Whether the clock is running, giving a suspended context a moment to resume. */
export async function audioReady(timeoutMs = 300): Promise<boolean> {
  const audio = context();
  if (!audio) return false;
  if (audio.state !== "running") {
    await Promise.race([audio.resume().catch(() => {}), new Promise((r) => setTimeout(r, timeoutMs))]);
  }
  return audio.state === "running";
}

/** Seconds between scheduling a sound and hearing it, as the device reports it. */
export function outputLatency(): number {
  if (!ctx) return 0;
  const reported = Number.isFinite(ctx.outputLatency) && ctx.outputLatency > 0 ? ctx.outputLatency : ctx.baseLatency;
  return Math.min(Math.max(reported || 0, 0), 0.5);
}

export const audioNow = () => ctx?.currentTime ?? 0;

/** Plays `buffer` at `when` on the audio clock. */
export function schedule(buffer: AudioBuffer, when: number, channel: "blip" | "sfx", loop = false): void {
  const audio = context();
  const gain = channel === "blip" ? blipGain : sfxGain;
  if (!audio || !gain) return;
  const source = audio.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  if (channel === "blip") source.playbackRate.value = blipPitch;
  source.connect(gain);
  source.onended = () => scheduled.delete(source);
  scheduled.add(source);
  source.start(Math.max(when, audio.currentTime));
}

/** Stops what an interrupted message still had to play; a looping sound finishes its current pass. */
export function cancelScheduled(): void {
  for (const source of scheduled) {
    if (source.loop) {
      source.loop = false;
      continue;
    }
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
  }
  scheduled.clear();
}

export function setBlipVolume(v: number) {
  blipVolume = Math.max(0, Math.min(1, v));
  applyGains();
}

export function setBlipPitch(p: number) {
  blipPitch = Math.max(0.5, Math.min(2, Number(p) || 1));
}

export function setBlipMuted(m: boolean) {
  blipMuted = m;
  applyGains();
}

export function setSfxVolume(v: number) {
  sfxVolume = Math.max(0, Math.min(1, v));
  applyGains();
}

export function setSfxMuted(m: boolean) {
  sfxMuted = m;
  applyGains();
}
