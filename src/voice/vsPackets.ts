// Voice-sync (VS_*) packets. These are a LemmyAO transport extension, not part
// of the AO meta spec, so aolib-ts carries them through its custom channel
// (sendCustom/onCustom) rather than the typed send/on maps. Each header must be
// registered via registerPacket; registerVoiceCodecs() installs the fanta and
// JSON forms.
//
// Wire protocol (`#` separator, `%` terminator; base64 needs no escaping):
//   Server -> client
//     VS_CAPS#<enabled>#<ptt_only>#<max_peers>#<codec>#<sample_rate>#<frame_ms>#<max_frame_bytes>#%
//     VS_PEERS#<csv_uids>#%
//     VS_JOIN#<uid>#%
//     VS_LEAVE#<uid>#%
//     VS_SPEAK#<uid>#<on_off>#%
//     VS_AUDIO#<from_uid>#<b64_opus>#%
//   Client -> server
//     VS_JOIN#%   VS_LEAVE#%   VS_FRAME#<b64_opus>#%   VS_SPEAK#<on_off>#%

import { registerPacket, type FantaForm, type JsonForm } from "aolib-ts";

// client -> server
export interface VS_JOIN {
  $header: "VS_JOIN";
}
export interface VS_LEAVE {
  $header: "VS_LEAVE";
}
export interface VS_FRAME {
  $header: "VS_FRAME";
  payload: string;
}
export interface VS_SPEAK {
  $header: "VS_SPEAK";
  on: boolean;
}

// server -> client
export interface VS_CAPS {
  $header: "VS_CAPS";
  enabled: boolean;
  pttOnly: boolean;
  maxPeers: number;
  codec: string;
  sampleRate: number;
  frameMs: number;
  maxFrameBytes: number;
}
export interface VS_PEERS {
  $header: "VS_PEERS";
  uids: number[];
}
export interface VS_JOINToClient {
  $header: "VS_JOIN";
  uid: number;
}
export interface VS_LEAVEToClient {
  $header: "VS_LEAVE";
  uid: number;
}
export interface VS_SPEAKToClient {
  $header: "VS_SPEAK";
  uid: number;
  on: boolean;
}
export interface VS_AUDIO {
  $header: "VS_AUDIO";
  fromUid: number;
  payload: string;
}

const bool = (s: string) => s === "1";
const onoff = (b: unknown) => (b ? "1" : "0");

// Every custom packet defines both wire forms; JSON is the object verbatim (the
// library puts $header first), fanta is positional. Headers VS_JOIN/VS_LEAVE/
// VS_SPEAK are shared across directions, so each form encodes the c2s shape and
// decodes the s2c shape.
const jsonForm: JsonForm = {
  encode: (p) => JSON.stringify(p),
  decode: (raw) => JSON.parse(raw) as Record<string, unknown>,
};
const pkt = (fanta: FantaForm) => ({ fanta, json: jsonForm });

export function registerVoiceCodecs(): void {
  registerPacket("VS_JOIN", pkt({
    encode: () => [],
    decode: (a) => ({ uid: Number(a[0]) }),
  }));
  registerPacket("VS_LEAVE", pkt({
    encode: () => [],
    decode: (a) => ({ uid: Number(a[0]) }),
  }));
  registerPacket("VS_FRAME", pkt({
    encode: (p) => [String(p.payload)],
    decode: (a) => ({ payload: a[0] }),
  }));
  registerPacket("VS_SPEAK", pkt({
    encode: (p) => [onoff(p.on)],
    decode: (a) => ({ uid: Number(a[0]), on: bool(a[1]) }),
  }));
  registerPacket("VS_AUDIO", pkt({
    encode: (p) => [String(p.fromUid), String(p.payload)],
    decode: (a) => ({ fromUid: Number(a[0]), payload: a[1] }),
  }));
  registerPacket("VS_CAPS", pkt({
    encode: (p) => [
      onoff(p.enabled),
      onoff(p.pttOnly),
      String(p.maxPeers),
      String(p.codec),
      String(p.sampleRate),
      String(p.frameMs),
      String(p.maxFrameBytes),
    ],
    decode: (a) => ({
      enabled: bool(a[0]),
      pttOnly: bool(a[1]),
      maxPeers: Number(a[2]),
      codec: a[3],
      sampleRate: Number(a[4]),
      frameMs: Number(a[5]),
      maxFrameBytes: Number(a[6]),
    }),
  }));
  registerPacket("VS_PEERS", pkt({
    encode: (p) => [(p.uids as number[]).join(",")],
    decode: (a) => ({ uids: a[0] ? a[0].split(",").map(Number) : [] }),
  }));
}
