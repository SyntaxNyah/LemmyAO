/**
 * Protocol dispatch table.
 *
 * One line per packet, mapping each header to its domain-action handler.
 * The handlers live in the modules that own the domain they touch
 * (voice handlers in `src/voice/voice.ts`, character handlers in
 * `src/client/prefetchPlayerCharacter.ts`, etc.); this file is just the
 * wiring layer that hooks them up to the aolib session at startup.
 *
 * The `on("PU", prefetchPlayerCharacter)` form checks
 * the handler signature against the schema at compile time. Wrong-
 * direction registrations are caught both statically (aolib's mapped
 * types) and at runtime (aolib throws a role-aware error). Wire-format
 * encode/decode, defaults, and chat-escape are all owned by aolib.
 */

import * as aolib from "aolib-ts";
import type { CoreHandlers } from "./core/protocol";

// ---------------------------------------------------------------------
// Server -> client handlers.
// ---------------------------------------------------------------------


// Assets
import { applyAssetOrigin } from "./client/aoHost";



// Character downloads

// Character pick

// Character availability grid

// Chat (OOC + modcall)


// Feature flags

// Handshake
import { finishServerJoin } from "./client/handshake";




// Mod authentication
import { applyModAuth } from "./dom/applyModAuth";

// Player roster
import { prefetchPlayerCharacter } from "./client/prefetchPlayerCharacter";

// Server counts (kicks off download)
import { applyServerCounts } from "./client/fetchLists";


// Voice
import {
  applyVoiceCapabilities,
  applyVoicePeerList,
  applyVoicePeerSpeak,
  handleVoiceAudio,
  handleVoicePeerJoin,
  handleVoicePeerLeave,
} from "./voice/voice";
import { registerVoiceCodecs } from "./voice/vsPackets";
import { applyGroupPair, registerGroupPairCodec } from "./groupPair";

// ---------------------------------------------------------------------
// Client -> server handlers (replay-mode synthesis only).
// ---------------------------------------------------------------------

import {
  onAreaCharRequest,
  onCharacterChoose,
  onCharacterListRequest,
  onClientIdentified,
  onClientIdentify,
  onMusicListRequest,
  onReady,
} from "./client/replay";

// ---------------------------------------------------------------------
// Registration. Called once from client.ts after both sessions exist.
// ---------------------------------------------------------------------

export function registerProtocol(
  server: aolib.ServerSession,
  clientSession: aolib.ClientSession,
  core: CoreHandlers = {},
): void {
  // Each header gets one handler: the core state update runs first, then the
  // legacy DOM handler that renders it.
  type S2C = aolib.packets.S2COutputs;
  const on = <H extends keyof S2C>(header: H, legacy: (packet: S2C[H]) => void = () => {}) => {
    const first = core[header] as ((packet: S2C[H]) => void) | undefined;
    const handler = first
      ? (packet: S2C[H]) => {
        first(packet);
        legacy(packet);
      }
      : legacy;
    (server.on[header] as (h: (packet: S2C[H]) => void) => void)(handler);
  };

  registerVoiceCodecs();
  registerGroupPairCodec();

  // ---- server -> client ----
  on("ARUP");
  on("ASS", applyAssetOrigin);
  on("AUTH", applyModAuth);
  on("BB");
  on("BD");
  on("BN");
  on("CASEA");
  on("CHECK");
  on("CharsCheck");
  on("CI");
  on("CT");
  on("decryptor");
  on("DONE", finishServerJoin);
  on("EI");
  on("EM");
  on("FA");
  on("FL");
  on("FM");
  on("HP");
  on("ID");
  on("JD");
  on("KB");
  on("KK");
  on("LE");
  on("MC");
  on("MS");
  on("PN");
  on("PR");
  on("PU", prefetchPlayerCharacter);
  on("PV");
  on("RMC");
  on("RT");
  on("SC");
  on("SI", applyServerCounts);
  on("SM");
  on("SP");
  on("TI");
  // VS_* are a LemmyAO transport extension, not part of the meta spec, so they
  // ride aolib-ts's custom channel (codecs in ./voice/vsPackets).
  server.onCustom("VS_AUDIO", handleVoiceAudio);
  server.onCustom("VS_CAPS", applyVoiceCapabilities);
  server.onCustom("VS_JOIN", handleVoicePeerJoin);
  server.onCustom("VS_LEAVE", handleVoicePeerLeave);
  server.onCustom("VS_PEERS", applyVoicePeerList);
  server.onCustom("VS_SPEAK", applyVoicePeerSpeak);
  server.onCustom("GP", applyGroupPair);
  on("ZZ");

  // ---- client -> server (replay-mode synthesis) ----
  clientSession.on.askchaa(onAreaCharRequest);
  clientSession.on.CC(onCharacterChoose);
  clientSession.on.CH(() => {});              // client keepalive — no body
  clientSession.on.HI(onClientIdentify);
  clientSession.on.ID(onClientIdentified);
  clientSession.on.RC(onCharacterListRequest);
  clientSession.on.RD(onReady);
  clientSession.on.RM(onMusicListRequest);

  // Relay the player's own chat / OOC / music back to them, so acting-as-server
  // modes (replay, server) render what you send with no real server involved.
  clientSession.on.MS((packet) => clientSession.send.MS(packet as never));
  clientSession.on.CT((packet) => clientSession.send.CT(packet as never));
  clientSession.on.MC((packet) => clientSession.send.MC(packet as never));
}
