const cache = new Map<string, Promise<boolean>>();

/**
 * Checks whether an image URL points to a loadable image, without relying on
 * CORS. Uses an `<img>` element instead of XHR/fetch, because a plain `<img>`
 * load is a "no-cors" request: it works against cross-origin CDNs that do not
 * send an `Access-Control-Allow-Origin` header (which would otherwise block
 * XHR/fetch and make every asset appear to be missing).
 *
 * Results are cached per-URL for the lifetime of the session.
 *
 * Note: this probes image resources only. Audio URLs have their own no-cors
 * probe in `audioExists.ts`.
 */
export default function fileExists(url: string): Promise<boolean> {
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  const promise = new Promise<boolean>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });

  cache.set(url, promise);
  return promise;
}
