const cache = new Map<string, Promise<boolean>>();

/**
 * Checks whether an audio URL points to a playable audio resource, without
 * relying on CORS. Uses an `<audio>` element instead of XHR/fetch for the same
 * reason as `fileExists.ts` uses `<img>`: media element loads are "no-cors"
 * requests, so they work against cross-origin CDNs that do not send an
 * `Access-Control-Allow-Origin` header.
 *
 * Results are cached per-URL for the lifetime of the session.
 */
export default function audioExists(url: string): Promise<boolean> {
  const cached = cache.get(url);
  if (cached !== undefined) return cached;

  const promise = new Promise<boolean>((resolve) => {
    const audio = new Audio();
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      // Release the resource and stop any in-flight download once settled.
      audio.removeAttribute("src");
      audio.load();
      resolve(value);
    };

    audio.preload = "auto";
    // `loadedmetadata` fires once the browser has parsed real audio headers,
    // which means the server returned playable media rather than a 404 page.
    audio.onloadedmetadata = () => finish(true);
    audio.onerror = () => finish(false);
    audio.src = url;
  });

  cache.set(url, promise);
  return promise;
}
