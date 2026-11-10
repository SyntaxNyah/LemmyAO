import { RTAnimation } from "aolib-ts";
import { client } from "../client";
import { els } from "./elements";
import { loadSound, schedule, syncedStart } from "./audio";

const ANIMATIONS: Partial<Record<RTAnimation, string>> = {
  [RTAnimation.witness_testimony]: "witnesstestimony",
  [RTAnimation.cross_examination]: "crossexamination",
  [RTAnimation.not_guilty]: "notguilty",
  [RTAnimation.guilty]: "guilty",
};

let showing = 0;
let timer: ReturnType<typeof setTimeout> | undefined;

const hide = () => {
  clearTimeout(timer);
  els.testimony.style.opacity = "0";
};

const preloadImage = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
  });

/** Plays a judge animation (testimony, cross-examination, verdicts) with its sound; end_animation hides it. */
export async function showTestimony(animation: RTAnimation) {
  const id = ++showing;
  hide();
  const name = ANIMATIONS[animation];
  if (!name) {
    if (animation !== RTAnimation.end_animation) console.warn(`Unknown judge animation ${animation}`);
    return;
  }
  const { src, sfx, duration } = client.resources[name];
  const [sound] = await Promise.all([loadSound(sfx), preloadImage(src)]);
  const { audioStart, visualDelayMs } = await syncedStart();
  if (id !== showing) return;
  // Not a message sound: an IC message arriving meanwhile doesn't cut it off.
  if (sound && audioStart !== null) schedule(sound, audioStart, "sfx", false, false);
  timer = setTimeout(() => {
    els.testimony.src = src;
    els.testimony.style.opacity = "1";
    timer = setTimeout(hide, duration);
  }, visualDelayMs);
}
