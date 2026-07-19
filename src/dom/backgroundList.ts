import { client } from "../client";
import { AO_HOST } from "../client/aoHost";
import request from "../services/request";
import queryParser from "../utils/queryParser";
import { parseBackgroundFolderListing } from "../utils/parseBackgroundFolderListing";
import tryBackgroundUrls from "./updateBackgroundPreview";
import transparentPng from "../constants/transparentPng";

const { mode } = queryParser();

/**
 * "Backgrounds": an easier alternative to the manual background dropdown.
 * Rather than requiring a curated list file, this scans the asset host's
 * `background/` folder listing directly (the same directory index a
 * webserver shows when autoindex is on) and treats every subfolder as a
 * background.
 *
 * Pressing the button fetches that listing and opens a char-select-style
 * grid with one thumbnail per background; clicking one performs the same
 * change the manual background Change button does.
 */

/** Triggered by the "Backgrounds" button. */
export async function openBackgroundList() {
  const overlay = document.getElementById("client_backgroundselect")!;
  const table = document.getElementById("client_backgroundtable")!;
  const status = document.getElementById("client_backgroundstatus")!;
  const search = <HTMLInputElement>(
    document.getElementById("client_backgroundsearch")
  );

  overlay.style.display = "flex";
  search.value = "";
  table.innerHTML = "";
  status.textContent = "Loading backgrounds...";

  let names: string[];
  try {
    const html = await request(`${AO_HOST}background/`);
    names = parseBackgroundFolderListing(html);
  } catch (err) {
    console.warn(`there was no browsable background/ folder on ${AO_HOST}`);
    status.textContent =
      "This server doesn't provide a browsable background list (no directory listing at background/ on the asset host).";
    return;
  }

  if (names.length === 0) {
    status.textContent = "The server's background folder is empty.";
    return;
  }

  status.textContent = "";

  for (const name of names) {
    const slot = document.createElement("div");
    slot.className = "char-slot";

    const img = document.createElement("img");
    img.className = "demothing bg-thumb";
    img.loading = "lazy";
    img.alt = name;
    img.title = name;
    img.dataset.action = "pickBackground";
    img.dataset.background = name;
    img.src = transparentPng;
    tryBackgroundUrls(
      `${AO_HOST}background/${encodeURI(name.toLowerCase())}/defenseempty`,
    ).then((src) => {
      img.src = src;
    });

    slot.appendChild(img);
    table.appendChild(slot);
  }
}

/** Triggered by the Close button on the background select screen. */
export function closeBackgroundList() {
  document.getElementById("client_backgroundselect")!.style.display = "none";
}

/** Triggered by clicking a background thumbnail: change into that background. */
export function pickBackground(name: string) {
  if (!name) return;
  closeBackgroundList();

  if (mode === "join") {
    const oocName = (<HTMLInputElement>document.getElementById("OOC_name"))
      .value;
    client.server.send.CT({ name: oocName, message: `/bg ${name}` });
  } else if (mode === "replay") {
    client.server.receive(`BN#${name}#%`);
  }
}

/** Triggered when the background search bar is changed. */
export function backgroundlist_filter(_event: Event) {
  const searchname = (<HTMLInputElement>(
    document.getElementById("client_backgroundsearch")
  )).value.toLowerCase();

  document
    .querySelectorAll<HTMLElement>("#client_backgroundtable .char-slot")
    .forEach((slot) => {
      const img = slot.querySelector("img");
      const name = img ? img.title.toLowerCase() : "";
      slot.style.display =
        name.indexOf(searchname) === -1 ? "none" : "inline-block";
    });
}
