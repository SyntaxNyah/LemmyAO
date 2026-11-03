import { afterEach, describe, it, expect } from "bun:test";
import {
  defaultTextureOverrideIO,
  normalizeTexturePath,
  TextureOverrideResolver,
  webpSibling,
} from "../viewport/mmd/textureOverrides";
import { buildPmx } from "./pmxFixture";

const MODEL_URL = "https://host.test/base/characters/fenomeno3d/model.pmx";
const FOLDER = "https://host.test/base/characters/fenomeno3d/";

function resolverWith(pmx: Uint8Array<ArrayBuffer>, existing: (url: string) => boolean) {
  const probed: string[] = [];
  const resolver = new TextureOverrideResolver({
    fetchBytes: async () => pmx.buffer,
    exists: async (url) => {
      probed.push(url);
      return existing(url);
    },
  });
  return { resolver, probed };
}

describe("normalizeTexturePath", () => {
  it("resolves separators, . and .. like babylon-mmd", () => {
    expect(normalizeTexturePath("Texture2D\\tex.png")).toBe("Texture2D/tex.png");
    expect(normalizeTexturePath("./Texture2D/../tex.png")).toBe("tex.png");
    // The double slash after the scheme must survive.
    expect(normalizeTexturePath("https://host.test/a//tex.png")).toBe(
      "https://host.test/a//tex.png",
    );
  });
});

describe("webpSibling", () => {
  it("swaps a raster extension for .webp", () => {
    expect(webpSibling("Texture2D/tex_bdy1127_00_diff.png")).toBe(
      "Texture2D/tex_bdy1127_00_diff.webp",
    );
    expect(webpSibling("tex.PNG")).toBe("tex.webp");
    expect(webpSibling("tex.bmp")).toBe("tex.webp");
    expect(webpSibling("tex.jpeg")).toBe("tex.webp");
    expect(webpSibling("tex.apng")).toBe("tex.webp");
  });

  it("normalizes Windows separators", () => {
    expect(webpSibling("Texture2D\\tex.png")).toBe("Texture2D/tex.webp");
  });

  it("has nothing to probe for webp or non-raster names", () => {
    expect(webpSibling("tex.webp")).toBeNull();
    expect(webpSibling("tex.tga")).toBeNull();
    expect(webpSibling("tex")).toBeNull();
  });

  it("leaves absolute and root-relative paths alone", () => {
    expect(webpSibling("https://cdn.test/tex.png")).toBeNull();
    expect(webpSibling("//cdn.test/tex.png")).toBeNull();
    expect(webpSibling("/base/tex.png")).toBeNull();
  });
});

describe("TextureOverrideResolver", () => {
  it("uses the webp sibling when the host serves one", async () => {
    const pmx = buildPmx(["Texture2D/a.png", "Texture2D/gone.png", "already.webp"]);
    const { resolver, probed } = resolverWith(pmx, (url) => url.endsWith("/Texture2D/a.webp"));

    await resolver.prepare(MODEL_URL, FOLDER);

    expect(resolver.resolve(FOLDER, "Texture2D/a.png")).toBe("Texture2D/a.webp");
    expect(resolver.resolve(FOLDER, "Texture2D/gone.png")).toBe("Texture2D/gone.png");
    expect(resolver.resolve(FOLDER, "already.webp")).toBe("already.webp");
    expect(probed).toEqual([`${FOLDER}Texture2D/a.webp`, `${FOLDER}Texture2D/gone.webp`]);
  });

  it("matches a texture path however the PMX spells it", async () => {
    const { resolver } = resolverWith(buildPmx(["Texture2D/a.png"]), () => true);
    await resolver.prepare(MODEL_URL, FOLDER);

    expect(resolver.resolve(FOLDER, "./Texture2D/../Texture2D/a.png")).toBe("Texture2D/a.webp");
    expect(resolver.resolve(FOLDER, "Texture2D\\a.png")).toBe("Texture2D/a.webp");
  });

  it("reads and probes a model only once", async () => {
    let fetches = 0;
    let probes = 0;
    const resolver = new TextureOverrideResolver({
      fetchBytes: async () => {
        fetches++;
        return buildPmx(["a.png", "a.png"]).buffer;
      },
      exists: async () => {
        probes++;
        return true;
      },
    });

    await Promise.all([
      resolver.prepare(MODEL_URL, FOLDER),
      resolver.prepare(MODEL_URL, FOLDER),
    ]);
    await resolver.prepare(MODEL_URL, FOLDER);

    expect(fetches).toBe(1);
    expect(probes).toBe(1); // one probe for the duplicated texture
  });

  it("keeps the declared paths when the model can't be fetched", async () => {
    const resolver = new TextureOverrideResolver({
      fetchBytes: async () => {
        throw new Error("offline");
      },
      exists: async () => true,
    });

    await resolver.prepare(MODEL_URL, FOLDER);

    expect(resolver.resolve(FOLDER, "a.png")).toBe("a.png");
  });

  it("keeps the declared paths when the model isn't a PMX", async () => {
    const resolver = new TextureOverrideResolver({
      fetchBytes: async () => new TextEncoder().encode("not a pmx").buffer,
      exists: async () => true,
    });

    await resolver.prepare(MODEL_URL, FOLDER);

    expect(resolver.resolve(FOLDER, "a.png")).toBe("a.png");
  });

  it("keeps the declared path when its webp probe fails", async () => {
    const resolver = new TextureOverrideResolver({
      fetchBytes: async () => buildPmx(["a.png"]).buffer,
      exists: async () => {
        throw new Error("HEAD blocked");
      },
    });

    await resolver.prepare(MODEL_URL, FOLDER);

    expect(resolver.resolve(FOLDER, "a.png")).toBe("a.png");
  });

  it("stops waiting once a stalled probe blows the budget", async () => {
    const resolver = new TextureOverrideResolver(
      {
        fetchBytes: async () => buildPmx(["fast.png", "stalled.png"]).buffer,
        exists: (url) =>
          url.endsWith("/fast.webp") ? Promise.resolve(true) : new Promise<boolean>(() => {}),
      },
      10,
    );

    // Without the budget this never resolves, and the timeout fails the test.
    await resolver.prepare(MODEL_URL, FOLDER);

    expect(resolver.resolve(FOLDER, "fast.png")).toBe("fast.webp");
    expect(resolver.resolve(FOLDER, "stalled.png")).toBe("stalled.png");
  });
});

describe("defaultTextureOverrideIO", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const stubFetch = (
    handler: (url: string, init?: RequestInit) => Promise<Response>,
  ): void => {
    globalThis.fetch = handler as unknown as typeof fetch;
  };

  it("probes with HEAD and accepts an image response", async () => {
    let method = "";
    stubFetch(async (_url, init) => {
      method = init?.method ?? "";
      return new Response(null, { status: 200, headers: { "content-type": "image/webp" } });
    });

    expect(await defaultTextureOverrideIO.exists("https://host.test/a.webp")).toBe(true);
    expect(method).toBe("HEAD");
  });

  it("rejects a 404", async () => {
    stubFetch(
      async () =>
        new Response("not found", { status: 404, headers: { "content-type": "text/html" } }),
    );

    expect(await defaultTextureOverrideIO.exists("https://host.test/a.webp")).toBe(false);
  });

  it("rejects a 200 index page from a catch-all host", async () => {
    stubFetch(
      async () =>
        new Response("<!doctype html>", { status: 200, headers: { "content-type": "text/html" } }),
    );

    expect(await defaultTextureOverrideIO.exists("https://host.test/a.webp")).toBe(false);
  });

  it("reads a model body only when the fetch succeeds", async () => {
    stubFetch(async () => new Response("PMX body", { status: 200 }));
    expect(await defaultTextureOverrideIO.fetchBytes("https://host.test/model.pmx")).toBeInstanceOf(
      ArrayBuffer,
    );

    stubFetch(async () => new Response("nope", { status: 404 }));
    expect(await defaultTextureOverrideIO.fetchBytes("https://host.test/model.pmx")).toBeNull();
  });
});
