import { setExtraFeatures } from "../client";
import type * as aolib from "aolib-ts";

/** FL: keep the legacy feature list. The IC controls read features from core. */
export function applyFeatureFlags(packet: aolib.packets.FL) {
  setExtraFeatures(packet.features);
  const yOffset = document.getElementById("y_offset");
  if (yOffset && packet.features.includes("y_offset")) yOffset.style.display = "";
}
