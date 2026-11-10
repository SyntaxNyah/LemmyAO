import { describe, test, expect, beforeEach } from "bun:test";
import {
  AuthState,
  DeskModifier,
  EmoteModifier,
  JudgeState,
  MusicChannel,
  PenaltyBar,
  PlayerDataType,
  PlayerListUpdate,
  RTAnimation,
  ShoutModifier,
  Side,
  TimerCommand,
  type packets,
} from "aolib-ts";
import { Connection } from "../core/connection";
import { coreHandlers } from "../core/protocol";
import { state, LOG_LIMIT } from "../core/state";
import {
  draft,
  sendIC,
  sendOOC,
  pickCharacter,
  changeArea,
  changeHealth,
  setMuted,
  resetDraftAfterSend,
  pairWith,
} from "../core/commands";
import { settings, setSetting } from "../core/settings";
import { icLogAsText, pairMentions } from "../core/log";
import { on } from "../core/events";

type C2S = keyof packets.C2SOutputs;
const REPLIES: C2S[] = ["HI", "ID", "askchaa", "RC", "RM", "RD", "CH"];
const COMMANDS: C2S[] = ["MS", "CC", "MC", "CT", "HP", "RT", "ZZ", "MA", "PE", "EE", "DE"];

let sent: string[];
/** Decoded packets the commands sent, in order. */
let outbound: { $header: string; [field: string]: unknown }[];
let conn: Connection;

/** A local-mode connection with only the core handlers, recording what it sends. */
function connect() {
  sent = [];
  outbound = [];
  conn = new Connection({
    url: "",
    local: true,
    disableJson: true,
    hdid: "hd",
    software: "LemmyAO",
    version: "test",
    register: (server, clientSession) => {
      const handlers = coreHandlers(conn) as Record<string, (p: unknown) => void>;
      for (const [header, fn] of Object.entries(handlers)) {
        (server.on as unknown as Record<string, (h: (p: unknown) => void) => void>)[header](fn);
      }
      for (const header of REPLIES) {
        (clientSession.on as unknown as Record<string, (h: () => void) => void>)[header](() =>
          sent.push(header),
        );
      }
      for (const header of COMMANDS) {
        (clientSession.on as unknown as Record<string, (h: (p: never) => void) => void>)[header](
          (p) => outbound.push(p),
        );
      }
    },
  });
  conn.connect();
}

const receive = (wire: string) => conn.server.receive(wire);

beforeEach(() => {
  state.server.assetHost = "https://attorneyoffline.de/base/";
  state.icLog.length = 0;
  state.oocLog.length = 0;
  connect();
});

describe("handshake", () => {
  test("local mode says hello right away", () => {
    expect(state.connection.status).toBe("handshaking");
    expect(sent).toEqual(["HI"]);
  });

  test("replies to each step and records server info", () => {
    receive("ID#3#akashi#1.9#%");
    receive("PN#5#100#a nice place#%");
    receive("SI#2#0#3#%");
    receive("SC#Phoenix&lawyer&0&#Edgeworth&prosecutor&0&#%");
    receive("SM#Lobby#Courtroom#== Music ==#trial.opus#%");
    receive("DONE#%");

    expect(sent).toEqual(["HI", "ID", "askchaa", "RC", "RM", "RD"]);
    expect(state.server).toMatchObject({
      playerId: 3,
      software: "akashi",
      playerCount: 5,
      maxPlayers: 100,
      description: "a nice place",
      charCount: 2,
      musicCount: 3,
    });
    expect(state.characters.map((c) => c.name)).toEqual(["Phoenix", "Edgeworth"]);
    expect(state.connection.status).toBe("joined");
    expect(state.connection.wasJoined).toBe(true);
  });

  test("emits joined once the server is done", () => {
    let joined = 0;
    const off = on("joined", () => joined++);
    receive("DONE#%");
    off();
    expect(joined).toBe(1);
  });

  test("reconnecting clears what the last session learned", () => {
    receive("SM#Lobby#a.opus#%");
    receive("KK#bye#%");
    connect();
    expect(state.areas).toEqual([]);
    expect(state.connection.removal).toBeNull();
  });
});

describe("areas and music", () => {
  test("the entry before the first song is a music category", () => {
    receive("SM#Lobby#Courtroom#== Music ==#trial.opus#cross.mp3#%");
    expect(state.areas.map((a) => a.name)).toEqual(["Lobby", "Courtroom"]);
    expect(state.music).toEqual(["== Music ==", "trial.opus", "cross.mp3"]);
  });

  test("ARUP updates one column with a value per area", () => {
    receive("SM#Lobby#Courtroom#== Music ==#x.opus#%");
    receive("ARUP#0#4#2#%");
    receive("ARUP#1#CASING#LOOKING-FOR-PLAYERS#%");
    receive("ARUP#3#FREE#LOCKED#%");
    expect(state.areas[0]).toMatchObject({ players: 4, status: "CASING", lock: "FREE" });
    expect(state.areas[1]).toMatchObject({ players: 2, status: "LOOKING-FOR-PLAYERS", lock: "LOCKED" });
  });

  test("ARUP before the area list is ignored", () => {
    receive("ARUP#0#4#2#%");
    expect(state.areas).toEqual([]);
  });

  test("FA and FM replace their lists", () => {
    receive("SM#Lobby#a.opus#b.opus#%");
    receive("FA#One#Two#%");
    receive("FM#c.opus#%");
    expect(state.areas.map((a) => a.name)).toEqual(["One", "Two"]);
    expect(state.music).toEqual(["c.opus"]);
  });
});

describe("characters", () => {
  test("CharsCheck marks taken slots", () => {
    receive("SC#A#B#C#%");
    receive("CharsCheck#-1#0#-1#%");
    expect(state.characters.map((c) => c.taken)).toEqual([true, false, true]);
  });

  test("PV sets our character", () => {
    receive("PV#3#CID#7#%");
    expect(state.self.charId).toBe(7);
  });
});

describe("server notices", () => {
  test("features are recorded", () => {
    receive("FL#yellowtext#flipping#%");
    expect(state.server.features).toEqual(["yellowtext", "flipping"]);
  });

  test("the server asset host replaces only the default one", () => {
    receive("ASS#https://assets.example/base/#%");
    expect(state.server.assetHost).toBe("https://assets.example/base/");
    receive("ASS#https://other.example/#%");
    expect(state.server.assetHost).toBe("https://assets.example/base/");
  });

  test("an explicit asset host is kept", () => {
    state.server.assetHost = "https://mine.example/";
    receive("ASS#https://assets.example/base/#%");
    expect(state.server.assetHost).toBe("https://mine.example/");
  });

  test("kicks and bans are recorded", () => {
    receive("KK#spamming#%");
    expect(state.connection.removal).toEqual({ kind: "kicked", reason: "spamming" });
    receive("KB#for real#%");
    expect(state.connection.removal).toEqual({ kind: "banned", reason: "for real" });
  });
});

describe("court and logs", () => {
  const server = () => conn.clientSession.send;

  test("evidence list and single updates", () => {
    server().LE({ evidence: [{ name: "Badge", description: "Shiny", image: "badge.png" }] });
    server().EI({ id: 1, details: { name: "Knife", description: "Sharp", type: "", image: "knife.png" } } as never);
    expect(state.evidence.map((e) => e.name)).toEqual(["Badge", "Knife"]);
    expect(state.evidence[1].image).toBe("knife.png");
  });

  test("players join, update and leave", () => {
    receive("SC#Phoenix#Edgeworth#%");
    server().PR({ id: 4, type: PlayerListUpdate.add });
    server().PU({ id: 4, type: PlayerDataType.char_name, data: "edgeworth" });
    server().PU({ id: 4, type: PlayerDataType.area_id, data: "2" });
    server().PU({ id: 9, type: PlayerDataType.ooc_name, data: "ghost" });
    expect(state.players[4]).toMatchObject({ charName: "edgeworth", charId: 1, area: 2 });
    expect(state.players[9]).toBeUndefined();
    server().PR({ id: 4, type: PlayerListUpdate.remove });
    expect(state.players[4]).toBeUndefined();
  });

  test("OOC chat, modcalls and case alerts are logged", () => {
    const calls: string[] = [];
    const off = on("modcall", (r) => calls.push(r));
    server().CT({ name: "Maya", message: "hi", is_from_server: false });
    server().ZZ({ reason: "help" });
    server().CASEA({
      message: "trial",
      need_def: true,
      need_pro: false,
      need_judge: true,
      need_jury: false,
      need_steno: false,
    });
    off();
    expect(state.oocLog.map((e) => e.kind)).toEqual(["chat", "modcall", "case"]);
    const caseAlert = state.oocLog[2];
    expect(caseAlert.kind === "case" && [...caseAlert.roles]).toEqual(["Defense", "Judge"]);
    expect(calls).toEqual(["help"]);
  });

  test("IC messages are logged once and handed to the stage", () => {
    const shown: string[] = [];
    const off = on("icMessage", (p) => shown.push(p.message));
    const ms = { character: "Phoenix", emote: "normal", message: "Objection!", side: Side.def, char_id: 0 };
    server().MS(ms);
    server().MS(ms);
    server().MS({ ...ms, message: "Hold it!" });
    off();
    expect(shown).toEqual(["Objection!", "Hold it!"]);
    expect(state.icLog.map((e) => e.kind === "message" && e.message)).toEqual(["Objection!", "Hold it!"]);
  });

  test("music changes are tracked per channel and logged", () => {
    server().MC({ name: "trial.opus", char_id: 0, looping: true, channel: MusicChannel.music } as never);
    expect(state.court.music.music).toEqual({ track: "trial.opus", looping: true });
    expect(state.icLog.at(-1)).toMatchObject({ kind: "music", track: "trial.opus" });
  });

  test("health, testimony, timers, judge controls and auth", () => {
    server().HP({ bar: PenaltyBar.prosecution, value: 3 });
    server().RT({ animation: RTAnimation.cross_examination } as never);
    server().TI({ timer_id: 1, command: TimerCommand.show, time: 0 } as never);
    server().TI({ timer_id: 1, command: TimerCommand.start, time: 60000 });
    server().JD({ state: JudgeState.shown });
    server().AUTH({ auth_state: AuthState.success });
    server().SP({ side: Side.pro });
    server().BN({ background: "gs4", position: "" } as never);

    expect(state.court.hp).toEqual({ defense: 10, prosecution: 3 });
    expect(state.court.testimony).toBe(RTAnimation.cross_examination);
    expect(state.court.timers[1]).toMatchObject({ visible: true, running: true, time: 60000 });
    expect(state.self).toMatchObject({ judgeControls: "shown", moderator: true, side: "pro" });
    expect(state.court.background).toBe("gs4");

    server().RT({ animation: RTAnimation.end_animation } as never);
    expect(state.court.testimony).toBeNull();
  });

  test("logs are capped", () => {
    for (let i = 0; i < LOG_LIMIT + 5; i++) server().CT({ name: "a", message: String(i), is_from_server: false });
    expect(state.oocLog).toHaveLength(LOG_LIMIT);
    expect(state.oocLog[0]).toMatchObject({ message: "5" });
  });
});

describe("commands", () => {
  const joinAs = (charId: number) => {
    receive("SC#Phoenix#Edgeworth#%");
    receive("SM#Lobby#Courtroom#== Music ==#a.opus#%");
    receive("PV#1#CID#" + charId + "#%");
  };

  beforeEach(() => {
    resetDraftAfterSend();
    Object.assign(draft, {
      emote: {
        preanim: "think",
        anim: "normal",
        modifier: EmoteModifier.preanim,
        deskModifier: DeskModifier.hidden,
        sfx: "deskslam",
        sfxDelay: 120,
      },
      side: Side.def,
      evidence: -1,
    });
  });

  test("sendIC builds MS from the draft", () => {
    joinAs(0);
    Object.assign(draft, { message: "Take that!", shout: ShoutModifier.take_that, evidence: 2, sendSfx: true, sendPreanim: true });
    expect(sendIC()).toBe(true);
    expect(outbound.at(-1)).toMatchObject({
      $header: "MS",
      character: "Phoenix",
      emote: "normal",
      message: "Take that!",
      side: "def",
      emote_modifier: "preanim",
      desk_modifier: "hidden",
      sfx_name: "deskslam",
      sfx_delay: 120,
      shout_modifier: "take_that",
      evidence_id: 3,
      char_id: 0,
    });
  });

  test("the preanim toggle only flips plain emotes", () => {
    joinAs(0);
    sendIC();
    expect(outbound.at(-1)).toMatchObject({ emote_modifier: "no_preanim", sfx_name: "0", sfx_delay: 0 });

    draft.emote!.modifier = EmoteModifier.zoom;
    draft.sendPreanim = true;
    sendIC();
    expect(outbound.at(-1)).toMatchObject({ emote_modifier: "zoom" });
  });

  test("sendIC refuses without a character or emote", () => {
    expect(sendIC()).toBe(false);
    joinAs(0);
    draft.emote = null;
    expect(sendIC()).toBe(false);
    expect(outbound.filter((p) => p.$header === "MS")).toHaveLength(0);
  });

  test("our own echoed message clears the per-message draft", () => {
    joinAs(1);
    Object.assign(draft, { message: "hi", flash: true, shout: ShoutModifier.objection, flip: true });
    conn.clientSession.send.MS({ character: "Edgeworth", emote: "normal", message: "hi", side: Side.pro, char_id: 1 });
    expect(draft).toMatchObject({ message: "", flash: false, shout: "none", flip: true });
  });

  test("other players' messages leave the draft alone", () => {
    joinAs(1);
    draft.message = "typing";
    conn.clientSession.send.MS({ character: "Phoenix", emote: "normal", message: "hey", side: Side.def, char_id: 0 });
    expect(draft.message).toBe("typing");
  });

  test("muted characters are not logged or staged", () => {
    joinAs(1);
    setMuted(0, true);
    conn.clientSession.send.MS({ character: "Phoenix", emote: "normal", message: "spam", side: Side.def, char_id: 0 });
    expect(state.icLog).toHaveLength(0);
    setMuted(0, false);
    expect(state.self.muted).toEqual([]);
  });

  test("simple commands send what the server expects", () => {
    joinAs(1);
    pickCharacter(0);
    changeArea(1);
    changeArea(9);
    sendOOC("/roll", "Maya");
    expect(outbound.map((p) => p.$header)).toEqual(["CC", "MC", "CT"]);
    expect(outbound[0]).toMatchObject({ char_id: 0, char_password: "none" });
    expect(outbound[1]).toMatchObject({ name: "Courtroom", char_id: 1 });
    expect(state.self.areaId).toBe(1);
    expect(settings.oocName).toBe("Maya");
  });

  test("health changes are clamped", () => {
    changeHealth(PenaltyBar.defense, 1);
    conn.clientSession.send.HP({ bar: PenaltyBar.prosecution, value: 0 });
    changeHealth(PenaltyBar.prosecution, -1);
    expect(outbound.map((p) => p.value)).toEqual([10, 0]);
  });
});

describe("log", () => {
  test("callwords highlight the entry and fire an event", () => {
    setSetting("callwords", ["phoenix", " "]);
    let rang = 0;
    const off = on("callword", () => rang++);
    conn.clientSession.send.MS({ character: "Maya", emote: "normal", message: "Nick! PHOENIX!", side: Side.def, char_id: 0 });
    conn.clientSession.send.MS({ character: "Maya", emote: "normal", message: "nothing here", side: Side.def, char_id: 0 });
    off();
    setSetting("callwords", []);
    expect(rang).toBe(1);
    expect(state.icLog.map((e) => e.kind === "message" && e.callword)).toEqual([true, false]);
  });

  test("joining, moving and dropping leave notices", () => {
    receive("SM#Lobby#Courtroom#== Music ==#a.opus#%");
    receive("DONE#%");
    changeArea(1);
    expect(state.icLog.map((e) => e.kind === "notice" && e.text)).toEqual(["Connected", "Moved to Courtroom"]);
  });

  test("logs survive a reconnect", () => {
    server().CT({ name: "a", message: "before", is_from_server: false });
    connect();
    expect(state.oocLog).toHaveLength(1);
  });

  test("the text export reads like a transcript", () => {
    const at = new Date(2026, 0, 1, 9, 5).getTime();
    const text = icLogAsText(
      [
        { kind: "notice", text: "Connected", time: at },
        { kind: "message", charId: 0, character: "Phoenix", showname: "Nick", message: "~~Hold it!", color: "white", callword: false, time: at },
        { kind: "music", charId: 0, showname: "", track: "trial.opus", looping: true, time: at },
      ],
      true,
    ).replace(/\[[^\]]+\]/g, "[t]");
    expect(text).toBe("[t] -- Connected --\n[t] Nick: Hold it!\n[t] Someone played trial.opus (looping)");
  });

  const server = () => conn.clientSession.send;
});

describe("pairing", () => {
  test("pairMentions finds player ids in pairing messages only", () => {
    expect(pairMentions("[12] wants to pair with (#7)")).toEqual([12, 7]);
    expect(pairMentions("id: 3 unpaired")).toEqual([3]);
    expect(pairMentions("[12] said hello")).toBeNull();
  });

  test("pairWith asks the server and sets the partner on the draft", () => {
    receive("SC#Phoenix#Edgeworth#%");
    conn.clientSession.send.PR({ id: 4, type: PlayerListUpdate.add });
    conn.clientSession.send.PU({ id: 4, type: PlayerDataType.char_name, data: "Edgeworth" });
    draft.pair.charId = -1;
    pairWith(4);
    expect(outbound.at(-1)).toMatchObject({ $header: "CT", message: "/pair 4" });
    expect(draft.pair.charId).toBe(1);
  });
});

test("an empty evidence list sent as LE##% is empty", () => {
  receive("LE##%");
  expect(state.evidence).toEqual([]);
});
