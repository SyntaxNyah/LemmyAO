import { opusCheck } from "../../dom/opusCheck";

export function createMusic() {
  const audioChannels = document.getElementsByClassName(
    "audioChannel",
  ) as HTMLCollectionOf<HTMLAudioElement>;
  const music = [...audioChannels];
  music.forEach((channel: HTMLAudioElement) => {
    channel.volume = 0.5;
    // Wrap, don't call: `onerror = opusCheck(channel)` ran the check at
    // wire-up time (against a channel with no src yet) and left onerror
    // undefined, so the music channels had no error handler at all.
    channel.onerror = () => opusCheck(channel);
  });
  return music;
}
