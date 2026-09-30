import { client } from "../client";
import { safeHtmlTags } from "../escaping";
import { parseCharIni, Side } from "aolib-ts";
import request from "../services/request";
import { AO_HOST } from "./aoHost";
import { observeCharIcon } from "./observeCharIcons";

/**
 * Lightweight character setup that runs on join. Sets the icon src directly
 * (letting the browser handle loading) and stores default character data.
 * Does NOT fetch char.ini — that is deferred until needed via ensureCharIni.
 */
export function setupCharacterBasic(chargs: string[], charid: number) {
  const img = <HTMLImageElement>document.getElementById(`demo_${charid}`);
  if (chargs[0]) {
    img.alt = chargs[0];
    img.title = chargs[0];
    const iconExt = client.charicon_extensions[0] || ".png";
    // Store the icon URL in dataset; observeCharIcon copies it onto
    // `src` when the slot scrolls into view. Setting src on thousands
    // of icons up front leaves them all .complete=false forever,
    // blocking window.load.
    img.dataset.iconUrl = `${AO_HOST}characters/${encodeURI(
      chargs[0].toLowerCase(),
    )}/char_icon${iconExt}`;
    observeCharIcon(img);

    const mute_select = <HTMLSelectElement>(
      document.getElementById("mute_select")
    );
    mute_select.add(new Option(safeHtmlTags(chargs[0]), String(charid)));
    const pair_select = <HTMLSelectElement>(
      document.getElementById("pair_select")
    );
    pair_select.add(new Option(safeHtmlTags(chargs[0]), String(charid)));

    // Store defaults — these get replaced with actual ini values by ensureCharIni
    client.chars[charid] = {
      name: safeHtmlTags(chargs[0]),
      showname: safeHtmlTags(chargs[0]),
      desc: safeHtmlTags(chargs[1]),
      blips: "male",
      side: Side.def,
      chat: "",
      evidence: chargs[3],
      icon: "",
      muted: false,
    };
  } else {
    console.warn(`missing charid ${charid}`);
    img.style.display = "none";
  }
}

/**
 * Fetches and parses char.ini for a character if not already loaded.
 * Replaces default values in client.chars[charid] with actual ini values.
 */
export async function ensureCharIni(charid: number): Promise<any> {
  const char = client.chars[charid];
  if (!char) return {};
  if (char.inifile) return char.inifile;

  const img = <HTMLImageElement>document.getElementById(`demo_${charid}`);
  let cini: any = {};

  try {
    const cinidata = await request(
      `${AO_HOST}characters/${encodeURI(char.name.toLowerCase())}/char.ini`,
    );
    cini = parseCharIni(cinidata);
  } catch (err) {
    // No char.ini (or unreadable): fall back to a minimal valid CharIni so
    // downstream option access stays safe. parseCharIni rejects an empty string
    // (it requires an [options] section with a name), so feed a bare stub; the
    // roster name is used for display regardless.
    cini = parseCharIni("[options]\nname = -\n");
    if (img) img.classList.add("noini");
    console.warn(`character ${char.name} is missing from webAO`);
  }

  // parseCharIni already applies AO defaults (side "wit", blips from the
  // obsolete gender key then "male", model ""). Only LemmyAO-specific bits
  // remain: fall showname back to the roster name, resolve chat -> category ->
  // "default" (aolib leaves an absent chat null, which would read as a
  // blankpost and hide the chatbox), and lowercase for asset lookups.
  const opt = cini.options;
  char.showname = safeHtmlTags(opt.showname || char.name);
  char.blips = safeHtmlTags(opt.blips).toLowerCase();
  char.side = safeHtmlTags(opt.side).toLowerCase();
  char.chat = safeHtmlTags(opt.chat || opt.category || "").toLowerCase() || "default";
  char.icon = img ? img.src : "";
  // A `model = foo.pmx` key marks the character as 3D (MMD .pmx + .vmd).
  char.model = safeHtmlTags(opt.model).toLowerCase();
  char.inifile = cini;

  return cini;
}

/**
 * Full character info load (used by iniEdit and receiveMS ini-edit path).
 * Fetches icon + ini for a single character, replacing any existing data.
 */
export async function handleCharacterInfo(chargs: string[], charid: number) {
  const img = <HTMLImageElement>document.getElementById(`demo_${charid}`);
  if (chargs[0]) {
    img.alt = chargs[0];
    img.title = chargs[0];
    const iconExt = client.charicon_extensions[0] || ".png";
    img.src = `${AO_HOST}characters/${encodeURI(
      chargs[0].toLowerCase(),
    )}/char_icon${iconExt}`;

    // Reset inifile so ensureCharIni will re-fetch
    if (client.chars[charid]) {
      client.chars[charid].name = safeHtmlTags(chargs[0]);
      client.chars[charid].inifile = null;
    } else {
      setupCharacterBasic(chargs, charid);
    }

    await ensureCharIni(charid);
  } else {
    console.warn(`missing charid ${charid}`);
    img.style.display = "none";
  }
}

// ---------------------------------------------------------------------
// Inbound packet handlers for the character download phase. Registered
// against the aolib session in `src/packets.ts`.
// ---------------------------------------------------------------------

import queryParser from "../utils/queryParser";
import type * as aolib from "aolib-ts";

const { mode: characterListMode } = queryParser();

/**
 * SC: server pushes the full character roster. aolib delivers each
 * entry as `{name, desc, evidence}`; we adapt it to the legacy
 * positional `chargs` layout `setupCharacterBasic` expects (with an
 * empty blips slot at index 2). Once the roster is loaded we ask the
 * server for the music list.
 */
export async function applyFullCharacterList(packet: aolib.packets.SC) {
  if (characterListMode === "watch") {
    // Spectators don't pick a character
    document.getElementById("client_charselect")!.style.display = "none";
  } else {
    document.getElementById("client_charselect")!.style.display = "block";
  }

  for (let i = 0; i < packet.char_data.length; i++) {
    const c = packet.char_data[i];
    setupCharacterBasic([c.name, c.desc, "", c.evidence], i);
  }
  client.server.send.RM({});
}

/**
 * CI: server pushes one incremental character batch; we forward each
 * `&`-delimited entry and request the next batch.
 */
export function applyCharacterBatch(packet: aolib.packets.CI) {
  document.getElementById("client_loadingtext")!.innerHTML =
    `Loading Character ${packet.batchIndex}/${client.char_list_length}`;
  for (const { index, data } of packet.entries) {
    const chargs = data.split("&");
    setTimeout(() => handleCharacterInfo(chargs, index), 500);
  }
  // aolib 2.x dropped the AN pagination cursor; the character list streams
  // without a per-batch ack.
}
