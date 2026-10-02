import { client, setExtraFeatures } from "../client";
import type * as aolib from "aolib-ts";

/**
 * FL: server advertises its supported features. Each known flag turns
 * on a piece of UI (yellowtext = expanded color palette, cccc_ic_support
 * = pairing UI, flipping = mirror button, etc.).
 */
export function applyFeatureFlags(packet: aolib.packets.FL) {
  const { features } = packet;
  setExtraFeatures(features);

  // The feature-gated UI below is driven purely by the server's advertised
  // features. The client->server FL advert (advertising "grouppair" back) is
  // sent at the END, after this UI is shown, so a failure there can never hide
  // the buttons.

  if (features.includes("yellowtext")) {
    const colorselect = <HTMLSelectElement>document.getElementById("textcolor");
    colorselect.options[colorselect.options.length] = new Option("Yellow", "5");
    colorselect.options[colorselect.options.length] = new Option("Pink", "6");
    colorselect.options[colorselect.options.length] = new Option("Cyan", "7");
    colorselect.options[colorselect.options.length] = new Option("Grey", "8");
    colorselect.options[colorselect.options.length] = new Option("Rainbow", "9");
  }

  if (features.includes("cccc_ic_support")) {
    document.getElementById("cccc")!.style.display = "";
    document.getElementById("pairing")!.style.display = "";
  }

  if (features.includes("flipping")) {
    document.getElementById("button_flip")!.style.display = "";
  }

  if (features.includes("looping_sfx")) {
    document.getElementById("button_shake")!.style.display = "";
    document.getElementById("2.7")!.style.display = "";
  }

  if (features.includes("effects")) {
    document.getElementById("2.8")!.style.display = "";
  }

  if (features.includes("y_offset")) {
    document.getElementById("y_offset")!.style.display = "";
  }

  // Advertise our own capabilities back (client->server FL) so FantaCode
  // servers learn we support "grouppair". aolib models FL as server->client
  // only, so the typed C2S `send.FL` throws the role guard and `sendCustom`
  // throws for a spec header — send the raw wire directly instead. Best-effort
  // and fully guarded: it runs last, and a failure must never hide the UI.
  try {
    const socket = client.socket;
    const jsonMode =
      (client.server as unknown as { jsonMode?: boolean }).jsonMode === true;
    if (socket && socket.readyState === WebSocket.OPEN && !jsonMode) {
      socket.send("FL#grouppair#%");
    }
  } catch {
    // The advert is optional; JSON servers gate GP on JSON mode.
  }
}
