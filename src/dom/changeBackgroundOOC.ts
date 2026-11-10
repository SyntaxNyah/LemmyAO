import queryParser from "../utils/queryParser";
import { client } from "../client";
import { sendOOC } from "../core/commands";
const { mode } = queryParser();

/**
 * Change background via OOC.
 */
export function changeBackgroundOOC() {
  const selectedBG = <HTMLSelectElement>document.getElementById("bg_select");
  const changeBGCommand = "bg $1";
  const bgFilename = <HTMLInputElement>document.getElementById("bg_filename");

  let filename = "";
  if (selectedBG.selectedIndex === 0) {
    filename = bgFilename.value;
  } else {
    filename = selectedBG.value;
  }

  if (mode === "join") {
    const name = (<HTMLInputElement>document.getElementById("OOC_name")).value;
    sendOOC(`/${changeBGCommand.replace("$1", filename)}`, name);
  } else if (mode === "replay") {
    client.server.receive(`BN#${filename}#%`);
  }
}
