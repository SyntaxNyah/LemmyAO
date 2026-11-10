import {
  AreaUpdateType,
  AuthState,
  CharAvailability,
  PenaltyBar,
  PlayerDataType,
  PlayerListUpdate,
  RTAnimation,
  TimerCommand,
  type packets,
} from "aolib-ts";
import type { Connection } from "./connection";
import { state, type Area, type Player } from "./state";
import { logIC, logNotice, logOOC, matchesCallword } from "./log";
import { settings } from "./settings";
import { emit } from "./events";
import { setAssetHost } from "./assetHost";
import { loadOwnCharacter } from "./character";

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

const charIdByName = (name: string) => {
  const lower = name.toLowerCase();
  return state.characters.findIndex((c) => c?.name.toLowerCase() === lower);
};

const PLAYER_FIELDS: Record<PlayerDataType, (p: Player, value: string) => void> = {
  [PlayerDataType.ooc_name]: (p, v) => (p.name = v),
  [PlayerDataType.char_name]: (p, v) => {
    p.charName = v;
    p.charId = charIdByName(v);
  },
  [PlayerDataType.showname]: (p, v) => (p.showName = v),
  [PlayerDataType.area_id]: (p, v) => (p.area = Number(v)),
};

const CASE_ROLES = [
  ["need_def", "Defense"],
  ["need_pro", "Prosecution"],
  ["need_judge", "Judge"],
  ["need_jury", "Jury"],
  ["need_steno", "Stenographer"],
] as const;

let lastICMessage: string | null = null;

const AREA_FIELDS: Partial<Record<AreaUpdateType, (area: Area, value: string) => void>> = {
  [AreaUpdateType.player_count]: (a, v) => (a.players = Number(v)),
  [AreaUpdateType.status]: (a, v) => (a.status = v),
  [AreaUpdateType.case_manager]: (a, v) => (a.caseManager = v),
  [AreaUpdateType.locked]: (a, v) => (a.lock = v),
};

/** State updates and protocol replies for server packets. Rendering lives elsewhere. */
export function coreHandlers(conn: Connection): CoreHandlers {
  const send = () => conn.server.send;
  lastICMessage = null;

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
      loadOwnCharacter(p.char_id);
    },

    DONE: () => {
      if (!state.connection.wasJoined) logNotice("Connected");
      state.connection.status = "joined";
      state.connection.wasJoined = true;
      emit("joined");
    },

    LE: (p) => {
      // "LE##%" (empty list from some servers) decodes as one blank item.
      const blank = p.evidence.length === 1 && !p.evidence[0].name && !p.evidence[0].image;
      state.evidence = blank ? [] : p.evidence.map((e) => ({ ...e }));
    },

    EI: (p) => {
      state.evidence[p.id] = { ...p.details };
    },

    PR: (p) => {
      if (p.type === PlayerListUpdate.add) {
        state.players[p.id] = { id: p.id, name: "", charName: "", showName: "", charId: -1, area: 0 };
      } else if (p.type === PlayerListUpdate.remove) {
        delete state.players[p.id];
      }
    },

    PU: (p) => {
      const player = state.players[p.id];
      if (player) PLAYER_FIELDS[p.type]?.(player, p.data);
    },

    CT: (p) => {
      logOOC({
        kind: "chat",
        name: p.name,
        message: p.message,
        fromServer: p.is_from_server,
        time: Date.now(),
      });
    },

    ZZ: (p) => {
      logOOC({ kind: "modcall", message: p.reason, time: Date.now() });
      emit("modcall", p.reason);
    },

    CASEA: (p) => {
      const roles = CASE_ROLES.filter(([key]) => p[key]).map(([, label]) => label);
      logOOC({ kind: "case", message: p.message, roles, time: Date.now() });
    },

    MS: (p) => {
      // Servers echo a message to everyone, sometimes more than once.
      if (p.message === lastICMessage) return;
      lastICMessage = p.message;
      if (state.self.muted.includes(p.char_id)) return;
      const callword = matchesCallword(p.message, settings.callwords);
      logIC({
        kind: "message",
        charId: p.char_id,
        character: p.character,
        showname: p.showname,
        message: p.message,
        color: p.text_color,
        callword,
        time: Date.now(),
      });
      emit("icMessage", p);
      if (callword) emit("callword");
    },

    MC: (p) => {
      state.court.music[p.channel] = { track: p.name, looping: p.looping };
      emit("music", p);
      logIC({
        kind: "music",
        charId: p.char_id,
        showname: p.showname,
        track: p.name,
        looping: p.looping,
        time: Date.now(),
      });
    },

    RMC: (p) => {
      emit("musicSeek", parseFloat(p.to_time));
    },

    BN: (p) => {
      state.court.background = p.background;
      emit("background", p.background);
    },

    HP: (p) => {
      const bar = p.bar === PenaltyBar.defense ? "defense" : "prosecution";
      state.court.hp[bar] = p.value;
    },

    RT: (p) => {
      state.court.testimony = p.animation === RTAnimation.end_animation ? null : p.animation;
      emit("testimony", p.animation);
    },

    TI: (p) => {
      const timer = (state.court.timers[p.timer_id] ??= {
        visible: false,
        running: false,
        time: 0,
        updatedAt: 0,
      });
      switch (p.command) {
        case TimerCommand.start:
        case TimerCommand.pause:
          timer.running = p.command === TimerCommand.start;
          timer.time = p.time;
          timer.updatedAt = Date.now();
          break;
        case TimerCommand.show:
          timer.visible = true;
          break;
        case TimerCommand.hide:
          timer.visible = false;
          break;
      }
    },

    SP: (p) => {
      state.self.side = p.side;
    },

    JD: (p) => {
      state.self.judgeControls = p.state;
    },

    AUTH: (p) => {
      state.self.moderator = p.auth_state === AuthState.success;
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
