import { client } from "../client";
import { safeHtmlTags } from "../escaping";
import { Side } from "aolib-ts";
import { loadCharIni } from "../core/character";
import type * as aolib from "aolib-ts";

/**
 * Records a roster entry in client.chars, which the stage reads. char.ini is
 * loaded later, when needed, by ensureCharIni.
 */
export function setupCharacterBasic(chargs: string[], charid: number) {
  if (!chargs[0]) {
    console.warn(
      `character slot ${charid} has no usable name in the server character list ` +
        `(got ${JSON.stringify(chargs[0])})`,
    );
    return;
  }
  client.chars[charid] = {
    name: safeHtmlTags(chargs[0]),
    showname: safeHtmlTags(chargs[0]),
    desc: safeHtmlTags(chargs[1]),
    blips: "male",
    side: Side.def,
    chat: "",
    evidence: chargs[3],
    icon: "",
    muted: false,
  };
}

/**
 * Fetches and parses char.ini for a character if not already loaded.
 * Replaces default values in client.chars[charid] with actual ini values.
 */
export async function ensureCharIni(charid: number): Promise<any> {
  const char = client.chars[charid];
  if (!char) return {};
  if (char.inifile) return char.inifile;

  const { ini: cini } = await loadCharIni(char.name);

  // parseCharIni already applies AO defaults (side "wit", blips from the
  // obsolete gender key then "male", model ""). Only LemmyAO-specific bits
  // remain: fall showname back to the roster name, resolve chat -> category ->
  // "default" (aolib leaves an absent chat null, which would read as a
  // blankpost and hide the chatbox), and lowercase for asset lookups.
  const opt = cini.options;
  char.showname = safeHtmlTags(opt.showname || char.name);
  char.blips = safeHtmlTags(opt.blips).toLowerCase();
  char.side = safeHtmlTags(opt.side).toLowerCase();
  char.chat = safeHtmlTags(opt.chat || opt.category || "").toLowerCase() || "default";
  // A `model = foo.pmx` key marks the character as 3D (MMD .pmx + .vmd).
  char.model = safeHtmlTags(opt.model).toLowerCase();
  char.inifile = cini;

  return cini;
}

/**
 * Reloads a character's data after it changed name (iniedit), replacing any
 * existing data.
 */
export async function handleCharacterInfo(chargs: string[], charid: number) {
  if (!chargs[0]) return;
  if (client.chars[charid]) {
    client.chars[charid].name = safeHtmlTags(chargs[0]);
    client.chars[charid].inifile = null;
  } else {
    setupCharacterBasic(chargs, charid);
  }
  await ensureCharIni(charid);
}

/** SC: record the full roster. */
export function applyFullCharacterList(packet: aolib.packets.SC) {
  packet.char_data.forEach((c, i) => setupCharacterBasic([c.name, c.desc ?? "", "", c.evidence ?? ""], i));
}

/** CI: record one batch of the roster. */
export function applyCharacterBatch(packet: aolib.packets.CI) {
  for (const { index, data } of packet.entries) {
    handleCharacterInfo(data.split("&"), index);
  }
}
