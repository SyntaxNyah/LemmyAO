import { updateActionCommands } from "./updateActionCommands";
import * as aolib from "aolib-ts";
import { sendOOC } from "../core/commands";

const KNOWN_SIDES = new Set<string>(Object.values(aolib.Side));
const parseSide = (s: string): aolib.Side =>
  KNOWN_SIDES.has(s.toLowerCase())
    ? (s.toLowerCase() as aolib.Side)
    : aolib.Side.wit;

/** Change role via OOC slash command. */
export function changeRoleOOC() {
  const roleselect = <HTMLInputElement>document.getElementById("role_select");
  const side = parseSide(roleselect.value);
  sendOOC(`/pos ${roleselect.value}`);
  // SP is a server -> client packet; locally apply the side change instead
  // of trying to send it (the server's broadcast will confirm).
  updateActionCommands(side);
}
