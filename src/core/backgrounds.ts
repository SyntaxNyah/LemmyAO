import { reactive } from "@vue/reactivity";
import vanillaBackgrounds from "../constants/backgrounds";
import { parseBackgroundFolderListing } from "../utils/parseBackgroundFolderListing";
import { state } from "./state";
import { on } from "./events";

type Fetch = (url: string) => Promise<Response>;

export const backgrounds = reactive({
  names: [] as string[],
  loading: false,
});

async function text(fetchFn: Fetch, url: string) {
  const res = await fetchFn(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.text();
}

/**
 * Collects background names from the asset host's backgrounds.json, its
 * background/ folder listing (when the web server shows one) and the bundled
 * vanilla list. Either remote source may be missing.
 */
export async function loadBackgrounds(fetchFn: Fetch = fetch) {
  const host = state.server.assetHost;
  backgrounds.loading = true;
  const [list, listing] = await Promise.allSettled([
    text(fetchFn, `${host}backgrounds.json`).then((t) => JSON.parse(t) as unknown),
    text(fetchFn, `${host}background/`).then(parseBackgroundFolderListing),
  ]);
  const found = new Map<string, string>();
  const add = (name: unknown) => {
    if (typeof name === "string" && name.trim()) found.set(name.toLowerCase(), found.get(name.toLowerCase()) ?? name);
  };
  if (list.status === "fulfilled" && Array.isArray(list.value)) list.value.forEach(add);
  if (listing.status === "fulfilled") listing.value.forEach(add);
  vanillaBackgrounds.forEach(add);
  if (host !== state.server.assetHost) return;
  backgrounds.names = [...found.values()].sort((a, b) => a.localeCompare(b));
  backgrounds.loading = false;
}

/** Names containing `query`, those starting with it first. */
export function searchBackgrounds(names: readonly string[], query: string, limit = 50) {
  const q = query.trim().toLowerCase();
  if (!q) return names.slice(0, limit);
  const starts: string[] = [];
  const contains: string[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    if (lower.startsWith(q)) starts.push(name);
    else if (lower.includes(q)) contains.push(name);
  }
  return [...starts, ...contains].slice(0, limit);
}

on("joined", () => {
  loadBackgrounds();
});
