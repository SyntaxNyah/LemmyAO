import Client from "../client";
import { Side } from "aolib-ts";
import transparentPng from "../constants/transparentPng";
import filesExist from "../utils/filesExist";
import { buildEmoteUrls } from "../utils/emoteUrls";

const isFullView = (s: Side): boolean =>
  s === Side.def || s === Side.pro || s === Side.wit;

/**
 * Sets all the img tags to the right sources
 * @param {*} chatmsg
 */

const setEmote = async (
  AO_HOST: string,
  client: Client,
  charactername: string,
  emotename: string,
  prefix: string,
  pair: boolean,
  side: Side,
) => {
  const pairID = pair ? "pair" : "char";
  const position = isFullView(side) ? `${side}_` : "";
  const emoteSelector = document.getElementById(
    `client_${position}${pairID}_img`,
  ) as HTMLImageElement;

  // Hides all sprites before creating a new sprite
  if (
    client.viewport.getLastCharacter() !== client.viewport.getChatmsg().name
  ) {
    emoteSelector.src = transparentPng;
  }

  // Same spellings the preloader probes (see utils/emoteUrls): prefixed
  // filename, nested (a)/(b) folder, then bare. No candidate means there is
  // no sprite to show (a 3D `.vmd` animation), so fall back to transparent.
  const urls = buildEmoteUrls(
    AO_HOST,
    client.emote_extensions,
    charactername,
    emotename,
    prefix,
  );
  emoteSelector.src = (await filesExist(urls)) ?? transparentPng;
};
export default setEmote;
