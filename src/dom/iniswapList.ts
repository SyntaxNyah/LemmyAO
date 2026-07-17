import { client } from "../client";
import { AO_HOST } from "../client/aoHost";
import { changeChar } from "../client/changeChar";
import { handleCharacterInfo } from "../client/handleCharacterInfo";
import request from "../services/request";
import { parseIniswapList } from "../utils/parseIniswapList";
import { charError } from "./charError";

/**
 * "Iniswap List": an easier alternative to the manual iniswap field.
 * Server owners drop an `iniswap.txt` at the root of their asset host
 * (next to characters.json), listing one iniswap folder name per line.
 * Lines starting with # are treated as comments and skipped.
 *
 * Pressing the button fetches that file and opens a char-select-style
 * grid of the listed characters; clicking one performs the same swap
 * the manual Change button does.
 */

/** Triggered by the "Iniswap List" settings button. */
export async function openIniswapList() {
  const overlay = document.getElementById("client_iniswapselect")!;
  const table = document.getElementById("client_iniswaptable")!;
  const status = document.getElementById("client_iniswapstatus")!;
  const search = <HTMLInputElement>(
    document.getElementById("client_iniswapsearch")
  );

  overlay.style.display = "flex";
  search.value = "";
  table.innerHTML = "";
  status.textContent = "Loading iniswap list...";

  let names: string[];
  try {
    const data = await request(`${AO_HOST}iniswap.txt`);
    names = parseIniswapList(data);
  } catch (err) {
    console.warn(`there was no iniswap.txt file on ${AO_HOST}`);
    status.textContent =
      "This server doesn't provide an iniswap list (no iniswap.txt on the asset host).";
    return;
  }

  if (names.length === 0) {
    status.textContent = "The server's iniswap list is empty.";
    return;
  }

  status.textContent = "";

  const iconExt = client.charicon_extensions[0] || ".png";
  for (const name of names) {
    const slot = document.createElement("div");
    slot.className = "char-slot";

    const img = document.createElement("img");
    img.className = "demothing";
    img.loading = "lazy";
    img.alt = name;
    img.title = name;
    img.dataset.action = "pickIniswap";
    img.dataset.iniswap = name;
    img.src = `${AO_HOST}characters/${encodeURI(
      name.toLowerCase(),
    )}/char_icon${iconExt}`;
    img.onerror = () => charError(img);

    slot.appendChild(img);
    table.appendChild(slot);
  }
}

/** Triggered by the Close button on the iniswap select screen. */
export function closeIniswapList() {
  document.getElementById("client_iniswapselect")!.style.display = "none";
}

/** Triggered by clicking an iniswap icon: swap into that folder. */
export async function pickIniswap(name: string) {
  if (!name) return;
  if (client.charID < 0) {
    document.getElementById("client_iniswapstatus")!.textContent =
      "Pick a character first — iniswapping replaces your current character.";
    return;
  }
  closeIniswapList();
  await handleCharacterInfo(name.split("&"), client.charID);
  await changeChar(client.charID);
}

/** Triggered when the iniswap search bar is changed. */
export function iniswaplist_filter(_event: Event) {
  const searchname = (<HTMLInputElement>(
    document.getElementById("client_iniswapsearch")
  )).value.toLowerCase();

  document
    .querySelectorAll<HTMLElement>("#client_iniswaptable .char-slot")
    .forEach((slot) => {
      const img = slot.querySelector("img");
      const name = img ? img.title.toLowerCase() : "";
      slot.style.display =
        name.indexOf(searchname) === -1 ? "none" : "inline-block";
    });
}
