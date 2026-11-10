import { client } from "../client";
import { ensureCharIni } from "./handleCharacterInfo";
import type * as aolib from "aolib-ts";

/** PV: the server assigned us a character. Core loads it for the IC controls. */
export function applyCharacterPick(packet: aolib.packets.PV) {
  changeChar(packet.char_id);
}

/**
 * Loads the character's ini for the stage.
 * Also called after an iniedit or iniswap to reload it in place.
 */
export async function changeChar(char_id: number) {
  client.charID = char_id;

  const me = client.chars[char_id];
  if (!me) return;
  const ini = await ensureCharIni(char_id);
  me.side = (ini.options?.side || "def").toLowerCase();
}
