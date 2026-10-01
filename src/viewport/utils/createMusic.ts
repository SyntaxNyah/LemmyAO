import { opusCheck } from "../../dom/opusCheck";
import { MusicChannel } from "aolib-ts";

export type MusicChannels = Record<MusicChannel, HTMLAudioElement>;

/**
 * Maps each AO music channel (music, ambience) to a DOM <audio> element, in
 * channel order. Keying by name lets the MC/RMC handlers address a channel by
 * its aolib MusicChannel value directly instead of a positional index.
 */
export function createMusic(): MusicChannels {
  const audioChannels = [
    ...document.getElementsByClassName("audioChannel"),
  ] as HTMLAudioElement[];
  const channels = {} as MusicChannels;
  Object.values(MusicChannel).forEach((name, i) => {
    const channel = audioChannels[i];
    channel.volume = 0.5;
    // Wrap, don't call: `onerror = opusCheck(channel)` ran the check at
    // wire-up time (against a channel with no src yet) and left onerror
    // undefined, so the music channels had no error handler at all.
    channel.onerror = () => opusCheck(channel);
    channels[name] = channel;
  });
  return channels;
}
