import { parseCharIni, Side, type CharIni } from "aolib-ts";
import { state, type Emote } from "./state";
import { draft } from "./commands";

// parseCharIni needs an [options] name and at least one emote.
const STUB_INI = "[options]\nname = -\n[emote normal]\nanim = normal.png\n";

const iniCache = new Map<string, Promise<{ ini: CharIni; found: boolean }>>();

export const characterFolder = (name: string) =>
  `${state.server.assetHost}characters/${encodeURI(name.toLowerCase())}/`;

/**
 * Fetches and parses a character's char.ini once per asset host. A missing or
 * unreadable file yields a one-emote stub so callers can carry on.
 */
export function loadCharIni(name: string) {
  const url = `${characterFolder(name)}char.ini`;
  let pending = iniCache.get(url);
  if (!pending) {
    pending = fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return { ini: parseCharIni(await res.text()), found: true };
      })
      .catch((err) => {
        console.warn(`character ${name} has no usable char.ini:`, err);
        return { ini: parseCharIni(STUB_INI), found: false };
      });
    iniCache.set(url, pending);
  }
  return pending;
}

const KNOWN_SIDES = new Set<string>(Object.values(Side));

/** Turns a parsed char.ini into what the IC controls and MS need. */
export function emotesFromIni(ini: CharIni): Emote[] {
  return ini.emotes.map((e, i) => ({
    index: i + 1,
    label: e.name ?? "",
    preanim: (e.preanim ?? "-").toLowerCase(),
    anim: (e.anim ?? "").toLowerCase(),
    modifier: e.modifier,
    deskModifier: e.deskmod,
    sfx: (e.sound ?? "0").toLowerCase(),
    sfxDelay: e.sounddelayms ?? 0,
  }));
}

/** Points the draft at an emote, defaulting SFX and preanim to what it ships with. */
export function selectEmote(index: number) {
  const emote = state.self.character?.emotes[index];
  if (!emote) return;
  state.self.emoteIndex = index;
  draft.emote = {
    preanim: emote.preanim,
    anim: emote.anim,
    modifier: emote.modifier,
    deskModifier: emote.deskModifier,
    sfx: emote.sfx,
    sfxDelay: emote.sfxDelay,
  };
  draft.sendSfx = emote.sfx.length > 1;
  draft.sendPreanim = emote.preanim !== "-" && emote.preanim !== "";
}

/** Chooses where to speak from; "" means the character's own side. */
export function setPosition(position: Side | "") {
  state.self.position = position;
  draft.side = position || state.self.character?.side || Side.wit;
}

/** Loads our character after the server assigns it (PV). */
export async function loadOwnCharacter(charId: number) {
  const entry = state.characters[charId];
  state.self.character = null;
  if (!entry) return;
  const { ini } = await loadCharIni(entry.name);
  if (state.self.charId !== charId) return;
  const side = String(ini.options.side ?? "").toLowerCase();
  state.self.character = {
    name: entry.name,
    showname: String(ini.options.showname || entry.name),
    side: KNOWN_SIDES.has(side) ? (side as Side) : Side.wit,
    emotes: emotesFromIni(ini),
  };
  setPosition(state.self.position);
  selectEmote(0);
}
