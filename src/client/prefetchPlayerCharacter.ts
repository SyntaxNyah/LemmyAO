import { PlayerDataType } from "aolib-ts";
import type * as aolib from "aolib-ts";
import { client } from "../client";
import { ensureCharIni } from "./handleCharacterInfo";

/** PU: load a player's char.ini as soon as they pick a character, before they speak. */
export function prefetchPlayerCharacter(packet: aolib.packets.PU) {
  if (packet.type !== PlayerDataType.char_name) return;
  const charId = client.chars.findIndex((c: any) => c?.name.toLowerCase() === packet.data.toLowerCase());
  if (charId >= 0) void ensureCharIni(charId);
}
