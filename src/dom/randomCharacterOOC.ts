import { sendOOC } from "../core/commands";
/**
 * Random character via OOC.
 */
export function randomCharacterOOC() {
  const name = (<HTMLInputElement>document.getElementById("OOC_name")).value;
  sendOOC("/randomchar", name);
}
