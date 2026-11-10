import type { Side } from "aolib-ts";
import transparentPng from "../constants/transparentPng";
import { charLayer } from "../viewport/elements";

/**
 * Sets a pre-resolved emote URL on the character (or pair) sprite for a side.
 * Synchronous: the image is already in the browser cache from preloading.
 */
const setEmoteFromUrl = (url: string, pair: boolean, side: Side): void => {
  const img = charLayer(side, pair).img;
  // Reassigning the same URL restarts an animation in Chrome, which would
  // desync a preanim from its timer.
  const next = url || transparentPng;
  if (img.src !== next) img.src = next;
};

export default setEmoteFromUrl;
