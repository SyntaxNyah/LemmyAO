import type * as aolib from "aolib-ts";

/** BB: server pops a blocking warning the user must dismiss. */
export function showBlockingAlert(packet: aolib.packets.BB) {
  alert(packet.message);
}
