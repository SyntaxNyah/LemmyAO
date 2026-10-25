/** Extensions LemmyAO can render as a sprite (a literal filename's ext). */
export const IMAGE_EXTENSIONS = [".gif", ".webp", ".apng", ".png"];

// A real extension is a short, letter-led alphanumeric run after the last dot
// of the last path segment: "normal.png", "idle.webp", "motion.vmd". Legacy
// AO2 char.ini stems routinely carry dots that are NOT extensions
// ("images/11.1-Presenting-Gun", "1.5-normal") — reading those as filenames
// blanks the sprite instead of probing the extension ladder.
const EXTENSION_LIKE = /\.([a-z][a-z0-9]{0,4})$/i;

/**
 * The lowercased trailing extension of a name or URL (".png"), or null when
 * it has none — i.e. when the value is a legacy emote stem that the caller
 * must expand through the `(a)X` / `(a)/X` / bare-`X` extension ladder.
 *
 * @param name an emote name ("images/11.1-Presenting-Gun") or a URL to probe
 * @returns the extension with its leading dot, or null for a bare stem
 */
export function fileNameExtension(name: string): string | null {
  const match = EXTENSION_LIKE.exec(name);
  return match ? `.${match[1].toLowerCase()}` : null;
}
