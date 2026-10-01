import { client } from "../client";
import { safeHtmlTags } from "../escaping";
import type * as aolib from "aolib-ts";

/**
 * Handles the kicked packet
 * @param {string} type is it a kick or a ban
 * @param {string} reason why
 */
export function handleBans(type: string, reason: string) {
  document.getElementById("client_error_overlay")!.style.display = "flex";
  document.getElementById("client_errortext")!.innerHTML =
    `${type}:<br>${safeHtmlTags(reason).replace(/\n/g, "<br />")}`;
  (<HTMLElement>document.getElementById("client_reconnect")).style.display =
    "none";
  (<HTMLElement>document.getElementById("client_error_help")).style.display =
    "none";
}

/** BB: server pops a blocking warning the user must dismiss. */
export function showBlockingAlert(packet: aolib.packets.BB) {
  alert(packet.message);
}

/** BD: server rejects the connection with a persistent ban reason. */
export function showBanDialog(packet: aolib.packets.BD) {
  client.banned = true;
  handleBans("Banned", packet.reason);
}

/** KB: kicked AND banned (reconnect refused). */
export function showKickAndBanScreen(packet: aolib.packets.KB) {
  client.banned = true;
  handleBans("Banned", packet.reason);
}

/** KK: kicked (no ban); reconnect still allowed. */
export function showKickScreen(packet: aolib.packets.KK) {
  client.banned = true;
  handleBans("Kicked", packet.reason);
}
