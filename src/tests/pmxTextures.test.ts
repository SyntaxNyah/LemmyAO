import { describe, it, expect } from "bun:test";
import { parsePmxTexturePaths } from "../viewport/mmd/pmxTextures";
import { buildPmx } from "./pmxFixture";

// The live fenomeno3d pack names 23 `.png` textures in its PMX while the host
// only serves the `.webp` conversions, so reading this table byte-exactly is
// what makes the texture fallback possible. These pin the header/vertex walk
// (both text encodings, every weight layout) and the null-on-garbage contract.

describe("parsePmxTexturePaths", () => {
  it("reads a UTF-8 texture table", () => {
    const pmx = buildPmx(["Texture2D/tex_bdy1127_00_diff.png", "tex_b.png"]);
    expect(parsePmxTexturePaths(pmx.buffer)).toEqual([
      "Texture2D/tex_bdy1127_00_diff.png",
      "tex_b.png",
    ]);
  });

  it("reads a UTF-16LE texture table", () => {
    const pmx = buildPmx(["Texture2D/tex_a.png"], { encoding: 0 });
    expect(parsePmxTexturePaths(pmx.buffer)).toEqual(["Texture2D/tex_a.png"]);
  });

  it("returns an empty table for a PMX without textures", () => {
    expect(parsePmxTexturePaths(buildPmx([]).buffer)).toEqual([]);
  });

  it("sizes weights from the bone index width, not the vertex index width", () => {
    // A model can use wide vertex indices and narrow bone indices; reading the
    // weight block with the vertex width would desync the whole table.
    const pmx = buildPmx(["tex.png"], {
      vertexIndexSize: 4,
      boneIndexSize: 1,
      weightType: 1,
    });
    expect(parsePmxTexturePaths(pmx.buffer)).toEqual(["tex.png"]);
  });

  it("skips SDEF weight blocks", () => {
    const pmx = buildPmx(["tex.png"], { boneIndexSize: 2, weightType: 3 });
    expect(parsePmxTexturePaths(pmx.buffer)).toEqual(["tex.png"]);
  });

  it("skips QDEF weight blocks", () => {
    const pmx = buildPmx(["tex.png"], { boneIndexSize: 4, weightType: 4 });
    expect(parsePmxTexturePaths(pmx.buffer)).toEqual(["tex.png"]);
  });

  it("skips extra UV sets", () => {
    const pmx = buildPmx(["tex.png"], { extraUvCount: 3 });
    expect(parsePmxTexturePaths(pmx.buffer)).toEqual(["tex.png"]);
  });

  it("skips an unknown extra global", () => {
    const pmx = buildPmx(["tex.png"], { globalsCount: 9 });
    expect(parsePmxTexturePaths(pmx.buffer)).toEqual(["tex.png"]);
  });

  it("returns null for a non-PMX buffer", () => {
    expect(parsePmxTexturePaths(new TextEncoder().encode("hello").buffer)).toBeNull();
  });

  it("returns null for a truncated texture table", () => {
    const pmx = buildPmx(["Texture2D/tex_a.png"]);
    expect(parsePmxTexturePaths(pmx.slice(0, pmx.length - 10).buffer)).toBeNull();
  });
});
