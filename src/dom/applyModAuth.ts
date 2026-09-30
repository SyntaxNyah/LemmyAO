import type * as aolib from "aolib-ts";

/** AUTH: `auth_state === 1` swaps in the mod stylesheet. */
export function applyModAuth(packet: aolib.packets.AUTH) {
  if (packet.auth_state === 1) {
    (<HTMLAnchorElement>document.getElementById("mod_ui")).href = `styles/mod.css`;
  }
}
