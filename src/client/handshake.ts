import { autoChar, autoArea } from "../client";
import { changeArea, pickCharacter } from "../core/commands";
import { state } from "../core/state";

/** DONE: honor the ?area= and ?char= auto-join parameters. */
export function finishServerJoin() {
  if (autoArea) {
    const areaIndex = state.areas.findIndex((a) => a.name.toLowerCase() === autoArea.toLowerCase());
    if (areaIndex !== -1) changeArea(areaIndex);
  }
  if (autoChar) {
    const charIndex = state.characters.findIndex((c) => c?.name.toLowerCase() === autoChar.toLowerCase());
    if (charIndex !== -1) pickCharacter(charIndex);
  }
}
