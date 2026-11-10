import queryParser from "../utils/queryParser";
import { state } from "../core/state";
import { setAssetHost } from "../core/assetHost";

const { asset } = queryParser();
export let AO_HOST = asset;
state.server.assetHost = asset;
export function setAOhost(val: string): string {
  AO_HOST = setAssetHost(val);
  console.debug("Asset URL is now " + AO_HOST);
  return AO_HOST;
}

import type * as aolib from "aolib-ts";

/** ASS: the core already applied the new asset host; sync the legacy copy. */
export function applyAssetOrigin(_packet: aolib.packets.ASS) {
  AO_HOST = state.server.assetHost;
}
