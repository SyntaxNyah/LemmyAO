import { describe, test, expect, beforeEach } from "bun:test";
import {
  backgroundImages,
  backgrounds,
  loadBackgrounds,
  searchBackgrounds,
  setBackgroundExtensions,
} from "../core/backgrounds";
import { parseBackgroundImageListing } from "../utils/parseBackgroundImageListing";
import { state } from "../core/state";
import vanilla from "../constants/backgrounds";

const respond = (body: string, ok = true) => Promise.resolve(new Response(body, { status: ok ? 200 : 404 }));

beforeEach(() => {
  state.server.assetHost = "https://assets.example/base/";
});

describe("loadBackgrounds", () => {
  test("merges backgrounds.json, the folder listing and the vanilla list without duplicates", async () => {
    const urls: string[] = [];
    await loadBackgrounds((url) => {
      urls.push(url);
      if (url.endsWith("backgrounds.json")) return respond(JSON.stringify(["Zeta", "gs4", 7]));
      return respond('<a href="../">../</a><a href="Alpha/">Alpha/</a><a href="GS4/">GS4/</a><a href="x.png">x</a>');
    });
    expect(urls).toEqual(["https://assets.example/base/backgrounds.json", "https://assets.example/base/background/"]);
    expect(backgrounds.names).toContain("Zeta");
    expect(backgrounds.names).toContain("Alpha");
    expect(backgrounds.names.filter((n) => n.toLowerCase() === "gs4")).toHaveLength(1);
    expect(backgrounds.names.length).toBeGreaterThanOrEqual(vanilla.length);
    expect(backgrounds.loading).toBe(false);
  });

  test("falls back to the vanilla list when the host has neither source", async () => {
    await loadBackgrounds(() => respond("", false));
    expect(backgrounds.names).toHaveLength(new Set(vanilla.map((n) => n.toLowerCase())).size);
  });
});

test("searchBackgrounds ranks prefix matches first and caps the list", () => {
  const names = ["Courtroom", "County Court", "gs4", "Old Court"];
  expect(searchBackgrounds(names, "gs")).toEqual(["gs4"]);
  expect(searchBackgrounds(names, "court")).toEqual(["Courtroom", "County Court", "Old Court"]);
  expect(searchBackgrounds(names, "", 2)).toEqual(["Courtroom", "County Court"]);
});

describe("parseBackgroundImageListing", () => {
  test("keeps image files and skips links that are not images", () => {
    const html = `<a href="../">../</a><a href="sub/">sub/</a><a href="defenseempty.webp">defenseempty.webp</a><a href="my%20bg.png">my bg.png</a><a href="https://other.example/x.png">x</a><a href="?C=N">sort</a><a href="notes.txt">notes</a>`;
    expect(parseBackgroundImageListing(html)).toEqual(["defenseempty.webp", "my bg.png"]);
  });
});

describe("backgroundImages", () => {
  test("reads a background folder listing and caches it", async () => {
    const urls: string[] = [];
    const images = await backgroundImages("CacheTown", (url) => {
      urls.push(url);
      return respond('<a href="defenseempty.png">defenseempty.png</a><a href="sub/">sub/</a>');
    });
    expect(images).toEqual(["defenseempty.png"]);
    expect(urls).toEqual(["https://assets.example/base/background/cachetown/"]);
    await backgroundImages("CacheTown", () => respond(""));
    expect(urls).toHaveLength(1);
  });

  test("returns an empty list when the host has no folder listing", async () => {
    expect(await backgroundImages("MissingTown", () => respond("", false))).toEqual([]);
  });
});

test("setBackgroundExtensions follows the server's preferred order", () => {
  setBackgroundExtensions([".webp"]);
  expect(backgrounds.extensions).toEqual([".webp"]);
  setBackgroundExtensions([".png", ".webp"]);
  expect(backgrounds.extensions).toEqual([".png", ".webp"]);
});