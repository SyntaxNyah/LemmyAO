import { describe, it, expect } from "bun:test";
import * as ao from "aolibnext";

// Contract tests for adopting the published aolib-ts (2.0.0) as LemmyAO's
// network layer. LemmyAO ships its own src/aolib today; these pin what a
// migration relies on, so an aolib-ts release that breaks it fails here loudly.
// `aolibnext` is a dev alias for aolib-ts so these run against the real package
// without disturbing the runtime parseCharIni dependency.

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
    ...Object.keys(ao.c2sSchemas),
    ...Object.keys(ao.s2cSchemas),
  ]);

  it("covers every header LemmyAO uses except the ones 2.0.0 removed", () => {
    const missing = LEMMY_HEADERS.filter((h) => !supported.has(h)).sort();
    // 2.0.0 dropped AE/AM/AN. LemmyAO's src/aolib still defines them, so a
    // network migration must stop sending them. Any other header going missing
    // (or these coming back) breaks this and flags the compatibility change.
    expect(missing).toEqual(["AE", "AM", "AN"]);
  });

  it("keeps MS available in both directions", () => {
    expect("MS" in ao.c2sSchemas).toBe(true);
    expect("MS" in ao.s2cSchemas).toBe(true);
  });
});

describe("aolib-ts session: MS round-trip", () => {
  it("client -> server preserves the fields LemmyAO reads", () => {
    const wire: string[] = [];
    const srv = ao.server({ send: (w) => wire.push(w) });
    let received: Record<string, unknown> | undefined;
    const cli = ao.client({ send: () => {} });
    cli.on.MS((p) => { received = p as unknown as Record<string, unknown>; });

    srv.send.MS({
      character: "Phoenix",
      emote: "normal",
      message: "hello world",
      // Side isn't exported from the package root (see the export-surface test),
      // so a consumer can't name Side.def here -- pass the wire literal it maps to.
      side: "def" as never,
      char_id: 7,
    });

    expect(wire).toHaveLength(1);
    cli.receive(wire[0]);
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
    const wire: string[] = [];
    ao.server({ send: (w) => wire.push(w) }).send.HI({ hdid: "device-1" });
    expect(wire).toEqual(["HI#device-1#%"]);
  });
});

describe("aolib-ts export surface for a network consumer", () => {
  it("exposes the session + codec primitives", () => {
    expect(typeof ao.server).toBe("function");
    expect(typeof ao.client).toBe("function");
    expect(typeof ao.encode).toBe("function");
    expect(typeof ao.decode).toBe("function");
  });

  it("does not re-export the protocol enums from the root", () => {
    // Gap to track: LemmyAO's src/aolib exports Side/EmoteModifier/etc.; aolib-ts
    // keeps them in ./enums, off the package root. A network migration needs them
    // surfaced. If a release starts exporting them, update this expectation.
    expect("Side" in ao).toBe(false);
    expect("EmoteModifier" in ao).toBe(false);
  });
});
