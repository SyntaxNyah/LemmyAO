import { describe, test, expect, beforeEach } from "bun:test";
import type * as aolib from "aolib-ts";
import { Connection } from "../core/connection";
import { coreHandlers } from "../core/protocol";
import { state } from "../core/state";
import { on } from "../core/events";

type C2S = keyof aolib.packets.C2SOutputs;
const REPLIES: C2S[] = ["HI", "ID", "askchaa", "RC", "RM", "RD", "CH"];

let sent: string[];
let conn: Connection;

/** A local-mode connection with only the core handlers, recording what it sends. */
function connect() {
  sent = [];
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
    },
  });
  conn.connect();
}

const receive = (wire: string) => conn.server.receive(wire);

beforeEach(() => {
  state.server.assetHost = "https://attorneyoffline.de/base/";
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
