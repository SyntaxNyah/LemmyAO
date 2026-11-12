import { describe, test, expect, beforeEach } from "bun:test";
import {
  parseServerlist,
  mergeServerlists,
  transportFor,
  socketUrl,
  clientUrl,
  blockedOnPage,
  parseDirectConnect,
  refreshDirectory,
  directory,
  type ServerEntry,
} from "../core/directory";

const raw = [
  { ip: "a.example", port: 27016, ws_port: 80, wss_port: 443, players: 3, name: "Both", description: "d" },
  { ip: "b.example", ws_port: 50001, players: 9, name: "Plain" },
  { ip: "c.example", port: 27016, players: 1, name: "Legacy" },
  { ip: "", ws_port: 1, name: "No host" },
  { ip: "d.example", ws_port: 1 },
];

const entry = (overrides: Partial<ServerEntry>): ServerEntry => ({
  id: "x",
  name: "x",
  description: "",
  host: "x.example",
  players: 0,
  ...overrides,
});

describe("parseServerlist", () => {
  test("keeps named servers with a host, legacy TCP ones included", () => {
    const list = parseServerlist(raw);
    expect(list.map((s) => s.name)).toEqual(["Both", "Plain", "Legacy"]);
    expect(list[0]).toMatchObject({ id: "a.example:443", wsPort: 80, wssPort: 443, tcpPort: 27016 });
    expect(list[2]).toMatchObject({ id: "c.example:27016", wsPort: undefined, wssPort: undefined });
  });

  test("tolerates junk", () => {
    expect(parseServerlist(null)).toEqual([]);
    expect(parseServerlist([null, 5, "x"])).toEqual([]);
  });
});

test("mergeServerlists drops duplicates and sorts by players", () => {
  const a = parseServerlist(raw);
  const b = parseServerlist([{ ip: "b.example", ws_port: 50001, players: 1, name: "Plain again" }]);
  const merged = mergeServerlists([a, b]);
  expect(merged.map((s) => s.name)).toEqual(["Plain", "Both", "Legacy"]);
});

describe("transportFor", () => {
  const both = entry({ wsPort: 80, wssPort: 443 });
  test("https pages use wss, and ws when that is all there is", () => {
    expect(transportFor(both, "https:")).toBe("wss");
    expect(transportFor(entry({ wsPort: 80 }), "https:")).toBe("ws");
  });
  test("http pages prefer ws but still use wss-only servers", () => {
    expect(transportFor(both, "http:")).toBe("ws");
    expect(transportFor(entry({ wssPort: 443 }), "http:")).toBe("wss");
  });
  test("TCP-only servers are unreachable", () => {
    expect(transportFor(entry({ tcpPort: 27016 }), "https:")).toBeNull();
  });
  test("socketUrl picks the matching port", () => {
    expect(socketUrl(both, "wss")).toBe("wss://x.example:443");
    expect(socketUrl(both, "ws")).toBe("ws://x.example:80");
  });
});

describe("clientUrl", () => {
  const page = "https://webao.example/app/index.html?x=1";
  test("joins next to the current page", () => {
    const url = new URL(clientUrl("wss://h:443", { name: "My Server", page }));
    expect(url.origin + url.pathname).toBe("https://webao.example/app/client.html");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      mode: "join",
      connect: "wss://h:443",
      serverName: "My Server",
    });
  });
  test("insecure sockets switch the client to http", () => {
    expect(clientUrl("ws://h:80", { page, watch: true })).toBe("http://webao.example/app/client.html?mode=watch&connect=ws://h:80");
  });
});

describe("blockedOnPage", () => {
  test("only unencrypted sockets on https pages are blocked", () => {
    expect(blockedOnPage("ws://h:80", "https:")).toBe(true);
    expect(blockedOnPage("wss://h:443", "https:")).toBe(false);
    expect(blockedOnPage("ws://h:80", "http:")).toBe(false);
  });
});

describe("parseDirectConnect", () => {
  test("accepts URLs and host:port", () => {
    expect(parseDirectConnect(" wss://h.example:2096 ", "https:")).toBe("wss://h.example:2096");
    expect(parseDirectConnect("h.example:50001", "https:")).toBe("wss://h.example:50001");
    expect(parseDirectConnect("127.0.0.1:50001", "http:")).toBe("ws://127.0.0.1:50001");
    expect(parseDirectConnect("[::1]:50001", "http:")).toBe("ws://[::1]:50001");
  });
  test("rejects nonsense", () => {
    expect(parseDirectConnect("", "https:")).toBeNull();
    expect(parseDirectConnect("http://h.example", "https:")).toBe(null);
    expect(parseDirectConnect("wss://h.example/path", "https:")).toBeNull();
    expect(parseDirectConnect("not a server!", "https:")).toBeNull();
    expect(parseDirectConnect("ws://foo bar:1", "https:")).toBeNull();
    expect(parseDirectConnect("h..example:1", "https:")).toBeNull();
  });
});

describe("refreshDirectory", () => {
  beforeEach(() => localStorage.clear());

  const respond = (body: unknown, ok = true) =>
    Promise.resolve({ ok, status: ok ? 200 : 500, json: async () => body } as Response);

  test("merges every reachable master server and caches the result", async () => {
    let call = 0;
    const fetchFn = () => (call++ === 0 ? respond(raw) : Promise.reject(new Error("down")));
    await refreshDirectory(fetchFn);
    expect(directory.fromCache).toBe(false);
    expect(directory.servers.map((s) => s.name)).toEqual(["Plain", "Both", "Legacy"]);
    expect(JSON.parse(localStorage.getItem("masterlist")!)).toHaveLength(3);
  });

  test("falls back to the saved list, including one saved by the old page", async () => {
    localStorage.setItem("masterlist", JSON.stringify([{ name: "Old", ip: "o.example", ws_port: 1, players: 2 }]));
    await refreshDirectory(() => respond([], false));
    expect(directory.fromCache).toBe(true);
    expect(directory.servers.map((s) => s.name)).toEqual(["Old"]);
  });
});
