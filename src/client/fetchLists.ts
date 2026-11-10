import { client } from "../client";
import { AO_HOST } from "./aoHost";
import { request } from "../services/request";
import type * as aolib from "aolib-ts";

/** Reads the asset host's preferred file extensions, if it publishes them. */
export async function fetchExtensions() {
  try {
    const all = JSON.parse(await request(`${AO_HOST}extensions.json`));
    client.charicon_extensions = all.charicon_extensions || [".png", ".webp"];
    client.emote_extensions = all.emote_extensions || [".gif", ".png", ".apng", ".webp", ".webp.static"];
    client.emotions_extensions = all.emotions_extensions || [".png", ".webp"];
    client.background_extensions = all.background_extensions || [".png", ".gif", ".webp", ".apng"];
  } catch {
    console.debug("no extensions.json file (optional)");
  }
}

/** SI: remember the server's counts and load its extension preferences. */
export function applyServerCounts(packet: aolib.packets.SI) {
  client.char_list_length = packet.char_count;
  client.evidence_list_length = packet.evi_count;
  client.music_list_length = packet.mus_count;
  fetchExtensions();
}
