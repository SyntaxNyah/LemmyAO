/* eslint @typescript-eslint/no-unsafe-function-type: "off" */
import type { MusicChannels } from "../utils/createMusic";

export interface Viewport {
  getTextNow: Function;
  setTextNow: Function;
  getChatmsg: Function;
  setChatmsg: Function;
  getAnimating: Function;
  setAnimating: Function;
  getLastEvidence: Function;
  setLastEvidence: Function;
  setLastCharacter: Function;
  getLastCharacter: Function;
  setTestimonyTimer: Function;
  getTestimonyTimer: Function;
  setTestimonyUpdater: Function;
  getTestimonyUpdater: Function;
  getTheme: Function;
  setTheme: Function;
  testimonyAudio: HTMLAudioElement;
  set_side: Function;
  updateTestimony: Function;
  disposeTestimony: Function;
  getSfxAudio: Function;
  getBackgroundFolder: Function;
  music: MusicChannels;
  setBackgroundName: Function;
  getBackgroundName: Function;
}
