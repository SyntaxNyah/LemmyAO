/**
 * Minimal joinable AO demo server for local testing.
 *
 * Serves the client + assets AND speaks enough of the AO protocol (via
 * aolib) to get clients into a single shared area, then relays IC (MS),
 * OOC (CT) and music (MC) to everyone. Not a real server: no auth, no
 * moderation, no persistence, one area.
 *
 *   bun run server
 *   → open the printed URL, pick a character, chat. Open it in a second
 *     tab/browser to see messages relayed between clients.
 */

import index from "./public/index.html";
import clientHtml from "./public/client.html";
import { aolib, type ClientSession } from "./src/aolib";

const PORT = Number(process.env.PORT ?? 8081);

// Character roster offered to clients. Names must match character folders
// (lowercased) under the asset host. The local dev-assets 3D characters
// plus a couple of vanilla names for 2D testing.
const ROSTER = ["Fenomeno3D", "test3d", "1127-cti", "Phoenix", "Edgeworth"];
const MUSIC = ["Demo Area", "=== Music ===", "Trial.opus", "Investigation.opus"];
const BACKGROUND = "gs4";
// Assets (characters/, background/, sounds/) are served from this server, so
// tell clients to fetch from here. They only adopt it if they didn't join with
// an explicit ?asset= override.
const ASSET_URL = `http://localhost:${PORT}/`;

const FEATURES = [
  "fastloading",
  "yellowtext",
  "cccc_ic_support",
  "flipping",
  "looping_sfx",
  "effects",
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

function setupSession(ws: { send(data: string): void }): ClientSession {
  const session = aolib.client({
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
    session.send.ASS({ asset_url: ASSET_URL });
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
  });

  session.on.CC((packet) => {
    session.send.PV({ player_id: playerId, char_id: packet.char_id } as never);
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
  session.on.CT((packet) => broadcast((s) => s.send.CT(packet as never)));
  session.on.MC((packet) => broadcast((s) => s.send.MC(packet as never)));

  return session;
}

const staticFile = async (pathname: string): Promise<Response | null> => {
  const pub = Bun.file(`./public${pathname}`);
  if (await pub.exists()) return new Response(pub);
  const local = Bun.file(`./dev-assets${decodeURIComponent(pathname)}`);
  if (await local.exists()) return new Response(local);
  return null;
};

const server = Bun.serve<{ session: ClientSession | null }>({
  port: PORT,
  development: true,
  routes: {
    "/": index,
    "/index.html": index,
    "/client.html": clientHtml,
  },
  async fetch(req, srv) {
    // Upgrade AO WebSocket connections.
    if (req.headers.get("upgrade")?.toLowerCase() === "websocket") {
      if (srv.upgrade(req, { data: { session: null } })) return undefined;
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    const url = new URL(req.url);
    return (await staticFile(url.pathname)) ?? new Response("Not found", { status: 404 });
  },
  websocket: {
    open(ws) {
      ws.data.session = setupSession(ws);
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
        ws.data.session.close();
      }
      console.log(`[ao] client disconnected (${sessions.size} online)`);
    },
  },
});

const base = `http://localhost:${server.port}`;
console.log(`LemmyAO demo server on ${base}`);
console.log(`Join: ${base}/client.html?connect=ws://localhost:${server.port}`);
