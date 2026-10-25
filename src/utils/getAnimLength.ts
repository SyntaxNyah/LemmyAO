import calculatorHandler from "./calculatorHandler";
import fileExists from "./fileExists";
import { fileNameExtension } from "./assetName";
import { requestBuffer } from "../services/request";

const DEFAULT_EXTENSIONS = [".gif", ".webp", ".apng"];

/**
 * Gets animation length. If the animation cannot be found, it will
 * silently fail and return 0 instead.
 *
 * Checks all extension candidates in parallel (like filesExist does for
 * idle/talking sprites) instead of one HEAD request at a time, and picks
 * the first match by `extensions` priority order rather than hardcoding
 * .gif first -- a character pack that's entirely .webp would otherwise
 * always eat a guaranteed 404 (and the round-trip latency of it) before
 * ever trying the extension it actually uses.
 */
const getAnimLength = async (
  url: string,
  extensions: string[] = DEFAULT_EXTENSIONS,
): Promise<number> => {
  // If the url already carries an extension (char.ini block format), use it
  // verbatim instead of probing. Only measurable image types have a handler; a
  // non-image extension (e.g. a 3D `.vmd`) yields 0. A legacy stem with a dot
  // in it ("…/11.1-presenting-gun") carries no extension, so it probes below.
  const explicit = fileNameExtension(url);
  if (explicit) {
    if (!calculatorHandler[explicit] || !(await fileExists(url))) return 0;
    return calculatorHandler[explicit](await requestBuffer(url));
  }

  const exists = await Promise.all(
    extensions.map((extension) => fileExists(url + extension)),
  );
  const index = exists.findIndex(Boolean);
  if (index === -1) return 0;
  const extension = extensions[index];
  const fileBuffer = await requestBuffer(url + extension);
  return calculatorHandler[extension](fileBuffer);
};
export default getAnimLength;
