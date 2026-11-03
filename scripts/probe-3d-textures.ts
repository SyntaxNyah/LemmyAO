#!/usr/bin/env bun
/**
 * Probes a PMX's texture table against its asset host and reports, per texture,
 * whether the client will load a WebP sibling or the declared file.
 *
 * Usage:
 *   bun scripts/probe-3d-textures.ts <model.pmx url>
 *
 * Example:
 *   bun scripts/probe-3d-textures.ts https://miku.pizza/base/characters/fenomeno3d/model.pmx
 *
 * Read-only. Exits 1 when the model can't be read, or when a declared texture
 * neither resolves to a WebP sibling nor exists under its declared name.
 */
import { parsePmxTexturePaths } from "../src/viewport/mmd/pmxTextures";
import {
  normalizeTexturePath,
  TextureOverrideResolver,
} from "../src/viewport/mmd/textureOverrides";

const modelUrl = process.argv[2];
if (!modelUrl) {
  console.error("usage: bun scripts/probe-3d-textures.ts <model.pmx url>");
  process.exit(2);
}

const folder = modelUrl.slice(0, modelUrl.lastIndexOf("/") + 1);
// Cloudflare rejects some non-browser agents; send a browser-like one.
const headers = { "User-Agent": "Mozilla/5.0 (compatible; LemmyAO texture probe)" };
const timeout = (): AbortSignal => AbortSignal.timeout(10_000);

const modelResponse = await fetch(modelUrl, { headers, signal: timeout() });
if (!modelResponse.ok) {
  console.error(`GET ${modelUrl} -> ${modelResponse.status}`);
  process.exit(1);
}
const modelBytes = await modelResponse.arrayBuffer();
const paths = parsePmxTexturePaths(modelBytes);
if (!paths) {
  console.error(`${modelUrl} is not a readable PMX`);
  process.exit(1);
}

const exists = async (url: string): Promise<boolean> => {
  const response = await fetch(url, { method: "HEAD", headers, signal: timeout() });
  return response.ok;
};

const resolver = new TextureOverrideResolver({
  fetchBytes: async () => modelBytes,
  exists,
});
await resolver.prepare(modelUrl, folder);

let missing = 0;
for (const path of paths) {
  const resolved = resolver.resolve(folder, path);
  if (resolved !== path) {
    console.log(`webp    ${path} -> ${resolved}`);
    continue;
  }
  // Unchanged: not a raster name, or the host kept the original file.
  const isReference = path.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(path);
  const ok = isReference || (await exists(normalizeTexturePath(folder + path)));
  console.log(`${ok ? "ok     " : "MISSING"} ${path}`);
  if (!ok) missing++;
}

const loadable = paths.length - missing;
console.log(`\n${paths.length} textures: ${loadable} loadable, ${missing} missing`);
process.exit(missing ? 1 : 0);
