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

  // Symmetric FL: advertise our own capabilities back so the server sends GP /
  // additional_chars. aolib models FL as server→client only, so the typed C2S
  // send map has no `FL`; the runtime map carries both directions (loopback),
  // so cast to reach it.
  (
    client.server.send as unknown as {
      FL: (p: { features: string[] }) => void;
    }
  ).FL({ features: ["grouppair"] });

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
}
