/**
 * Triggered when there was an error loading a sound. Retries the sound as
 * `.opus`, which is the format our CDN is guaranteed to carry.
 *
 * Two things make this handler easy to get wrong, and both used to bite:
 *
 * 1. Setting `src` *always* re-invokes the media element load algorithm,
 *    even when the value is unchanged. A rewrite that produces the same
 *    URL therefore fires `error` again, re-enters this handler, and loops
 *    as fast as the browser can fail -- pinning a core and filling the
 *    console. So we only assign when the URL actually changed.
 * 2. `channel.src` reflects the *resolved* URL, so an empty or absent
 *    `src` attribute reads back as the document URL, never as "". The
 *    empty case has to be checked on the attribute; checking the property
 *    silently lets the client page itself through as a sound to load.
 *
 * dom/imgError.ts guards the same class of loop for sprites.
 */
const OPUS_FALLBACK = /\.(?:mp3|wav)(?=$|[?#])/i;

export function opusCheck(channel: HTMLAudioElement): void {
  // No sound was ever requested (or a caller cleared it with src="").
  // Drop the attribute so the browser stops trying to load the document
  // itself as media; removing it does not re-invoke the load algorithm.
  if (!channel.getAttribute("src")) {
    channel.removeAttribute("src");
    return;
  }

  const oldsrc = channel.src;
  console.warn(`failed to load sound ${oldsrc}`);

  const newsrc = oldsrc.replace(OPUS_FALLBACK, ".opus");
  if (newsrc === oldsrc) {
    // Nothing left to try -- retrying the same URL would loop forever.
    return;
  }
  channel.src = newsrc;
}
