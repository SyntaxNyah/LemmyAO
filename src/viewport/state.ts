import { AO_HOST } from "../client/aoHost";
import { defaultChatMsg } from "./constants/defaultChatMsg";
import type { ChatMsg } from "./interfaces/ChatMsg";

/** What the viewport is showing; there is one viewport per page. */
export const viewportState = {
  chatmsg: defaultChatMsg as ChatMsg,
  /** The message text revealed so far. */
  textNow: "",
  animating: false,
  lastCharacter: "",
  lastEvidence: 0,
  backgroundName: "",
};

export const backgroundFolder = () => `${AO_HOST}background/${encodeURI(viewportState.backgroundName.toLowerCase())}/`;
