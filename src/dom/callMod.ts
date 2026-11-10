import { extrafeatures } from "../client";
import { callMod as sendModcall } from "../core/commands";
/**
 * Call mod.
 */
export function callMod() {
  let modcall;
  if (extrafeatures.includes("modcall_reason")) {
    modcall = prompt("Please enter the reason for the modcall", "");
  }
  if (modcall == null || modcall === "") {
    // cancel
  } else {
    sendModcall(modcall);
  }
}
