// Server-relayed voice transport.
//
// Every audio frame travels client -> AO2 server -> other clients over the
// existing AO2 WebSocket. There is no WebRTC, no STUN/TURN/ICE, no SDP.
// Peers never connect to each other, so their IPs cannot leak via packet
// capture — this is a structural privacy property of the transport.
//
// Wire protocol (`#` separator, `%` terminator; base64 needs no escaping):
//
//   Server -> client
//     VS_CAPS#<enabled>#<ptt_only>#<max_peers>#<codec>#<sample_rate>#<frame_ms>#<max_frame_bytes>#%
//     VS_PEERS#<csv_uids>#%
//     VS_JOIN#<uid>#%
//     VS_LEAVE#<uid>#%
//     VS_SPEAK#<uid>#<on_off>#%
//     VS_AUDIO#<from_uid>#<b64_opus>#%
//
//   Client -> server
//     VS_JOIN#%
//     VS_LEAVE#%
//     VS_FRAME#<b64_opus>#%
//     VS_SPEAK#<on_off>#%

import { client } from "../client";
import type { SampleRate as WasmOpusSampleRate } from "libopus-wasm";

interface VoiceCaps {
  enabled: boolean;
  pttOnly: boolean;
  maxPeers: number;
  codec: string;
  sampleRate: number;
  frameMs: number;
  maxFrameBytes: number;
}

let caps: VoiceCaps = {
  enabled: false,
  pttOnly: true,
  maxPeers: 0,
  codec: "opus",
  sampleRate: 48000,
  frameMs: 20,
  maxFrameBytes: 4096,
};

let audioCtx: AudioContext | null = null;
let workletReady = false;
let localStream: MediaStream | null = null;
let captureSourceNode: MediaStreamAudioSourceNode | null = null;
let captureNode: AudioWorkletNode | null = null;
let captureSink: GainNode | null = null;
let frameEncoder: FrameEncoder | null = null;

// Unifies the two available audio codec backends: the native WebCodecs
// AudioEncoder/AudioDecoder (preferred where available) and a WASM libopus
// fallback (`libopus-wasm`) for browsers that lack WebCodecs audio support —
// notably Firefox on Android/iOS, which never shipped it. Both backends
// speak the same raw-Opus-packet wire format, so peers on either backend
// can talk to each other transparently.
interface FrameEncoder {
  encode(pcm: Float32Array): void;
  close(): void;
}

interface FrameDecoder {
  decode(bytes: Uint8Array): void;
  close(): void;
}

interface RemotePeer {
  decoder: FrameDecoder;
  playbackNode: AudioWorkletNode;
  gain: GainNode;
}

const remotePeers = new Map<number, RemotePeer>();
const speakingPeers = new Map<number, string>();
const speakingListeners: Array<() => void> = [];
const capsListeners: Array<() => void> = [];

let inVoice = false;
let listenOnly = false;
let pttActive = false;
let localOpenMic = false;
let lastEmittedSpeak = false;
let vcMuted = false;
let outputVolume = 1;
let currentDeviceId: string | null = null;

function webCodecsSupported(): boolean {
  if (typeof globalThis === "undefined") return false;
  const g = globalThis as unknown as {
    AudioEncoder?: unknown;
    AudioDecoder?: unknown;
    AudioData?: unknown;
    EncodedAudioChunk?: unknown;
  };
  return (
    typeof g.AudioEncoder === "function" &&
    typeof g.AudioDecoder === "function" &&
    typeof g.AudioData === "function" &&
    typeof g.EncodedAudioChunk === "function"
  );
}

function notifyCapsUpdated() {
  for (let i = 0; i < capsListeners.length; i++) {
    try {
      capsListeners[i]();
    } catch (e) {
      console.error(e);
    }
  }
  try {
    if (typeof window !== "undefined" && typeof CustomEvent === "function") {
      window.dispatchEvent(new CustomEvent("voice-caps-updated"));
    }
  } catch (_e) {
    // CustomEvent may be unavailable in unusual environments
  }
}

export function onCapsChange(listener: () => void): () => void {
  capsListeners.push(listener);
  return () => {
    const idx = capsListeners.indexOf(listener);
    if (idx >= 0) capsListeners.splice(idx, 1);
  };
}

function notifySpeakingListeners() {
  for (let i = 0; i < speakingListeners.length; i++) {
    try {
      speakingListeners[i]();
    } catch (e) {
      console.error(e);
    }
  }
}

function b64encode(bytes: Uint8Array): string {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    s += String.fromCharCode.apply(
      null,
      bytes.subarray(i, Math.min(i + chunk, bytes.length)) as unknown as number[],
    );
  }
  return btoa(s);
}

function b64decode(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// Two worklet processors, registered once per AudioContext:
//   capture-processor  — chunks the mic stream into fixed-size frames and
//                        posts each frame to the main thread.
//   playback-processor — pulls decoded PCM frames from a queue fed by the
//                        main thread; primes with a few frames of buffer
//                        to absorb network jitter, drops back to silence
//                        and re-primes on underrun.
const WORKLET_CODE = `
class CaptureProcessor extends AudioWorkletProcessor {
  constructor(opts) {
    super(opts);
    const o = (opts && opts.processorOptions) || {};
    this.frameSamples = o.frameSamples | 0 || 960;
    this.buf = new Float32Array(this.frameSamples);
    this.pos = 0;
  }
  process(inputs, outputs) {
    const out = outputs[0];
    if (out && out[0]) out[0].fill(0);
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];
    let i = 0;
    while (i < ch.length) {
      const space = this.frameSamples - this.pos;
      const copy = Math.min(space, ch.length - i);
      this.buf.set(ch.subarray(i, i + copy), this.pos);
      this.pos += copy;
      i += copy;
      if (this.pos === this.frameSamples) {
        const frame = this.buf.slice(0);
        this.port.postMessage(frame, [frame.buffer]);
        this.pos = 0;
      }
    }
    return true;
  }
}
class PlaybackProcessor extends AudioWorkletProcessor {
  constructor(opts) {
    super(opts);
    const o = (opts && opts.processorOptions) || {};
    this.targetQueue = o.targetQueueFrames | 0 || 3;
    this.queue = [];
    this.cur = null;
    this.curPos = 0;
    this.primed = false;
    this.port.onmessage = (e) => {
      if (e.data === "reset") {
        this.queue = []; this.cur = null; this.curPos = 0; this.primed = false;
        return;
      }
      this.queue.push(e.data);
    };
  }
  process(_inputs, outputs) {
    const out = outputs[0][0];
    if (!out) return true;
    if (!this.primed) {
      if (this.queue.length < this.targetQueue) {
        out.fill(0);
        return true;
      }
      this.primed = true;
    }
    let outPos = 0;
    while (outPos < out.length) {
      if (!this.cur) {
        if (this.queue.length === 0) {
          for (; outPos < out.length; outPos++) out[outPos] = 0;
          this.primed = false;
          break;
        }
        this.cur = this.queue.shift();
        this.curPos = 0;
      }
      const remaining = this.cur.length - this.curPos;
      const space = out.length - outPos;
      const copy = Math.min(remaining, space);
      out.set(this.cur.subarray(this.curPos, this.curPos + copy), outPos);
      this.curPos += copy;
      outPos += copy;
      if (this.curPos >= this.cur.length) this.cur = null;
    }
    return true;
  }
}
registerProcessor('capture-processor', CaptureProcessor);
registerProcessor('playback-processor', PlaybackProcessor);
`;

async function ensureAudioContext(): Promise<AudioContext> {
  if (!audioCtx || audioCtx.state === "closed") {
    const Ctor: typeof AudioContext =
      (window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      }).AudioContext ||
      (window as unknown as {
        AudioContext?: typeof AudioContext;
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext!;
    audioCtx = new Ctor({ sampleRate: caps.sampleRate });
    // A freshly-created context needs a fresh worklet registration.
    workletReady = false;
  }
  // Worklet readiness is tied to the live AudioContext, not to "did we ever
  // call addModule" — retry on every call until it actually succeeds, so a
  // silent failure during the auto-join (non-gesture) path doesn't leave us
  // with an unusable context after the user clicks.
  if (!workletReady) {
    const blob = new Blob([WORKLET_CODE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    try {
      await audioCtx.audioWorklet.addModule(url);
      workletReady = true;
    } catch (e) {
      console.error("voice: AudioWorklet addModule failed", e);
      throw e;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  if (audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch (_e) {
      // resume may fail if not user-gesture-driven; caller can detect via state
    }
  }
  return audioCtx;
}

function isLocalTransmitting(): boolean {
  if (!inVoice || listenOnly) return false;
  return localOpenMic || (caps.pttOnly ? pttActive : true);
}

function syncSpeakState(): void {
  const want = isLocalTransmitting();
  if (want === lastEmittedSpeak) return;
  lastEmittedSpeak = want;
  if (inVoice) {
    client.server.send.VS_SPEAK({ on: want });
  }
  notifySpeakingListeners();
}

function buildAudioConstraints(): MediaTrackConstraints {
  const constraints: MediaTrackConstraints = {
    sampleRate: caps.sampleRate,
    channelCount: 1,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  if (currentDeviceId) {
    constraints.deviceId = { exact: currentDeviceId };
  }
  return constraints;
}

function emitEncodedFrame(bytes: Uint8Array): void {
  if (!isLocalTransmitting()) return;
  const b64 = b64encode(bytes);
  if (caps.maxFrameBytes > 0 && b64.length > caps.maxFrameBytes) {
    // Server would drop oversize frames anyway
    return;
  }
  client.server.send.VS_FRAME({ payload: b64 });
}

async function createWebCodecsFrameEncoder(): Promise<FrameEncoder> {
  const encoderConfig: AudioEncoderConfig = {
    codec: caps.codec,
    sampleRate: caps.sampleRate,
    numberOfChannels: 1,
    bitrate: 24000,
  };
  const support = await AudioEncoder.isConfigSupported(encoderConfig);
  if (!support.supported) {
    throw new Error(
      `AudioEncoder config not supported: codec=${caps.codec} sampleRate=${caps.sampleRate}`,
    );
  }

  let timestampUs = 0;
  const encoder = new AudioEncoder({
    output: (chunk: EncodedAudioChunk) => {
      const buf = new Uint8Array(chunk.byteLength);
      chunk.copyTo(buf);
      emitEncodedFrame(buf);
    },
    error: (e: DOMException) => {
      console.error("voice: encoder error", e);
    },
  });
  encoder.configure(encoderConfig);

  return {
    encode(pcm: Float32Array) {
      if (encoder.state !== "configured") return;
      const data = new AudioData({
        format: "f32-planar",
        sampleRate: caps.sampleRate,
        numberOfFrames: pcm.length,
        numberOfChannels: 1,
        timestamp: timestampUs,
        // Float32Array's generic ArrayBufferLike doesn't satisfy BufferSource in
        // TS 5.9's stricter lib.dom; the runtime accepts it.
        data: pcm as unknown as BufferSource,
      });
      timestampUs += Math.round((pcm.length / caps.sampleRate) * 1_000_000);
      try {
        encoder.encode(data);
      } finally {
        data.close();
      }
    },
    close() {
      try { encoder.close(); } catch (_e) { /* ignore */ }
    },
  };
}

async function createWasmFrameEncoder(frameSamples: number): Promise<FrameEncoder> {
  const { createEncoder, Application } = await import("libopus-wasm");
  const handle = await createEncoder({
    channels: 1,
    sampleRate: caps.sampleRate as WasmOpusSampleRate,
    frameSize: frameSamples,
    application: Application.Voip,
  });
  return {
    encode(pcm: Float32Array) {
      try {
        emitEncodedFrame(handle.encodeFloat(pcm));
      } catch (e) {
        console.error("voice: wasm opus encode failed", e);
      }
    },
    close() {
      try { handle.free(); } catch (_e) { /* ignore */ }
    },
  };
}

// Prefers the native WebCodecs codec (hardware-accelerated on many
// platforms); falls back to the WASM libopus build — used on Firefox
// mobile, which never shipped WebCodecs' AudioEncoder/AudioDecoder — for
// anything that fails or is missing outright.
async function createFrameEncoder(frameSamples: number): Promise<FrameEncoder> {
  if (webCodecsSupported()) {
    try {
      return await createWebCodecsFrameEncoder();
    } catch (e) {
      console.warn("voice: WebCodecs encoder unavailable, falling back to WASM opus", e);
    }
  }
  return createWasmFrameEncoder(frameSamples);
}

async function startCapture(): Promise<void> {
  if (!localStream) return;
  const ctx = await ensureAudioContext();
  if (ctx.state !== "running") {
    console.warn(
      `voice: AudioContext is "${ctx.state}" after resume — audio may not flow until the user interacts again.`,
    );
  }
  const frameSamples = Math.max(1, Math.round((caps.sampleRate * caps.frameMs) / 1000));

  try {
    captureSourceNode = ctx.createMediaStreamSource(localStream);
  } catch (e) {
    console.error("voice: createMediaStreamSource failed", e);
    throw e;
  }
  try {
    captureNode = new AudioWorkletNode(ctx, "capture-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { frameSamples },
    });
  } catch (e) {
    console.error(
      "voice: AudioWorkletNode construction failed (worklet may not have loaded)",
      e,
    );
    throw e;
  }
  // Sink at zero gain — keeps the worklet ticking without monitoring the mic
  // through the local speakers (which would cause feedback).
  captureSink = ctx.createGain();
  captureSink.gain.value = 0;

  try {
    frameEncoder = await createFrameEncoder(frameSamples);
  } catch (e) {
    console.error("voice: failed to create frame encoder", e);
    throw e;
  }

  captureNode.port.onmessage = (ev: MessageEvent) => {
    if (!frameEncoder || !isLocalTransmitting()) return;
    frameEncoder.encode(ev.data as Float32Array);
  };

  captureSourceNode.connect(captureNode);
  captureNode.connect(captureSink);
  captureSink.connect(ctx.destination);
}

function stopCapture(): void {
  if (captureSourceNode) {
    try { captureSourceNode.disconnect(); } catch (_e) { /* ignore */ }
    captureSourceNode = null;
  }
  if (captureNode) {
    try { captureNode.port.onmessage = null; } catch (_e) { /* ignore */ }
    try { captureNode.disconnect(); } catch (_e) { /* ignore */ }
    captureNode = null;
  }
  if (captureSink) {
    try { captureSink.disconnect(); } catch (_e) { /* ignore */ }
    captureSink = null;
  }
  if (frameEncoder) {
    try { frameEncoder.close(); } catch (_e) { /* ignore */ }
    frameEncoder = null;
  }
  if (localStream) {
    const tracks = localStream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      try { tracks[i].stop(); } catch (_e) { /* ignore */ }
    }
    localStream = null;
  }
}

function createWebCodecsFrameDecoder(playbackNode: AudioWorkletNode, uid: number): FrameDecoder {
  const decoder = new AudioDecoder({
    output: (audioData: AudioData) => {
      const samples = audioData.numberOfFrames;
      const pcm = new Float32Array(samples);
      try {
        audioData.copyTo(pcm, { planeIndex: 0, format: "f32-planar" });
      } catch (_e) {
        try {
          audioData.copyTo(pcm, { planeIndex: 0 });
        } catch (e) {
          console.warn("voice: decoder copyTo failed", e);
        }
      }
      audioData.close();
      playbackNode.port.postMessage(pcm, [pcm.buffer]);
    },
    error: (e: DOMException) => {
      console.error(`voice: decoder error for peer ${uid}`, e);
    },
  });
  decoder.configure({
    codec: caps.codec,
    sampleRate: caps.sampleRate,
    numberOfChannels: 1,
  });
  return {
    decode(bytes: Uint8Array) {
      if (decoder.state !== "configured") return;
      try {
        const chunk = new EncodedAudioChunk({ type: "key", timestamp: 0, data: bytes });
        decoder.decode(chunk);
      } catch (e) {
        console.warn("voice: decode failed", e);
      }
    },
    close() {
      try {
        if (decoder.state !== "closed") decoder.close();
      } catch (_e) { /* ignore */ }
    },
  };
}

async function createWasmFrameDecoder(playbackNode: AudioWorkletNode): Promise<FrameDecoder> {
  const { createDecoder } = await import("libopus-wasm");
  const handle = await createDecoder({
    channels: 1,
    sampleRate: caps.sampleRate as WasmOpusSampleRate,
  });
  return {
    decode(bytes: Uint8Array) {
      try {
        const pcm = handle.decodeFloat(bytes);
        playbackNode.port.postMessage(pcm, [pcm.buffer]);
      } catch (e) {
        console.warn("voice: wasm opus decode failed", e);
      }
    },
    close() {
      try { handle.free(); } catch (_e) { /* ignore */ }
    },
  };
}

async function createFrameDecoder(
  playbackNode: AudioWorkletNode,
  uid: number,
): Promise<FrameDecoder | null> {
  if (webCodecsSupported()) {
    try {
      return createWebCodecsFrameDecoder(playbackNode, uid);
    } catch (e) {
      console.warn(
        `voice: WebCodecs decoder unavailable for peer ${uid}, falling back to WASM opus`,
        e,
      );
    }
  }
  try {
    return await createWasmFrameDecoder(playbackNode);
  } catch (e) {
    console.error(`voice: failed to create any decoder for peer ${uid}`, e);
    return null;
  }
}

async function createRemotePeer(uid: number): Promise<RemotePeer | null> {
  const ctx = await ensureAudioContext();
  const playbackNode = new AudioWorkletNode(ctx, "playback-processor", {
    numberOfInputs: 0,
    numberOfOutputs: 1,
    outputChannelCount: [1],
    processorOptions: { targetQueueFrames: 3 },
  });
  const gain = ctx.createGain();
  gain.gain.value = vcMuted ? 0 : outputVolume;
  playbackNode.connect(gain).connect(ctx.destination);

  const decoder = await createFrameDecoder(playbackNode, uid);
  if (!decoder) {
    try { playbackNode.disconnect(); } catch (_e) { /* ignore */ }
    try { gain.disconnect(); } catch (_e) { /* ignore */ }
    return null;
  }

  const peer: RemotePeer = { decoder, playbackNode, gain };
  remotePeers.set(uid, peer);
  return peer;
}

function teardownPeer(uid: number): void {
  const peer = remotePeers.get(uid);
  if (!peer) return;
  try { peer.decoder.close(); } catch (_e) { /* ignore */ }
  try { peer.playbackNode.port.postMessage("reset"); } catch (_e) { /* ignore */ }
  try { peer.playbackNode.disconnect(); } catch (_e) { /* ignore */ }
  try { peer.gain.disconnect(); } catch (_e) { /* ignore */ }
  remotePeers.delete(uid);
  if (speakingPeers.delete(uid)) notifySpeakingListeners();
}

function teardownAllPeers(): void {
  const uids: number[] = [];
  remotePeers.forEach((_p, uid) => uids.push(uid));
  for (let i = 0; i < uids.length; i++) teardownPeer(uids[i]);
}

function teardownAll(): void {
  stopCapture();
  teardownAllPeers();
  inVoice = false;
  listenOnly = false;
  pttActive = false;
  lastEmittedSpeak = false;
  speakingPeers.clear();
  notifySpeakingListeners();
}

export function applyVoiceCaps(
  enabled: boolean,
  pttOnly: boolean,
  maxPeers: number,
  codec: string,
  sampleRate: number,
  frameMs: number,
  maxFrameBytes: number,
): void {
  caps = {
    enabled,
    pttOnly,
    maxPeers,
    codec: codec || "opus",
    sampleRate: sampleRate || 48000,
    frameMs: frameMs || 20,
    maxFrameBytes: maxFrameBytes || 0,
  };
  console.debug(
    `voice: caps applied enabled=${enabled} ptt=${pttOnly} maxPeers=${maxPeers} codec=${caps.codec} sr=${caps.sampleRate} frame=${caps.frameMs}ms maxBytes=${caps.maxFrameBytes}`,
  );
  if (!enabled && inVoice) {
    teardownAll();
  }
  notifyCapsUpdated();
}

export function isVoiceAvailable(): boolean {
  return caps.enabled;
}

export function isPTTOnly(): boolean {
  return caps.pttOnly;
}

export function isInVoice(): boolean {
  return inVoice;
}

export function isListenOnly(): boolean {
  return listenOnly;
}

export async function joinVoiceListenOnly(): Promise<void> {
  if (!caps.enabled || inVoice) return;
  try {
    await ensureAudioContext();
  } catch (e) {
    console.error("voice: failed to create AudioContext", e);
    return;
  }
  inVoice = true;
  listenOnly = true;
  client.server.send.VS_JOIN({});
  syncSpeakState();
}

export async function joinVoice(): Promise<void> {
  if (!caps.enabled) return;
  if (inVoice && !listenOnly) return;

  const wasListenOnly = listenOnly;
  // Resume the AudioContext before getUserMedia so the resume() call lands
  // within the same transient user-activation window as the click.
  try {
    await ensureAudioContext();
  } catch (e) {
    console.error("voice: ensureAudioContext failed", e);
    throw e;
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(),
    });
  } catch (e) {
    console.error("Microphone permission denied or unavailable", e);
    throw e;
  }
  localStream = stream;
  try {
    await startCapture();
  } catch (e) {
    console.error("voice: failed to start capture", e);
    stopCapture();
    throw e;
  }
  if (!wasListenOnly) {
    inVoice = true;
    client.server.send.VS_JOIN({});
  }
  listenOnly = false;
  syncSpeakState();
}

export function leaveVoice(): void {
  if (!inVoice) return;
  if (lastEmittedSpeak) {
    lastEmittedSpeak = false;
    client.server.send.VS_SPEAK({ on: false });
  }
  client.server.send.VS_LEAVE({});
  teardownAll();
  notifyCapsUpdated();
}

export function setPTT(active: boolean): void {
  if (!inVoice) return;
  if (pttActive === active) return;
  pttActive = active;
  syncSpeakState();
}

export function isLocalOpenMic(): boolean {
  return localOpenMic;
}

export function setLocalOpenMic(enabled: boolean): void {
  if (localOpenMic === enabled) return;
  localOpenMic = enabled;
  syncSpeakState();
}

export async function handlePeerJoined(uid: number): Promise<void> {
  if (!inVoice || uid === client.playerID) return;
  if (caps.maxPeers > 0 && remotePeers.size >= caps.maxPeers) return;
  if (remotePeers.has(uid)) return;
  await createRemotePeer(uid);
}

export function handlePeerLeft(uid: number): void {
  teardownPeer(uid);
}

export async function handleInitialPeers(uids: number[]): Promise<void> {
  if (!inVoice) return;
  for (let i = 0; i < uids.length; i++) {
    const uid = uids[i];
    if (uid === client.playerID) continue;
    if (caps.maxPeers > 0 && remotePeers.size >= caps.maxPeers) break;
    if (remotePeers.has(uid)) continue;
    await createRemotePeer(uid);
  }
}

export function handleRemoteAudio(fromUid: number, b64: string): void {
  if (!inVoice) return;
  // Defensive: server should never echo our own audio back, but if it does, drop.
  if (fromUid === client.playerID) return;
  const peer = remotePeers.get(fromUid);
  if (!peer) {
    // Frame arrived before VS_JOIN — create the peer on demand.
    if (caps.maxPeers > 0 && remotePeers.size >= caps.maxPeers) return;
    void createRemotePeer(fromUid).then((p) => {
      if (p) feedDecoder(p, b64);
    });
    return;
  }
  feedDecoder(peer, b64);
}

function feedDecoder(peer: RemotePeer, b64: string): void {
  let bytes: Uint8Array;
  try {
    bytes = b64decode(b64);
  } catch (e) {
    console.warn("voice: failed to base64-decode incoming frame", e);
    return;
  }
  if (bytes.byteLength === 0) return;
  peer.decoder.decode(bytes);
}

export function notifyRemoteSpeaking(uid: number, on: boolean): void {
  if (uid === client.playerID) return;
  const label = resolveDisplayName(uid);
  const changed = on ? !speakingPeers.has(uid) : speakingPeers.has(uid);
  if (on) {
    speakingPeers.set(uid, label);
  } else {
    speakingPeers.delete(uid);
  }
  if (changed) notifySpeakingListeners();
}

export function onSpeakingChange(listener: () => void): () => void {
  speakingListeners.push(listener);
  return () => {
    const idx = speakingListeners.indexOf(listener);
    if (idx >= 0) speakingListeners.splice(idx, 1);
  };
}

export function getSpeakingLabels(): string[] {
  const labels: string[] = [];
  speakingPeers.forEach((label) => labels.push(label));
  return labels;
}

export function getSpeakingUids(): number[] {
  const uids: number[] = [];
  speakingPeers.forEach((_label, uid) => uids.push(uid));
  return uids;
}

export function isLocalSpeaking(): boolean {
  return isLocalTransmitting();
}

export function getLocalPlayerID(): number {
  return client ? client.playerID : -1;
}

function resolveDisplayName(uid: number): string {
  if (client && client.playerlist) {
    const entry = client.playerlist.get(uid);
    if (entry) {
      return entry.showName || entry.name || entry.charName || `Peer ${uid}`;
    }
  }
  return `Peer ${uid}`;
}

export function getSpeakerDisplayName(uid: number): string {
  return resolveDisplayName(uid);
}

export async function setInputDevice(deviceId: string): Promise<void> {
  const normalized = deviceId || null;
  if (normalized === currentDeviceId) return;
  currentDeviceId = normalized;
  if (!localStream) return;
  // Rebuild the capture pipeline on the new device.
  let newStream: MediaStream;
  try {
    newStream = await navigator.mediaDevices.getUserMedia({
      audio: buildAudioConstraints(),
    });
  } catch (e) {
    console.error("Failed to switch microphone", e);
    throw e;
  }
  stopCapture();
  localStream = newStream;
  await startCapture();
}

export function getInputDeviceId(): string | null {
  return currentDeviceId;
}

export function setOutputVolume(volume: number): void {
  const clamped = Math.max(0, Math.min(1, volume));
  outputVolume = clamped;
  if (!vcMuted) {
    remotePeers.forEach((peer) => {
      peer.gain.gain.value = clamped;
    });
  }
}

export function getOutputVolume(): number {
  return outputVolume;
}

export function isVCMuted(): boolean {
  return vcMuted;
}

export function setVCMuted(muted: boolean): void {
  vcMuted = muted;
  const vol = muted ? 0 : outputVolume;
  remotePeers.forEach((peer) => {
    peer.gain.gain.value = vol;
  });
}

// ---------------------------------------------------------------------
// Inbound packet handlers. Registered against the aolib session in
// `src/packets.ts` and dispatched on s2c traffic.
// ---------------------------------------------------------------------

import { installVoiceUI } from "./voiceUI";
import type * as aolib from "../aolib";

/** VS_CAPS: server announces voice subsystem capabilities (idempotent). */
export function applyVoiceCapabilities(packet: aolib.VS_CAPS) {
  console.debug(
    `voice: VS_CAPS received enabled=${packet.enabled} ptt=${packet.pttOnly} maxPeers=${packet.maxPeers} codec=${packet.codec} sr=${packet.sampleRate} frame=${packet.frameMs}ms maxBytes=${packet.maxFrameBytes}`,
  );
  installVoiceUI();
  applyVoiceCaps(
    packet.enabled,
    packet.pttOnly,
    packet.maxPeers,
    packet.codec,
    packet.sampleRate,
    packet.frameMs,
    packet.maxFrameBytes,
  );
}

/** VS_PEERS: initial list of voice-active peer uids when we join. */
export function applyVoicePeerList(packet: aolib.VS_PEERS) {
  void handleInitialPeers(packet.uids);
}

/** VS_JOIN: a remote peer joined the voice mesh. */
export function handleVoicePeerJoin(packet: aolib.VS_JOINBroadcast) {
  if (!Number.isFinite(packet.uid)) return;
  void handlePeerJoined(packet.uid);
}

/**
 * VS_LEAVE: a remote peer left the voice mesh. If it's our own uid
 * (server auto-kicked us, e.g. on area change or `/voicearea off`),
 * we tear down locally instead.
 */
export function handleVoicePeerLeave(packet: aolib.VS_LEAVEBroadcast) {
  if (!Number.isFinite(packet.uid)) return;
  if (packet.uid === client.playerID) {
    leaveVoice();
  } else {
    handlePeerLeft(packet.uid);
  }
}

/** VS_SPEAK: a remote peer toggled their speaking-state indicator. */
export function applyVoicePeerSpeak(packet: aolib.VS_SPEAKBroadcast) {
  if (!Number.isFinite(packet.uid)) return;
  notifyRemoteSpeaking(packet.uid, packet.on);
}

/** VS_AUDIO: opus audio frame from a remote peer; play it. */
export function handleVoiceAudio(packet: aolib.VS_AUDIO) {
  if (!Number.isFinite(packet.fromUid) || !packet.payload) return;
  handleRemoteAudio(packet.fromUid, packet.payload);
}
