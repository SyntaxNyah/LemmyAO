import { client } from "../client";
import { AO_HOST } from "./aoHost";
import { request } from "../services/request";
import type * as aolib from "aolib-ts";

/** Reads the asset host's preferred file extensions, if it publishes them. */
export async function fetchExtensions() {
  try {
    const all = JSON.parse(await request(`${AO_HOST}extensions.json`));
    client.emote_extensions = all.emote_extensions || [".gif", ".png", ".apng", ".webp", ".webp.static"];
    client.background_extensions = all.background_extensions || [".png", ".gif", ".webp", ".apng"];
  } catch {
    console.debug("no extensions.json file (optional)");
  }
}

/** SI: the counts live in core; load the asset host's extension preferences. */
export function applyServerCounts(_packet: aolib.packets.SI) {
  fetchExtensions();
}
