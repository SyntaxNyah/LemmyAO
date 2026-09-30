import { describe, it, expect } from "bun:test";
import * as ao from "aolib-ts";
import * as wire from "aolib-ts/wire";

// Contract tests for the aolib-ts network layer (src/aolib is now a thin adapter
// over it). These pin what LemmyAO relies on, so a future aolib-ts release that
// breaks it fails here loudly. Targets the namespace-first 2.1.0 surface: packet
// schemas under `ao.packets`, enums on the root, wire codecs under `aolib-ts/wire`.

// Every packet header LemmyAO's client drives today (server.send / on and the
// synthesised clientSession.send / on across replay + server modes).
const LEMMY_HEADERS = [
  "AE", "AM", "AN", "ARUP", "ASS", "AUTH", "BB", "BD", "BN", "CC", "CH",
  "CHECK", "CI", "CT", "DE", "DONE", "EE", "EI", "EM", "FA", "FL", "FM",
  "HI", "HP", "ID", "JD", "KB", "KK", "LE", "MA", "MC", "MS", "PE", "PN",
  "PR", "PU", "PV", "RC", "RD", "RM", "RMC", "RT", "SC", "SI", "SM", "SP",
  "TI", "VS_AUDIO", "VS_CAPS", "VS_FRAME", "VS_JOIN", "VS_LEAVE", "VS_PEERS",
  "VS_SPEAK", "ZZ",
];

describe("aolib-ts packet coverage", () => {
  const supported = new Set([
    ...Object.keys(ao.packets.c2sSchemas),
    ...Object.keys(ao.packets.s2cSchemas),
  ]);

  it("covers every header LemmyAO uses except the ones aolib-ts removed", () => {
    const missing = LEMMY_HEADERS.filter((h) => !supported.has(h)).sort();
    // AE/AM/AN were dropped. LemmyAO's src/aolib still defines them, so a
    // network migration must stop sending them. Any other header going missing
    // (or these coming back) breaks this and flags the compatibility change.
    expect(missing).toEqual(["AE", "AM", "AN"]);
  });

  it("keeps MS available in both directions", () => {
    expect("MS" in ao.packets.c2sSchemas).toBe(true);
    expect("MS" in ao.packets.s2cSchemas).toBe(true);
  });
});

describe("aolib-ts session: MS round-trip", () => {
  it("client -> server preserves the fields LemmyAO reads", () => {
    const buf: string[] = [];
    const srv = ao.server({ send: (w) => buf.push(w) });
    let received: Record<string, unknown> | undefined;
    const cli = ao.client({ send: () => {} });
    cli.on.MS((p) => { received = p as unknown as Record<string, unknown>; });

    srv.send.MS({
      character: "Phoenix",
      emote: "normal",
      message: "hello world",
      side: ao.Side.def,
      char_id: 7,
    });

    expect(buf).toHaveLength(1);
    cli.receive(buf[0]);
    expect(received).toMatchObject({
      character: "Phoenix",
      emote: "normal",
      message: "hello world",
      side: "def",
      char_id: 7,
    });
  });

  it("rejects an MS missing required fields instead of sending garbage", () => {
    const srv = ao.server({ send: () => {} });
    expect(() => srv.send.MS({ character: "Phoenix" } as never)).toThrow();
  });
});

describe("aolib-ts session: role direction guards", () => {
  it("a server session refuses to send a server->client packet", () => {
    const srv = ao.server({ send: () => {} });
    expect(() => (srv.send as Record<string, (p: unknown) => void>).BB!({ message: "x" }))
      .toThrow(/server -> client/);
  });

  it("a client session refuses to send a client->server packet", () => {
    const cli = ao.client({ send: () => {} });
    expect(() => (cli.send as Record<string, (p: unknown) => void>).HI!({ hdid: "x" }))
      .toThrow(/client -> server/);
  });
});

describe("aolib-ts wire format", () => {
  it("encodes HI as the AO wire string", () => {
    const buf: string[] = [];
    ao.server({ send: (w) => buf.push(w) }).send.HI({ hdid: "device-1" });
    expect(buf).toEqual(["HI#device-1#%"]);
  });
});

describe("aolib-ts export surface for a network consumer", () => {
  it("exposes the session factories on the root", () => {
    expect(typeof ao.server).toBe("function");
    expect(typeof ao.client).toBe("function");
  });

  it("exposes the wire codecs on the /wire subpath", () => {
    expect(typeof wire.encode).toBe("function");
    expect(typeof wire.decode).toBe("function");
  });

  it("re-exports the protocol enums LemmyAO builds packets with", () => {
    expect(ao.Side.def).toBe("def");
    expect(typeof ao.EmoteModifier).toBe("object");
    expect(typeof ao.DeskModifier).toBe("object");
  });
});
