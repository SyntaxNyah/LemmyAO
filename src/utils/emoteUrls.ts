import { IMAGE_EXTENSIONS, fileNameExtension } from "./assetName";

/**
 * The sprite URL spellings AO agents probe for one emote, in priority order.
 *
 * The conventions, all reachable from a single character folder:
 *
 *   - `(a)<name>.<ext>` / `(b)<name>.<ext>` — idle/talking frames as prefixed
 *     filenames (the usual AO2 layout);
 *   - `(a)/<name>.<ext>` — the same frames nested in an `(a)`/`(b)` folder,
 *     which some packs use instead;
 *   - `<name>.<ext>` — the bare spelling (AO2's own `CharLayer::load_image`
 *     probes it last, and packs that keep art in an `images/` folder rely on
 *     it: `images/11.1-Presenting-Gun.webp`).
 *
 * A name that already carries a real extension (char.ini block format) is a
 * literal filename with no deductions: one candidate, or none at all when the
 * extension isn't an image (e.g. a 3D `.vmd`). Only a *real* extension counts —
 * legacy stems carry dots of their own ("images/11.1-Presenting-Gun"), and
 * misreading those as filenames made the sprite resolve to nothing.
 *
 * @param AO_HOST asset origin, with its trailing slash
 * @param extensions the emote extension preference list (`extensions.json`)
 * @param charactername character folder name, already lowercased
 * @param emotename the emote's anim/preanim stem, already lowercased
 * @param prefix "(a)" (idle), "(b)" (talking), or "" for preanimated frames
 */
export function buildEmoteUrls(
  AO_HOST: string,
  extensions: string[],
  charactername: string,
  emotename: string,
  prefix: string,
): string[] {
  const characterFolder = `${AO_HOST}characters/`;
  const base = `${characterFolder}${encodeURI(charactername)}/`;

  const explicit = fileNameExtension(emotename);
  if (explicit) {
    return IMAGE_EXTENSIONS.includes(explicit)
      ? [`${base}${encodeURI(prefix)}${encodeURI(emotename)}`]
      : [];
  }

  const urls: string[] = [];
  for (const extension of extensions) {
    let url: string;
    if (extension === ".png") {
      url = `${base}${encodeURI(emotename)}${extension}`;
    } else if (extension === ".webp.static") {
      url = `${base}${encodeURI(emotename)}.webp`;
    } else {
      url = `${base}${encodeURI(prefix)}${encodeURI(emotename)}${extension}`;
    }
    urls.push(url);
    // Some character packs nest idle/talking frames in a "(a)"/"(b)" folder
    // instead of prefixing the filename. Try that layout too.
    if (prefix && extension !== ".png" && extension !== ".webp.static") {
      urls.push(`${base}${encodeURI(prefix)}/${encodeURI(emotename)}${extension}`);
    }
  }

  return urls;
}
