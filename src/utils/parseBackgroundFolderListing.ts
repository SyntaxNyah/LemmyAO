/**
 * Parse a directory listing (Apache/nginx autoindex-style HTML) of the
 * asset host's `background/` folder into a list of background names, one
 * per subfolder. Only links that look like a subfolder (href ending in
 * "/") are kept; the parent-directory link, sort-order query links, and
 * plain file links are skipped.
 */
export function parseBackgroundFolderListing(html: string): string[] {
  const names = new Set<string>();
  const hrefPattern = /<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi;

  let match: RegExpExecArray | null;
  while ((match = hrefPattern.exec(html)) !== null) {
    const href = match[1];
    if (!href || href.startsWith("?") || href.startsWith("#")) continue;
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) continue; // absolute URL (http:, mailto:, etc.)
    if (href.startsWith("/")) continue; // root-relative, not a subfolder here
    if (!href.endsWith("/")) continue; // only folders

    let name = href.slice(0, -1);
    try {
      name = decodeURIComponent(name);
    } catch {
      // malformed percent-encoding: keep as-is
    }
    if (name === "" || name === "." || name === "..") continue;

    names.add(name);
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}
