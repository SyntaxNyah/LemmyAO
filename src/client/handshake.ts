/**
 * DOM side of the end of the handshake. The protocol replies live in
 * core/protocol.ts.
 */

import { client, autoChar, autoArea } from "../client";
import queryParser from "../utils/queryParser";
import { changeArea, pickCharacter } from "../core/commands";
import { state } from "../core/state";

const { mode } = queryParser();

/**
 * DONE: handshake complete. Reveal the char-select UI (unless we're a
 * spectator), then honor `?char=` / `?area=` autopick params from the
 * URL by clicking the matching area/char.
 */
export function finishServerJoin() {
  document.getElementById("client_loading")!.style.display = "none";
  if (mode === "watch") {
    // Spectators don't need to pick a character
    document.getElementById("client_waiting")!.style.display = "none";
  }

  if (autoArea) {
    const areaIndex = state.areas.findIndex((a) => a.name.toLowerCase() === autoArea.toLowerCase());
    if (areaIndex !== -1) changeArea(areaIndex);
  }

  if (autoChar) {
    // Hide charselect immediately (spectator mode) so the user isn't stuck
    // on the selection screen. If the CC request succeeds, PV will confirm.
    document.getElementById("client_waiting")!.style.display = "none";
    document.getElementById("client_charselect")!.style.display = "none";

    const charIndex = client.chars.findIndex(
      (c: any) => c && c.name.toLowerCase() === autoChar.toLowerCase(),
    );
    if (charIndex !== -1) {
      pickCharacter(charIndex);
    }
  }
}
