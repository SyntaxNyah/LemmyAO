/**
 * Minimal joinable AO demo server for local testing.
 *
 * Serves the client + assets AND speaks enough of the AO protocol (via
 * aolib) to get clients into a single shared area, then relays IC (MS),
 * OOC (CT) and music (MC) to everyone. Not a real server: no auth, no
 * moderation, no persistence; the areas listed all share one room.
 *
 *   bun run server
 *   → open the printed URL, pick a character, chat. Open it in a second
 *     tab/browser to see messages relayed between clients.
 */

import {
  client as aoClient,
  PlayerDataType,
  PlayerListUpdate,
  type ClientSession,
} from "aolib-ts";

const PORT = Number(process.env.PORT ?? 8081);

// Character roster offered to clients. Names must match character folders
// (lowercased) under the asset host. The local dev-assets 3D characters
// plus a couple of vanilla names for 2D testing.
const ROSTER = ["Fenomeno3D", "test3d", "1127-cti", "Phoenix", "Edgeworth"];
// Areas come first in the SM list; everyone shares one room regardless of area.
const AREAS = ["Demo Area", "Courtroom", "Lobby"];
const MUSIC = [...AREAS, "=== Music ===", "Trial.opus", "Investigation.opus"];
const BACKGROUND = "gs4";

const FEATURES = [
  "fastloading",
  "yellowtext",
  "cccc_ic_support",
  "flipping",
  "looping_sfx",
  "effects",
  "y_offset",
];

const sessions = new Set<ClientSession>();
let playerSeq = 0;

const broadcast = (fn: (s: ClientSession) => void): void => {
  for (const s of sessions) {
    try {
      fn(s);
    } catch (err) {
      console.warn("[ao] broadcast error:", err);
    }
  }
};

// Evidence shared by everyone (one room).
const evidence: { name: string; description: string; image: string }[] = [];
const sendEvidence = () => broadcast((s) => s.send.LE({ evidence: [...evidence] }));

// The player list (PR/PU) every joined client sees.
const players = new Map<ClientSession, { id: number; name: string; charName: string }>();

function sendPlayer(to: ClientSession, p: { id: number; name: string; charName: string }) {
  to.send.PR({ id: p.id, type: PlayerListUpdate.add });
  to.send.PU({ id: p.id, type: PlayerDataType.char_name, data: p.charName });
  to.send.PU({ id: p.id, type: PlayerDataType.ooc_name, data: p.name });
  to.send.PU({ id: p.id, type: PlayerDataType.area_id, data: "0" });
}

function updatePlayer(session: ClientSession, type: PlayerDataType, data: string) {
  const p = players.get(session);
  if (p) broadcast((s) => s.send.PU({ id: p.id, type, data }));
}

function leave(session: ClientSession) {
  const p = players.get(session);
  if (!p) return;
  players.delete(session);
  broadcast((s) => s.send.PR({ id: p.id, type: PlayerListUpdate.remove }));
}

// Assets (characters/, background/, sounds/) are served from this server, so
// tell clients to fetch from here, under the host they reached us by. They only
// adopt it if they didn't join with an explicit ?asset= override.
function setupSession(ws: { send(data: string): void }, assetUrl: string): ClientSession {
  const session = aoClient({
    send: (wire) => ws.send(wire),
    onUnhandled: (header) => {
      // CH (keep-alive) and anything else we don't model: ignore quietly.
      if (header !== "CH") console.log("[ao] unhandled", header);
    },
  });

  const playerId = ++playerSeq;

  session.on.HI(() => {
    session.send.ID({ player_id: playerId, software: "LemmyAO-demo", version: "1.0" });
    session.send.FL({ features: FEATURES });
    // Point the client at this server's asset host (before the char list is
    // fetched, so char.ini / icons resolve here).
    session.send.ASS({ asset_url: assetUrl });
  });

  session.on.ID(() => {
    session.send.PN({
      player_count: sessions.size,
      max_players: 100,
      server_description: "LemmyAO demo server",
    });
  });

  session.on.askchaa(() => {
    session.send.SI({ char_count: ROSTER.length, evi_count: 0, mus_count: MUSIC.length });
  });

  session.on.RC(() => {
    session.send.SC({
      char_data: ROSTER.map((name) => ({ name, desc: "", evidence: "" })),
    });
  });

  session.on.RM(() => {
    session.send.SM({ music_list: MUSIC.map((name) => ({ name })) });
  });

  session.on.RD(() => {
    session.send.BN({ background: BACKGROUND });
    session.send.DONE({});
    session.send.LE({ evidence: [...evidence] });
    const me = { id: playerId, name: "", charName: "" };
    for (const other of players.values()) sendPlayer(session, other);
    players.set(session, me);
    broadcast((s) => sendPlayer(s, me));
  });

  session.on.CC((packet) => {
    session.send.PV({ player_id: playerId, char_id: packet.char_id } as never);
    const me = players.get(session);
    if (me) me.charName = ROSTER[packet.char_id] ?? "";
    updatePlayer(session, PlayerDataType.char_name, me?.charName ?? "");
  });

  session.on.PE((p) => {
    evidence.push({ name: p.name, description: p.description, image: p.image });
    sendEvidence();
  });
  session.on.EE((p) => {
    if (!evidence[p.id]) return;
    evidence[p.id] = { name: p.name, description: p.description, image: p.image };
    sendEvidence();
  });
  session.on.DE((p) => {
    evidence.splice(p.id, 1);
    sendEvidence();
  });

  // Keep-alive: some clients expect a CHECK echo.
  try {
    session.on.CH(() => session.send.CHECK({} as never));
  } catch {
    /* CH/CHECK not in registry — ignore */
  }

  // Relay chat / OOC / music to everyone (including the sender, which is how
  // AO clients render their own messages).
  session.on.MS((packet) => {
    console.log(`[ao] MS from char_id=${(packet as { char_id: number }).char_id} -> ${sessions.size} clients: ${(packet as { message: string }).message}`);
    broadcast((s) => s.send.MS(packet as never));
  });
  session.on.CT((packet) => {
    const message = (packet as { message: string }).message;
    if (message.startsWith("/bb ")) return session.send.BB({ message: message.slice(4) } as never);
    const me = players.get(session);
    const name = (packet as { name: string }).name;
    if (me && me.name !== name) {
      me.name = name;
      updatePlayer(session, PlayerDataType.ooc_name, name);
    }
    broadcast((s) => s.send.CT(packet as never));
  });
  // MC carrying an area name is a move, not a song; there is only one room to move to.
  session.on.MC((packet) => {
    if (AREAS.includes((packet as { name: string }).name)) return;
    broadcast((s) => s.send.MC(packet as never));
  });

  return session;
}

// Lets a client served from elsewhere (e.g. the Vite dev server) use these assets.
const CORS = { "Access-Control-Allow-Origin": "*" };

const staticFile = async (pathname: string): Promise<Response | null> => {
  const built = Bun.file(`./dist${pathname === "/" ? "/index.html" : pathname}`);
  if (await built.exists()) return new Response(built, { headers: CORS });
  const local = Bun.file(`./dev-assets${decodeURIComponent(pathname)}`);
  if (await local.exists()) return new Response(local, { headers: CORS });
  return null;
};

const server = Bun.serve<{ session: ClientSession | null; assetUrl: string }>({
  port: PORT,
  development: true,
  async fetch(req, srv) {
    // Upgrade AO WebSocket connections.
    if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
      const assetUrl = `http://${req.headers.get("host") ?? `localhost:${PORT}`}/`;
      if (srv.upgrade(req, { data: { session: null, assetUrl } })) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    const url = new URL(req.url);
    return (await staticFile(url.pathname)) ?? new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      ws.data.session = setupSession(ws, ws.data.assetUrl);
      sessions.add(ws.data.session);
      // The client waits for a decryptor packet before sending HI.
      ws.data.session.send.decryptor({ value: "NOENCRYPT" } as never);
      console.log(`[ao] client connected (${sessions.size} online)`);
    },
    message(ws, msg) {
      ws.data.session?.receive(typeof msg === "string" ? msg : msg.toString());
    },
    close(ws) {
      if (ws.data.session) {
        sessions.delete(ws.data.session);
        leave(ws.data.session);
        ws.data.session.close();
      }
      console.log(`[ao] client disconnected (${sessions.size} online)`);
    },
  },
});

const base = `http://localhost:${server.port}`;
console.log(`LemmyAO demo server on ${base}`);
console.log(`Join: ${base}/client.html?connect=ws://localhost:${server.port}`);
