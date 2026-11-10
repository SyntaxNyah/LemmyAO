import { describe, test, expect, beforeEach } from "bun:test";
import { backgrounds, loadBackgrounds, searchBackgrounds } from "../core/backgrounds";
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
