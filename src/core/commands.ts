import { reactive } from "@vue/reactivity";
import {
  EmoteModifier,
  Flip,
  PenaltyBar,
  ShoutModifier,
  Side,
  TextColor,
  type DeskModifier,
  type RTAnimation,
} from "aolib-ts";
import { currentConnection } from "./connection";
import { state } from "./state";
import { on } from "./events";
import { settings, setSetting } from "./settings";

/** One emote from the character's char.ini, as sent in MS. */
export interface EmoteSpec {
  preanim: string;
  anim: string;
  modifier: EmoteModifier;
  deskModifier: DeskModifier;
  sfx: string;
  sfxDelay: number;
}

/** Everything the next IC message is built from. The UI edits it in place. */
export interface ICDraft {
  message: string;
  emote: EmoteSpec | null;
  /** Position to speak from; the UI fills in the character's default. */
  side: Side;
  showname: string;
  shout: ShoutModifier;
  color: TextColor;
  /** Evidence index to present, or -1. */
  evidence: number;
  flip: boolean;
  flash: boolean;
  screenshake: boolean;
  sendPreanim: boolean;
  sendSfx: boolean;
  nonInterrupting: boolean;
  loopSfx: boolean;
  additive: boolean;
  effect: { name: string; folder: string; sound: string };
  pair: { charId: number; order: number; offset: { x: number; y: number } };
}

const emptyDraft = (): ICDraft => ({
  message: "",
  emote: null,
  side: Side.wit,
  showname: "",
  shout: ShoutModifier.none,
  color: TextColor.white,
  evidence: -1,
  flip: false,
  flash: false,
  screenshake: false,
  sendPreanim: false,
  sendSfx: false,
  nonInterrupting: false,
  loopSfx: false,
  additive: false,
  effect: { name: "", folder: "", sound: "" },
  pair: { charId: -1, order: 0, offset: { x: 0, y: 0 } },
});

export const draft: ICDraft = reactive(emptyDraft());

/** Clears the per-message parts of the draft, keeping pose, pairing and toggles. */
export function resetDraftAfterSend() {
  draft.message = "";
  draft.shout = ShoutModifier.none;
  draft.flash = false;
  draft.screenshake = false;
  draft.sendPreanim = false;
  draft.sendSfx = false;
}

on("icMessage", (p) => {
  if (p.char_id === state.self.charId && p.char_id >= 0) resetDraftAfterSend();
});

function server() {
  const conn = currentConnection();
  if (!conn) throw new Error("not connected");
  return conn.server.send;
}

/** The emote modifier to send: the preanim checkbox flips only the plain no-preanim/preanim pair. */
function emoteModifier(emote: EmoteSpec, sendPreanim: boolean): EmoteModifier {
  if (sendPreanim && emote.modifier === EmoteModifier.no_preanim) return EmoteModifier.preanim;
  if (!sendPreanim && emote.modifier === EmoteModifier.preanim) return EmoteModifier.no_preanim;
  return emote.modifier;
}

/** Sends the draft as an IC message. Returns false if there is nothing to send with. */
export function sendIC(): boolean {
  const character = state.characters[state.self.charId];
  const { emote } = draft;
  if (!character || !emote) return false;

  server().MS({
    desk_modifier: emote.deskModifier,
    preanim: emote.preanim,
    character: character.name,
    emote: emote.anim,
    message: draft.message,
    side: draft.side,
    sfx_name: draft.sendSfx ? emote.sfx : "0",
    emote_modifier: emoteModifier(emote, draft.sendPreanim),
    char_id: state.self.charId,
    sfx_delay: draft.sendSfx ? emote.sfxDelay : 0,
    shout_modifier: draft.shout,
    evidence_id: draft.evidence + 1,
    flip: draft.flip ? Flip.horizontal : Flip.none,
    realization: draft.flash,
    text_color: draft.color,
    showname: draft.showname,
    paired_charid: draft.pair.charId,
    paired_order: draft.pair.order,
    offset: { ...draft.pair.offset },
    noninterrupting_preanim: draft.nonInterrupting,
    sfx_looping: draft.loopSfx,
    screenshake: draft.screenshake,
    frames_shake: "-",
    frames_realization: "-",
    frames_sfx: "-",
    additive: draft.additive,
    effect: { ...draft.effect },
  });
  return true;
}

/** Sends an OOC message (or server command) under the saved OOC name. */
export function sendOOC(message: string, name = settings.oocName) {
  if (name !== settings.oocName) setSetting("oocName", name);
  server().CT({ name, message });
}

/** Asks to play as a character; -1 spectates. */
export function pickCharacter(charId: number, password = "none") {
  // Some servers reject an empty password, hence the sentinel.
  server().CC({ player_id: state.server.playerId, char_id: charId, char_password: password });
}

export function changeArea(index: number) {
  const area = state.areas[index];
  if (!area) return;
  server().MC({ name: area.name, char_id: state.self.charId });
  state.self.areaId = index;
}

export function playMusic(track: string) {
  server().MC({ name: track, char_id: state.self.charId });
}

export function callMod(reason: string) {
  server().ZZ({ reason });
}

export interface EvidenceInput {
  name: string;
  description: string;
  image: string;
}

export function addEvidence(evidence: EvidenceInput) {
  server().PE({ ...evidence });
}

export function editEvidence(id: number, evidence: EvidenceInput) {
  server().EE({ id, ...evidence });
}

export function deleteEvidence(id: number) {
  server().DE({ id });
}

export function playTestimony(animation: RTAnimation) {
  server().RT({ animation });
}

/** Moves a health bar by `delta`, clamped to the 0..10 the server accepts. */
export function changeHealth(bar: PenaltyBar, delta: number) {
  const key = bar === PenaltyBar.defense ? "defense" : "prosecution";
  const value = Math.min(10, Math.max(0, state.court.hp[key] + delta));
  server().HP({ bar, value });
}

/** Kicks when `minutes` is 0, bans otherwise. */
export function removePlayer(playerId: number, reason: string, minutes = 0) {
  server().MA({ player_id: playerId, duration_minutes: minutes, reason });
}

export function setMuted(charId: number, muted: boolean) {
  const list = state.self.muted;
  const i = list.indexOf(charId);
  if (muted && i < 0) list.push(charId);
  if (!muted && i >= 0) list.splice(i, 1);
}
