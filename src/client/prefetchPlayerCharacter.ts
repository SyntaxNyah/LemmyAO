import { PlayerDataType } from "aolib-ts";
import type * as aolib from "aolib-ts";
import { characterInfo } from "../core/character";

/** PU: load a player's char.ini as soon as they pick a character, before they speak. */
export function prefetchPlayerCharacter(packet: aolib.packets.PU) {
  if (packet.type === PlayerDataType.char_name && packet.data) void characterInfo(packet.data);
}
