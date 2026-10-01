import Client from "../client";
import { Side } from "aolib-ts";
import transparentPng from "../constants/transparentPng";
import fileExists from "../utils/fileExists";

const isFullView = (s: Side): boolean =>
  s === Side.def || s === Side.pro || s === Side.wit;

const IMAGE_EXTENSIONS = [".gif", ".webp", ".apng", ".png"];

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
  const characterFolder = `${AO_HOST}characters/`;
  const position = isFullView(side) ? `${side}_` : "";
  const emoteSelector = document.getElementById(
    `client_${position}${pairID}_img`,
  ) as HTMLImageElement;

  // A name with an extension (char.ini block format) is a literal filename:
  // never deduce. The path is fully determined (lowercase name, fixed (a)/(b)
  // prefix, given extension), so set it directly. A non-image extension
  // (e.g. a 3D `.vmd`) has no sprite.
  const dot = emotename.lastIndexOf(".");
  if (dot !== -1) {
    const ext = emotename.slice(dot).toLowerCase();
    emoteSelector.src = IMAGE_EXTENSIONS.includes(ext)
      ? `${characterFolder}${encodeURI(charactername)}/${encodeURI(prefix)}${encodeURI(emotename)}`
      : transparentPng;
    return;
  }

  for (const extension of client.emote_extensions) {
    // Hides all sprites before creating a new sprite

    if (
      client.viewport.getLastCharacter() !== client.viewport.getChatmsg().name
    ) {
      emoteSelector.src = transparentPng;
    }
    let url;
    if (extension === ".png") {
      url = `${characterFolder}${encodeURI(charactername)}/${encodeURI(
        emotename,
      )}${extension}`;
    } else if (extension === ".webp.static") {
      url = `${characterFolder}${encodeURI(charactername)}/${encodeURI(
        emotename,
      )}.webp`;
    } else {
      url = `${characterFolder}${encodeURI(charactername)}/${encodeURI(
        prefix,
      )}${encodeURI(emotename)}${extension}`;
    }
    const exists = await fileExists(url);
    if (exists) {
      emoteSelector.src = url;
      break;
    }
    // Some character packs nest idle/talking frames in a "(a)"/"(b)" folder
    // instead of prefixing the filename. Try that layout too.
    if (prefix && extension !== ".png" && extension !== ".webp.static") {
      const folderUrl = `${characterFolder}${encodeURI(charactername)}/${encodeURI(
        prefix,
      )}/${encodeURI(emotename)}${extension}`;
      const folderExists = await fileExists(folderUrl);
      if (folderExists) {
        emoteSelector.src = folderUrl;
        break;
      }
    }
  }
};
export default setEmote;
