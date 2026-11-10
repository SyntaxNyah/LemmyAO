import { client } from "../client";
import { setSetting } from "../core/settings";

/**
 * Triggered by a changed callword list
 */
export function changeCallwords() {
  client.callwords = (<HTMLInputElement>(
    document.getElementById("client_callwords")
  )).value.split("\n");
  setSetting("callwords", client.callwords);
}
