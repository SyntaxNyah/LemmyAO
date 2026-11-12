import { Side } from "aolib-ts";
import transparentPng from "../constants/transparentPng";

// Function rather than module-level array: enum members are accessed only
// at call time, avoiding "Side is undefined" during circular-import init.
const isFullView = (s: Side): boolean =>
  s === Side.def || s === Side.pro || s === Side.wit;

/**
 * Sets a pre-resolved emote URL on the correct DOM <img> element.
 * This is synchronous because the image should already be in the browser cache
 * from preloading.
 */
const setEmoteFromUrl = (url: string, pair: boolean, side: Side): void => {
  const pairID = pair ? "pair" : "char";
  const position = isFullView(side) ? `${side}_` : "";
  const emoteSelector = document.getElementById(
    `client_${position}${pairID}_img`,
  ) as HTMLImageElement;

  // Reassigning the same URL restarts an animation in Chrome, which would
  // desync a preanim from its timer.
  const next = url || transparentPng;
  if (emoteSelector && emoteSelector.src !== next) {
    emoteSelector.src = next;
  }
};

export default setEmoteFromUrl;
