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

  // Advertise our own capabilities back (client->server FL) for the features
  // this server actually implements. Raw wire on purpose: aolib-ts models FL as
  // server->client only, so the typed `send.FL` throws the role guard and
  // `sendCustom` throws for a spec header. Nyathena accepts the positional form
  // on a JSON session because it auto-detects the wire format per frame — the
  // previous `!jsonMode` guard suppressed the advert in exactly that case, so a
  // JSON-mode peer never advertised at all. Gating on the ADVERTISED FEATURE
  // (rather than on wire mode) also keeps us from sending FantaCode frames to
  // servers that implement neither extension.
  if (features.includes("grouppair")) {
    sendRawFL("grouppair");
  }
  if (features.includes("timeleap")) {
    sendRawFL("timeleap");
  }
}

// sendRawFL advertises one capability back to the server as a positional FL
// frame. Best-effort and fully guarded: a failure must never hide the UI.
function sendRawFL(feature: string): void {
  try {
    const socket = client.socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(`FL#${feature}#%`);
    }
  } catch {
    // The advert is optional.
  }
}
