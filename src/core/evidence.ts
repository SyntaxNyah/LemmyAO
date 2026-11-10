import { reactive } from "@vue/reactivity";
import vanillaEvidence from "../constants/evidence";
import { state } from "./state";
import { on } from "./events";

type Fetch = (url: string) => Promise<Response>;

/** URL of an evidence image on the asset host. */
export const evidenceUrl = (image: string) =>
  `${state.server.assetHost}evidence/${encodeURI(image.toLowerCase())}`;

/** Image files known to the asset host, for picking one when adding evidence. */
export const evidenceImages = reactive({ names: [...vanillaEvidence] as string[] });

/** Merges the host's evidence.json (if any) with the vanilla list. */
export async function loadEvidenceImages(fetchFn: Fetch = fetch) {
  const host = state.server.assetHost;
  const names = new Set<string>(vanillaEvidence);
  try {
    const res = await fetchFn(`${host}evidence.json`);
    if (res.ok) {
      const list: unknown = await res.json();
      if (Array.isArray(list)) list.forEach((n) => typeof n === "string" && n && names.add(n));
    }
  } catch {
    /* evidence.json is optional */
  }
  if (host === state.server.assetHost) evidenceImages.names = [...names].sort((a, b) => a.localeCompare(b));
}

on("joined", () => {
  loadEvidenceImages();
});
