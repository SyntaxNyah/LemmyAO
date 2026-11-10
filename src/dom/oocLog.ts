import { unescapeUnicode } from "../escaping";
import { flashPairActivity } from "./pairNotification";
import type * as aolib from "aolib-ts";

/** CT: flash the player list when someone talks about pairing. The OOC panel renders the message. */
export function appendOOCMessage(packet: aolib.packets.CTToClient) {
  flashPairActivity(unescapeUnicode(packet.message));
}
