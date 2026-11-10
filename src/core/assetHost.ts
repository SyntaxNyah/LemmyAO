import { state } from "./state";

const isPlaceholder = (host: string) =>
  !host || host.length < 5 || host.includes("//attorneyoffline.de/");

/**
 * Applies a server-advertised asset host. An explicit `?asset=` wins over the
 * server's; only the default (or an empty) host gets replaced. On an https page
 * an http host is upgraded, since the browser would block it as mixed content.
 */
export function setAssetHost(url: string, pageProtocol = globalThis.location?.protocol) {
  if (pageProtocol === "https:" && url.startsWith("http:")) {
    url = url.replace("http:", "https:");
  }
  if (isPlaceholder(state.server.assetHost)) state.server.assetHost = url;
  return state.server.assetHost;
}
