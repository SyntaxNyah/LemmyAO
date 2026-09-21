import { client } from "../../client";
import setEmoteFromUrl from "../../client/setEmoteFromUrl";
import transparentPng from "../../constants/transparentPng";
import { isFullView, Side } from "../../aolib";
import { getMmdController, existingMmdController } from "./index";
import { MmdState, Model3dInfo } from "./types";

/**
 * Applies one emote phase to the main (non-pair) character slot. For a 3D
 * character the emote's animation (preanim -> loop, camera) is started once by
 * setupCharacterSlot, so here the phases just toggle talking: the mouth moves
 * while speaking and stops on idle. Otherwise it falls back to the sprite <img>.
 * Pair characters always use sprites.
 *
 * `spriteUrl` is the pre-resolved sprite for the 2D path and is ignored for
 * 3D characters.
 */
export function applyCharacterEmote(
  state: MmdState,
  spriteUrl: string,
  pair: boolean,
  side: Side,
): void {
  const chatmsg = client.viewport.getChatmsg();
  if (!pair && chatmsg?.model3d) {
    // preanim is part of the emote clip chain (setupCharacterSlot); ignore here.
    if (state === "preanim") return;
    getMmdController().then((controller) => controller?.setTalking(state === "talking"));
    return;
  }
  setEmoteFromUrl(spriteUrl, pair, side);
}

/**
 * Places and shows the 3D model in the active slot (hiding the slot's sprite),
 * or tears down the 3D canvas when the speaker is a 2D character. Called once
 * per message from renderICMessage before the chat_tick timeline starts.
 */
export function setupCharacterSlot(
  side: Side,
  model3d: Model3dInfo | null | undefined,
): void {
  if (!model3d) {
    // Only tear down if the 3D runtime already exists — a plain 2D message
    // must never trigger the Babylon import.
    existingMmdController()?.hide();
    return;
  }
  getMmdController().then((controller) => {
    if (!controller) return;
    const slotId = isFullView(side) ? `client_${side}_char` : "client_char";
    const container = document.getElementById(slotId);
    const img = document.getElementById(
      isFullView(side) ? `client_${side}_char_img` : "client_char_img",
    ) as HTMLImageElement | null;
    if (!container) return;
    // Blank the sprite so it doesn't show behind the model.
    if (img) img.src = transparentPng;
    controller.place(container);
    controller.show(model3d);
    controller.playEmote(model3d);
  });
}
