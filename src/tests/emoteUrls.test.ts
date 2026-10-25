import { describe, it, expect } from "bun:test";
import { buildEmoteUrls } from "../utils/emoteUrls";

// Candidates the in-chat sprite renderer probes, in order. The pack that
// exposed the bug (beelzebub (ht)_fv) stores every sprite as
// characters/<char>/images/<name>.webp, so only the bare spelling hits.

const HOST = "https://assets.example/base/";
const EXTS = [".gif", ".png", ".apng", ".webp", ".webp.static"];
const CHAR = "beelzebub (ht)_fv";
const CHAR_FOLDER = `${HOST}characters/beelzebub%20(ht)_fv/`;

describe("buildEmoteUrls", () => {
  it("probes the ladder for a legacy stem containing a dot", () => {
    const urls = buildEmoteUrls(HOST, EXTS, CHAR, "images/11.1-presenting-gun", "(a)");
    // Prefixed spelling first …
    expect(urls[0]).toBe(`${CHAR_FOLDER}(a)images/11.1-presenting-gun.gif`);
    // … and the bare .webp spelling the pack actually ships, via .webp.static.
    expect(urls).toContain(`${CHAR_FOLDER}images/11.1-presenting-gun.webp`);
  });

  it("keeps the (a)/(b)-nested-folder fallback", () => {
    const urls = buildEmoteUrls(HOST, EXTS, CHAR, "/22-oh shit", "(b)");
    expect(urls).toContain(`${CHAR_FOLDER}(b)/22-oh%20shit.webp`);
    expect(urls).toContain(`${CHAR_FOLDER}(b)/22-oh%20shit.gif`);
  });

  it("treats a block-format filename as the single literal candidate", () => {
    expect(buildEmoteUrls(HOST, EXTS, "phoenix", "normal.webp", "(a)")).toEqual([
      `${HOST}characters/phoenix/(a)normal.webp`,
    ]);
  });

  it("returns nothing for a non-sprite animation (3D .vmd)", () => {
    expect(buildEmoteUrls(HOST, EXTS, "aurelia", "idle.vmd", "(a)")).toEqual([]);
  });

  it("still builds the bare .webp candidate for an ordinary stem", () => {
    expect(buildEmoteUrls(HOST, EXTS, "phoenix", "normal", "(a)")).toContain(
      `${HOST}characters/phoenix/normal.webp`,
    );
  });
});
