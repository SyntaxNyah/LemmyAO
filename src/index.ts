import "./styles/master.css";
import { safeHtmlTags } from "./escaping";
import { version as clientVersion } from "./version";

interface AOServer {
  name: string;
  description: string;
  ip: string;
  players: number;
  online: string;
  port?: number;
  ws_port?: number;
  wss_port?: number;
  asset?: string;
}

// const MASTERSERVER_IP = 'master.aceattorneyonline.com:27014';
const serverlist_endpoints = [
  "servers.aceattorneyonline.com/servers",
  "servers.umineko.online/servers/",
];
const protocol = window.location.protocol;

const serverlist_cache_key = "masterlist";

const servers: AOServer[] = [];
servers[-1] = {
  name: "Localhost",
  description: "This is your computer on port 50001",
  ip: "127.0.0.1",
  players: 0,
  online: "Localhost",
  ws_port: 50001,
} as AOServer;

function main() {
  getServerlist().then((serverlist) => {
    processServerlist(serverlist);
  });

  addServer(servers[-1]);

  processClientVersion(clientVersion);

  getMasterVersion().then((masterVersion) => {
    processMasterVersion(masterVersion);
  });
}

main();

// Fetches and parses the serverlist from a single masterserver endpoint.
async function fetchServerlistFrom(endpoint: string): Promise<AOServer[]> {
  const url = `${protocol}//${endpoint}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Bad status code from masterserver. status: ${response.status}, body: ${response.body}`,
    );
  }

  const data = await response.json();
  const serverlist: AOServer[] = [];

  for (const item of data) {
    if (!item.name) {
      console.warn(`Server ${item} has no name, skipping`);
      continue;
    }
    if (!item.ip) {
      console.warn(`Server ${item.name} has no ip, skipping`);
      continue;
    }
    if (!item.description) {
      console.warn(`Server ${item.name} has no description`);
    }

    const newServer: AOServer = {
      name: item.name,
      description: item.description,
      ip: item.ip,
      players: item.players || 0,
      online: `Players: ${item.players}`,
    };

    if (item.ws_port) {
      newServer.ws_port = item.ws_port;
    }
    if (item.wss_port) {
      newServer.wss_port = item.wss_port;
    }

    // if none of ws_port or wss_port are defined, skip
    if (!newServer.ws_port && !newServer.wss_port) {
      console.warn(`Server ${item.name} has no websocket port, skipping`);
      continue;
    }

    serverlist.push(newServer);
  }

  return serverlist;
}

// Merges lists from several masterservers, dropping duplicates (keyed by
// ip + websocket port) and sorting by player count (highest first).
function mergeAndSortServerlists(lists: AOServer[][]): AOServer[] {
  const seen = new Set<string>();
  const merged: AOServer[] = [];
  for (const list of lists) {
    for (const server of list) {
      const key = `${server.ip}:${server.ws_port ?? server.wss_port ?? ""}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      merged.push(server);
    }
  }
  merged.sort((a, b) => b.players - a.players);
  return merged;
}

// Fetches the serverlist from every configured masterserver, merging the
// results. Falls back to the cached list when every endpoint fails.
async function getServerlist(): Promise<AOServer[]> {
  const lists: AOServer[][] = [];
  for (const endpoint of serverlist_endpoints) {
    try {
      lists.push(await fetchServerlistFrom(endpoint));
    } catch (err) {
      console.error(`Failed to fetch serverlist from ${endpoint}:`, err);
    }
  }

  if (lists.length === 0) {
    // Every masterserver is unreachable: fall back to the cached list.
    document.getElementById("ms_error").style.display = "block";
    return getCachedServerlist();
  }

  const serverlist = mergeAndSortServerlists(lists);

  // Always cache the result when we get it
  localStorage.setItem(serverlist_cache_key, JSON.stringify(serverlist));

  return serverlist;
}

function getCachedServerlist(): AOServer[] {
  // If it's not in the cache, return an empty list
  const cached = localStorage.getItem(serverlist_cache_key) || "[]";
  return JSON.parse(cached) as AOServer[];
}

// Constructs the client URL robustly, independent of domain and path
function constructClientURL(protocol: string): string {
  const clientURL = new URL(window.location.href);

  // Use the given protocol
  clientURL.protocol = protocol;

  // Remove the last part of the pathname (e.g., "index.html")
  const pathname = clientURL.pathname;
  const parts = pathname.split("/");
  parts.pop();

  // Reconstruct the pathname
  clientURL.pathname = parts.join("/");

  // If clientURL.pathname does not end with a slash, add one
  if (clientURL.pathname[clientURL.pathname.length - 1] !== "/") {
    clientURL.pathname += "/";
  }

  clientURL.pathname += "client.html";

  return clientURL.href;
}

function addServer(server: AOServer) {
  let ws_port = 0;
  let ws_protocol = "";
  let http_protocol = "";

  // When the page is served over plain http (typically localhost dev),
  // mixed-content rules prevent wss/https from working anyway, so prefer
  // the plain ws/http ports if available.
  const preferPlain = window.location.protocol === "http:";

  if (server.ws_port) {
    ws_port = server.ws_port;
    ws_protocol = "ws";
    http_protocol = "http";
  }
  if (
    server.wss_port &&
    !preferPlain &&
    !window.navigator.userAgent.includes("Nintendo")
  ) {
    ws_port = server.wss_port;
    ws_protocol = "wss";
    http_protocol = "https";
  }

  if (ws_port === 0 || ws_protocol === "" || http_protocol === "") {
    console.warn(`Server ${server.name} has no websocket port, skipping`);
    return;
  }

  const clientURL = constructClientURL(http_protocol);
  const connect = `${ws_protocol}://${server.ip}:${ws_port}`;
  const serverName = server.name;
  const fullClientWatchURL = `${clientURL}?mode=watch&connect=${connect}&serverName=${serverName}`;
  const fullClientJoinURL = `${clientURL}?mode=join&connect=${connect}&serverName=${serverName}`;

  servers.push(server);

  document.getElementById("masterlist").innerHTML +=
    `<details name="servers">` +
    `<summary><p>${safeHtmlTags(server.name)} (${server.players})</p>` +
    `<a class="button" href="${fullClientJoinURL}" target="_blank">Join</a>` +
    `<a class="button" href="${fullClientWatchURL}" target="_blank">Watch</a></summary>` +
    `<p>${safeHtmlTags(server.description)}</p>` +
    `</details>`;
}

function processServerlist(serverlist: AOServer[]) {
  for (let i = 0; i < serverlist.length; i++) {
    addServer(serverlist[i]);
  }
}

async function getMasterVersion(): Promise<string> {
  const url = `${protocol}//servers.aceattorneyonline.com/version`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(
      `Bad status code from masterserver version check. status: ${response.status}, body: ${response.body}`,
    );
    return "Unknown";
  }

  return await response.text();
}

function processClientVersion(data: string) {
  document.getElementById("clientinfo").innerHTML = `Client version: ${data}`;
}

function processMasterVersion(data: string) {
  document.getElementById("serverinfo").innerHTML =
    `Master server version: ${data}`;
}
