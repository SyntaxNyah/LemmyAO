import { reactive, readonly } from "@vue/reactivity";

interface Codec<T> {
  decode(raw: string | null, fallback: T): T;
  encode(value: T): string;
}

const text: Codec<string> = {
  decode: (raw, fallback) => raw ?? fallback,
  encode: (v) => v,
};

const lines: Codec<string[]> = {
  decode: (raw, fallback) => (raw == null ? fallback : raw.split("\n")),
  encode: (v) => v.join("\n"),
};

const stringList: Codec<string[]> = {
  decode: (raw, fallback) => {
    try {
      const v = JSON.parse(raw ?? "");
      return Array.isArray(v) ? v.filter((x) => typeof x === "string") : fallback;
    } catch {
      return fallback;
    }
  },
  encode: (v) => JSON.stringify(v),
};

const range = (min: number, max: number): Codec<number> => ({
  decode: (raw, fallback) => {
    if (raw == null || raw.trim() === "") return fallback;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  },
  encode: (v) => String(Math.min(max, Math.max(min, v))),
});

// Legacy keys used two boolean spellings; each key keeps the one it shipped with.
const flag = (on: string, off: string): Codec<boolean> => ({
  decode: (raw, fallback) => (raw === on ? true : raw === off ? false : fallback),
  encode: (v) => (v ? on : off),
});
const flagText = flag("true", "false");
const flag01 = flag("1", "0");

interface Field<T> {
  key: string;
  codec: Codec<T>;
  fallback: T;
}

const field = <T>(key: string, codec: Codec<T>, fallback: T): Field<T> => ({
  key,
  codec,
  fallback,
});

const schema = {
  oocName: field("OOC_name", text, ""),
  showname: field("ic_chat_name", text, ""),
  shownamesEnabled: field("showname", flagText, true),
  callwords: field("callwords", lines, [] as string[]),
  chatbox: field("chatbox", text, "dynamic"),
  font: field("selectedFont", text, "sans-serif"),
  customFont: field("customFont", text, ""),

  musicVolume: field("musicVolume", range(0, 1), 1),
  sfxVolume: field("sfxVolume", range(0, 1), 1),
  blipVolume: field("blipVolume", range(0, 1), 1),
  blipPitch: field("blipPitch", range(0.5, 2), 1),
  musicMuted: field("musicMuted", flag01, false),
  sfxMuted: field("sfxMuted", flag01, false),
  blipMuted: field("blipMuted", flag01, false),

  panTilt: field("panTilt", flagText, false),
  hideDesks: field("hideDesks", flagText, false),
  chatOffset: field("chatOffset", range(0, 100), 0),
  preanimGlow: field("preanimGlowEnabled", flagText, true),
  preanimGlowColor: field("preanimGlowColor", text, "#ffcf4d"),
  preanimGlowIntensity: field("preanimGlowIntensity", range(0, 100), 50),

  voiceInputDevice: field("voiceInputDevice", text, ""),
  voiceMuted: field("vcMuted", flag01, false),
  voiceOpenMic: field("voiceOpenMic", flag01, false),
  voiceOutputVolume: field("voiceOutputVolume", range(0, 1), 1),

  favouriteServers: field("favouriteServers", stringList, [] as string[]),
};

type Schema = typeof schema;
export type SettingKey = keyof Schema;
export type Settings = { [K in SettingKey]: Schema[K] extends Field<infer T> ? T : never };

// Private browsing and blocked site data make localStorage throw.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* settings still apply for this session */
  }
}

function load<K extends SettingKey>(name: K): Settings[K] {
  const { key, codec, fallback } = schema[name] as unknown as Field<Settings[K]>;
  return codec.decode(read(key), fallback);
}

function loadAll(): Settings {
  const out = {} as Settings;
  for (const name of Object.keys(schema) as SettingKey[]) {
    (out as Record<SettingKey, unknown>)[name] = load(name);
  }
  return out;
}

const state = reactive(loadAll()) as Settings;

/** Live, read-only view of every setting. Change values with `setSetting`. */
export const settings: Readonly<Settings> = readonly(state) as Readonly<Settings>;

export function setSetting<K extends SettingKey>(name: K, value: Settings[K]) {
  const { key, codec } = schema[name] as unknown as Field<Settings[K]>;
  const encoded = codec.encode(value);
  write(key, encoded);
  (state as Settings)[name] = codec.decode(encoded, value);
}

/** Clears the given settings (all by default) and restores their defaults. */
export function resetSettings(names: readonly SettingKey[] = Object.keys(schema) as SettingKey[]) {
  for (const name of names) {
    write(schema[name].key, null);
    (state as Record<SettingKey, unknown>)[name] = load(name);
  }
}

/** Re-reads storage, e.g. after another tab changed it. */
export function reloadSettings() {
  Object.assign(state, loadAll());
}

const favouritesKey = (host: string) => `favourites_${host}`;

/** Favourite character ids, stored per asset host. */
export function getFavourites(host: string): Set<number> {
  try {
    const parsed = JSON.parse(read(favouritesKey(host)) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter(Number.isInteger) : []);
  } catch {
    return new Set();
  }
}

export function setFavourites(host: string, ids: Iterable<number>) {
  write(favouritesKey(host), JSON.stringify([...ids]));
}
