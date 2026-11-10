import { client } from "../client";
import { AO_HOST } from "../client/aoHost";
import { on } from "../core/events";
import { playICMessage } from "../viewport/utils/handleICSpeaking";
import { showBackground } from "../viewport/utils/setSide";
import { playMusicTrack, seekMusic } from "../viewport/utils/playMusic";
import { showTestimony } from "../viewport/utils/initTestimonyUpdater";
import { STAGE_HTML } from "./markup";
import { followSettings } from "./settings";

let mounted = false;

function playModcallSound() {
  const sfx = client.viewport.getSfxAudio();
  sfx.pause();
  const volume = sfx.volume;
  sfx.volume = 1;
  sfx.src = `${AO_HOST}sounds/general/sfx-gallery.opus`;
  sfx.play().catch(() => {});
  sfx.volume = volume;
}

/**
 * Renders the courtroom into `host` and plays what the core announces:
 * IC messages, background, music, judge animations and modcall sounds.
 * There is one stage per page; its markup uses fixed ids.
 */
export function mountStage(host: HTMLElement) {
  if (mounted) throw new Error("the stage is already mounted");
  mounted = true;
  host.innerHTML = STAGE_HTML;
  followSettings();

  // The nameplate shows the sender's showname when they set one.
  const nameplates = document.getElementById("nameplate_setting") as HTMLLinkElement | null;
  if (nameplates) nameplates.href = "styles/shownames.css";

  on("icMessage", playICMessage);
  on("background", showBackground);
  on("music", playMusicTrack);
  on("musicSeek", seekMusic);
  on("testimony", showTestimony);
  on("modcall", playModcallSound);
  on("callword", playModcallSound);
}
