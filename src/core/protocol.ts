import { AreaUpdateType, CharAvailability, type packets } from "aolib-ts";
import type { Connection } from "./connection";
import { state, type Area } from "./state";
import { emit } from "./events";
import { setAssetHost } from "./assetHost";

type S2C = packets.S2COutputs;

export type CoreHandlers = {
  [H in keyof S2C]?: (packet: S2C[H]) => void;
};

const AUDIO_EXTENSIONS = [".wav", ".mp3", ".ogg", ".opus"];
export const isAudio = (name: string) => AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext));

const newArea = (name: string): Area => ({
  name,
  players: 0,
  status: "IDLE",
  caseManager: "",
  lock: "FREE",
});

/**
 * SM/EM carry areas and music in one list: areas first, then music from the
 * first audio file on. The entry right before that first file is a music
 * category header, not an area.
 */
export function appendAreasAndMusic(names: string[]) {
  for (const name of names) {
    if (!name) continue;
    if (state.music.length > 0) {
      state.music.push(name);
    } else if (isAudio(name)) {
      const header = state.areas.pop();
      if (header) state.music.push(header.name);
      state.music.push(name);
    } else {
      state.areas.push(newArea(name));
    }
  }
}

const AREA_FIELDS: Partial<Record<AreaUpdateType, (area: Area, value: string) => void>> = {
  [AreaUpdateType.player_count]: (a, v) => (a.players = Number(v)),
  [AreaUpdateType.status]: (a, v) => (a.status = v),
  [AreaUpdateType.case_manager]: (a, v) => (a.caseManager = v),
  [AreaUpdateType.locked]: (a, v) => (a.lock = v),
};

/** State updates and protocol replies for server packets. Rendering lives elsewhere. */
export function coreHandlers(conn: Connection): CoreHandlers {
  const send = () => conn.server.send;

  return {
    decryptor: () => conn.hello(),

    ID: (p) => {
      state.server.playerId = p.player_id;
      state.server.software = p.software;
      state.server.version = p.version;
      send().ID({ software: conn.options.software, version: conn.options.version });
    },

    PN: (p) => {
      state.server.playerCount = p.player_count;
      state.server.maxPlayers = p.max_players;
      state.server.description = p.server_description;
      send().askchaa({});
    },

    FL: (p) => {
      state.server.features = [...p.features];
      // aolib models FL as server-to-client only, so advertise our own
      // features as a raw frame. JSON servers gate GP on JSON mode instead.
      conn.sendRaw("FL#grouppair#%");
    },

    ASS: (p) => {
      if (p.asset_url !== "None") setAssetHost(p.asset_url);
    },

    SI: (p) => {
      state.server.charCount = p.char_count;
      state.server.evidenceCount = p.evi_count;
      state.server.musicCount = p.mus_count;
      send().RC({});
    },

    SC: (p) => {
      state.characters = p.char_data.map((c) => ({
        name: c.name,
        description: c.desc ?? "",
        evidence: c.evidence ?? "",
        taken: false,
      }));
      send().RM({});
    },

    CI: (p) => {
      for (const { index, data } of p.entries) {
        const [name = "", description = "", , evidence = ""] = data.split("&");
        state.characters[index] = { name, description, evidence, taken: false };
      }
    },

    CharsCheck: (p) => {
      state.characters.forEach((c, i) => {
        if (p.taken[i] === CharAvailability.taken) c.taken = true;
        else if (p.taken[i] === CharAvailability.free) c.taken = false;
      });
    },

    SM: (p) => {
      state.areas = [];
      state.music = [];
      appendAreasAndMusic(p.music_list.map((m) => m.name));
      send().RD({});
    },

    EM: (p) => {
      if (p.batch_index === 0) {
        state.areas = [];
        state.music = [];
      }
      appendAreasAndMusic(p.entries.map((e) => e.name));
    },

    FM: (p) => {
      state.music = p.music_list.map((m) => m.name).filter(Boolean);
    },

    FA: (p) => {
      state.areas = p.areas.map(newArea);
    },

    ARUP: (p) => {
      const apply = AREA_FIELDS[p.update_type];
      if (!apply) return;
      p.update_data.forEach((value, i) => {
        // Servers may send ARUP before the area list.
        if (state.areas[i]) apply(state.areas[i], String(value));
      });
    },

    PV: (p) => {
      state.self.charId = p.char_id;
    },

    DONE: () => {
      state.connection.status = "joined";
      state.connection.wasJoined = true;
      emit("joined");
    },

    BD: (p) => {
      state.connection.removal = { kind: "banned", reason: p.reason };
    },
    KB: (p) => {
      state.connection.removal = { kind: "banned", reason: p.reason };
    },
    KK: (p) => {
      state.connection.removal = { kind: "kicked", reason: p.reason };
    },
  };
}
