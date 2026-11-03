// Resolves a model's declared texture paths to the files the asset host serves.
//
// A pack may be re-encoded in place (PNG -> WebP) while its PMX still names the
// old files, which 404s every texture. Once per model we read the PMX texture
// table and probe for a `.webp` sibling of each entry, then hand the loader the
// sibling where one exists.
//
// The lookup is synchronous by design: babylon-mmd builds every material and
// then closes the model's texture-load batch, so awaiting a probe inside the
// material builder would race that bookkeeping (see mmdController).

import { parsePmxTexturePaths } from "./pmxTextures";

/** Raster formats a PMX may name and we can look for a WebP sibling of. */
const RASTER_EXTENSION = /\.(?:png|apng|jpe?g|bmp|gif)$/i;

/** A HEAD probe against a slow host must not hold up the model forever. */
const PROBE_TIMEOUT_MS = 4000;

/**
 * A ceiling for the whole model: past this the loader proceeds with the paths
 * the PMX declared, keeping whatever siblings were already confirmed. A stalled
 * host must never hold a character off screen.
 */
const PREPARE_BUDGET_MS = 2500;

/**
 * Normalizes a PMX texture path the way babylon-mmd's `PathNormalize` does
 * (backslashes to slashes, `.` dropped, `..` resolved) so the URLs recorded
 * here match the ones the loader later asks for.
 */
export function normalizeTexturePath(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  const normalized: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(part);
  }
  return normalized.join("/");
}

/** Joins a model folder and a texture path the way babylon-mmd does. */
function textureUrl(folder: string, path: string): string {
  return normalizeTexturePath(folder + path);
}

/**
 * The `.webp` sibling of a PMX texture path, or null when there is nothing to
 * probe: already WebP, not a raster image, root-relative, or a full URL.
 */
export function webpSibling(path: string): string | null {
  const normalized = normalizeTexturePath(path);
  // Root-relative and absolute paths are not under the model folder.
  if (normalized.startsWith("/") || /^[a-z][a-z0-9+.-]*:/i.test(normalized)) return null;
  const match = RASTER_EXTENSION.exec(normalized);
  if (!match) return null;
  return `${normalized.slice(0, match.index)}.webp`;
}

/** The I/O the resolver needs, injectable so tests don't touch the network. */
export interface TextureOverrideIO {
  /** Reads a model's bytes, or null when the model isn't available. */
  fetchBytes(url: string): Promise<ArrayBuffer | null>;
  /** Whether a texture URL exists (a HEAD request in production). */
  exists(url: string): Promise<boolean>;
}

const defaultTextureOverrideIO: TextureOverrideIO = {
  async fetchBytes(url) {
    const response = await fetch(url);
    return response.ok ? response.arrayBuffer() : null;
  },
  async exists(url) {
    const response = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    // Some hosts answer every path with a 200 index page. Only reject obvious
    // non-images (text/*) rather than requiring image/*, since not every host
    // maps .webp to a content type.
    const contentType = response.headers.get("content-type") ?? "";
    return !contentType.startsWith("text/");
  },
};

/** The production I/O, exported so the probe policy can be unit-tested. */
export { defaultTextureOverrideIO };

/**
 * Remembers which of a model's declared textures have a WebP sibling on the
 * host. One instance serves every model the viewport loads; entries are keyed
 * by full URL, so characters can't collide, and a model is only read once.
 */
export class TextureOverrideResolver {
  private readonly io: TextureOverrideIO;
  private readonly budgetMs: number;
  /** Declared absolute URL -> the relative WebP path to load instead. */
  private readonly overrides = new Map<string, string>();
  private readonly prepared = new Map<string, Promise<void>>();
  private readonly probed = new Map<string, Promise<boolean>>();

  constructor(io: TextureOverrideIO = defaultTextureOverrideIO, budgetMs = PREPARE_BUDGET_MS) {
    this.io = io;
    this.budgetMs = budgetMs;
  }

  /**
   * Probes the WebP siblings of a model's textures and remembers the ones that
   * exist. Cached per model URL, bounded by the probe budget, and never
   * rejecting: a model that can't be read, parsed, or probed in time simply
   * keeps its declared texture paths.
   */
  prepare(modelUrl: string, folder: string): Promise<void> {
    const cached = this.prepared.get(modelUrl);
    if (cached) return cached;
    const task = this.loadOverrides(modelUrl, folder).catch(() => {
      /* not fatal: the loader falls back to the declared paths */
    });
    this.prepared.set(modelUrl, task);
    return task;
  }

  /**
   * The path to load for a texture: its WebP sibling when the host has one,
   * otherwise the path the model declared.
   */
  resolve(rootUrl: string, path: string): string {
    return this.overrides.get(textureUrl(rootUrl, path)) ?? path;
  }

  private async loadOverrides(modelUrl: string, folder: string): Promise<void> {
    const buffer = await this.io.fetchBytes(modelUrl);
    if (!buffer) return;
    const paths = parsePmxTexturePaths(buffer);
    if (!paths) return;

    const probes = Promise.all(
      paths.map(async (path) => {
        const webp = webpSibling(path);
        if (!webp) return;
        if (!(await this.probe(textureUrl(folder, webp)))) return;
        this.overrides.set(textureUrl(folder, path), webp);
      }),
    );

    // Race the probes against the budget. Anything confirmed by the deadline is
    // applied; the rest keeps its declared path, exactly as a failed probe would.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, this.budgetMs);
    });
    try {
      await Promise.race([probes, deadline]);
    } finally {
      clearTimeout(timer);
    }
  }

  /** One HEAD per candidate URL, shared by every model that references it. */
  private probe(url: string): Promise<boolean> {
    const cached = this.probed.get(url);
    if (cached) return cached;
    // A failed probe (offline, blocked HEAD, timeout) means "no sibling".
    const result = this.io.exists(url).catch(() => false);
    this.probed.set(url, result);
    return result;
  }
}

/** Shared with the viewport's material builder. */
export const textureOverrides = new TextureOverrideResolver();
