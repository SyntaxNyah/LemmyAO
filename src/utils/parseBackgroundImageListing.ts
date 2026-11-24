/**
 * Parse an Apache/nginx directory listing of one background folder into the
 * image filenames it contains. Parent links, subfolders, sort links and
 * non-image files are skipped.
 */
export function parseBackgroundImageListing(html: string): string[] {
  const names = new Set<string>();
  const hrefPattern = /<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi;
  const image = /\.(png|gif|webp|apng|jpe?g)$/i;

  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1];
    if (!href || href.startsWith("?") || href.startsWith("#")) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue; // absolute URL
    if (href.startsWith("/") || href.endsWith("/")) continue;

    let file = href;
    try {
      file = decodeURIComponent(file);
    } catch {
      // malformed percent-encoding: keep as-is
    }
    if (!image.test(file)) continue;
    names.add(file);
  }

  return [...names].sort((a, b) => a.localeCompare(b));
}