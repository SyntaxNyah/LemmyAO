import { reactive } from "@vue/reactivity";

// Always https: umineko's http URL redirects to https without CORS headers,
// so a browser blocks it.
export const MASTER_ENDPOINTS = [
  "https://servers.aceattorneyonline.com/servers",
  "https://servers.umineko.online/servers",
];
const VERSION_ENDPOINT = "https://servers.aceattorneyonline.com/version";
const CACHE_KEY = "masterlist";

type Fetch = (url: string) => Promise<Response>;

export interface ServerEntry {
  /** host:port, unique across master servers. */
  id: string;
  name: string;
  description: string;
  host: string;
  players: number;
  wsPort?: number;
  wssPort?: number;
  /** Legacy TCP port; browsers cannot use it. */
  tcpPort?: number;
}

export type Transport = "wss" | "ws";

const port = (v: unknown) => (Number.isInteger(v) && (v as number) > 0 ? (v as number) : undefined);

/** Normalizes one master server's JSON, dropping entries without a name or host. */
export function parseServerlist(data: unknown): ServerEntry[] {
  if (!Array.isArray(data)) return [];
  const out: ServerEntry[] = [];
  for (const item of data as Record<string, unknown>[]) {
    const name = typeof item?.name === "string" ? item.name.trim() : "";
    const host = typeof item?.ip === "string" ? item.ip.trim() : "";
    if (!name || !host) continue;
    const wsPort = port(item.ws_port);
    const wssPort = port(item.wss_port);
    const tcpPort = port(item.port);
    out.push({
      id: `${host}:${wssPort ?? wsPort ?? tcpPort ?? ""}`,
      name,
      description: typeof item.description === "string" ? item.description : "",
      host,
      players: Number(item.players) || 0,
      wsPort,
      wssPort,
      tcpPort,
    });
  }
  return out;
}

/** Merges lists from several master servers, first one wins, busiest first. */
export function mergeServerlists(lists: ServerEntry[][]): ServerEntry[] {
  const byId = new Map<string, ServerEntry>();
  for (const server of lists.flat()) {
    if (!byId.has(server.id)) byId.set(server.id, server);
  }
  return [...byId.values()].sort((a, b) => b.players - a.players);
}

/**
 * How to reach a server from a page loaded over `pageProtocol`, or null if a
 * browser cannot (TCP only). Plain-http pages prefer ws: wss would work, but
 * that page is usually local development against a local server.
 */
export function transportFor(server: ServerEntry, pageProtocol: string): Transport | null {
  if (server.wssPort && (pageProtocol !== "http:" || !server.wsPort)) return "wss";
  if (server.wsPort) return "ws";
  return null;
}

/** Browsers refuse unencrypted sockets from https pages (mixed content). */
export const blockedOnPage = (socket: string, pageProtocol: string) =>
  pageProtocol === "https:" && socket.startsWith("ws://");

/** The websocket URL for a server over the given transport. */
export function socketUrl(server: ServerEntry, transport: Transport) {
  const p = transport === "wss" ? server.wssPort : server.wsPort;
  return `${transport}://${server.host}:${p}`;
}

/**
 * The client page URL for joining (or watching) a socket. An unencrypted socket
 * gets the client over http, since browsers block ws:// on https pages.
 */
export function clientUrl(
  socket: string,
  options: { name?: string; watch?: boolean; page: string },
): string {
  const url = new URL("client.html", options.page);
  if (socket.startsWith("ws://")) url.protocol = "http:";
  url.search = "";
  url.searchParams.set("mode", options.watch ? "watch" : "join");
  url.searchParams.set("connect", socket);
  if (options.name) url.searchParams.set("serverName", options.name);
  return url.href;
}

/**
 * Parses what someone typed into "direct connect": a ws:// or wss:// URL, or a
 * bare host:port, which gets wss on secure pages.
 */
export function parseDirectConnect(input: string, pageProtocol: string): string | null {
  const text = input.trim();
  if (!text) return null;
  const withScheme = /^wss?:\/\//i.test(text)
    ? text
    : `${pageProtocol === "https:" ? "wss" : "ws"}://${text}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname || url.pathname.length > 1 || url.search) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

function readCache(): ServerEntry[] {
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]");
    // Lists cached by the old page used the raw master server field names.
    return Array.isArray(cached) && cached.every((s) => "id" in s) ? cached : parseServerlist(cached);
  } catch {
    return [];
  }
}

function writeCache(servers: ServerEntry[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(servers));
  } catch {
    /* the list still shows; it just won't be there offline */
  }
}

export interface Directory {
  servers: ServerEntry[];
  loading: boolean;
  /** True when every master server failed and the list is the saved copy. */
  fromCache: boolean;
  masterVersion: string;
}

export const directory: Directory = reactive({
  servers: readCache(),
  loading: false,
  fromCache: false,
  masterVersion: "",
});

/** Fetches every master server's list and merges them, falling back to the saved list. */
export async function refreshDirectory(fetchFn: Fetch = fetch) {
  directory.loading = true;
  const results = await Promise.allSettled(
    MASTER_ENDPOINTS.map(async (endpoint) => {
      const res = await fetchFn(endpoint);
      if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}`);
      return parseServerlist(await res.json());
    }),
  );
  const lists = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  for (const r of results) {
    if (r.status === "rejected") console.error("Failed to fetch serverlist:", r.reason);
  }

  if (lists.length === 0) {
    directory.servers = readCache();
    directory.fromCache = true;
  } else {
    directory.servers = mergeServerlists(lists);
    directory.fromCache = false;
    writeCache(directory.servers);
  }
  directory.loading = false;
}

export async function fetchMasterVersion(fetchFn: Fetch = fetch) {
  try {
    const res = await fetchFn(VERSION_ENDPOINT);
    if (res.ok) directory.masterVersion = (await res.text()).trim();
  } catch {
    /* only shown as page info */
  }
}
