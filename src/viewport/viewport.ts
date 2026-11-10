/* eslint indent: ["error", 2, { "SwitchCase": 1 }] */

import { client } from "../client";
import { UPDATE_INTERVAL } from "../client";
import { AO_HOST } from "../client/aoHost";
import { Viewport } from "./interfaces/Viewport";
import { defaultChatMsg } from "./constants/defaultChatMsg";
import { createMusic } from "./utils/createMusic";
import { createSfxAudio } from "./utils/createSfxAudio";
import { createTestimonyAudio } from "./utils/createTestimonyAudio";
import { Testimony } from "./interfaces/Testimony";
import { set_side } from "./utils/setSide";
import { ChatMsg } from "./interfaces/ChatMsg";

const viewport = (): Viewport => {
  let animating = false;
  let chatmsg = defaultChatMsg;
  let lastChar = "";
  let lastEvi = 0;
  const music = createMusic();
  // The modcall sound; message sounds go through ./audio.
  const sfxAudio = createSfxAudio();
  const testimonyAudio = createTestimonyAudio();
  let testimonyTimer = 0;
  let testimonyUpdater: ReturnType<typeof setTimeout> | undefined;
  let textnow = "";
  let theme: string;
  let backgroundName = "";
  const getSfxAudio = () => sfxAudio;
  const getBackgroundName = () => backgroundName;
  const setBackgroundName = (value: string) => {
    backgroundName = value;
  };
  const getBackgroundFolder = () =>
    `${AO_HOST}background/${encodeURI(backgroundName.toLowerCase())}/`;
  const getTextNow = () => textnow;
  const setTextNow = (val: string) => {
    textnow = val;
  };
  const getChatmsg = () => chatmsg;
  const setChatmsg = (val: ChatMsg) => {
    chatmsg = val;
  };
  const getAnimating = () => animating;
  const setAnimating = (val: boolean) => {
    animating = val;
  };
  const getLastEvidence = () => lastEvi;
  const setLastEvidence = (val: number) => {
    lastEvi = val;
  };
  const setLastCharacter = (val: string) => {
    lastChar = val;
  };
  const getLastCharacter = () => lastChar;
  const getTheme = () => theme;
  const setTheme = (val: string) => {
    theme = val;
  };
  const getTestimonyTimer = () => testimonyTimer;
  const setTestimonyTimer = (val: number) => {
    testimonyTimer = val;
  };
  const setTestimonyUpdater = (val: ReturnType<typeof setTimeout>) => {
    testimonyUpdater = val;
  };
  const getTestimonyUpdater = () => testimonyUpdater;
  /** Advances the testimony overlay until its animation is over. */
  const updateTestimony = () => {
    const testimonyFilenames: Testimony = {
      1: "witnesstestimony",
      2: "crossexamination",
      3: "notguilty",
      4: "guilty",
    };
    testimonyTimer += UPDATE_INTERVAL;
    const testimony = testimonyFilenames[client.testimonyID];
    const resource = client.resources[testimony];
    if (!resource || testimonyTimer >= resource.duration) {
      disposeTestimony();
    } else {
      testimonyUpdater = setTimeout(() => updateTestimony(), UPDATE_INTERVAL);
    }
  };
  const disposeTestimony = () => {
    client.testimonyID = 0;
    testimonyTimer = 0;
    document.getElementById("client_testimony")!.style.opacity = "0";
    clearTimeout(testimonyUpdater);
  };

  return {
    getTextNow,
    setTextNow,
    getChatmsg,
    setChatmsg,
    setAnimating,
    getAnimating,
    getLastEvidence,
    setLastEvidence,
    setLastCharacter,
    getLastCharacter,
    setTheme,
    getTheme,
    setTestimonyTimer,
    getTestimonyTimer,
    setTestimonyUpdater,
    getTestimonyUpdater,
    testimonyAudio,
    set_side,
    setBackgroundName,
    updateTestimony,
    disposeTestimony,
    getBackgroundFolder,
    getBackgroundName,
    getSfxAudio,
    music,
  };
};

export default viewport;
