import { describe, it, expect } from "bun:test";
import { parseCharIni } from "aolib-ts";

// Contract for the parseCharIni behaviour LemmyAO's handleCharacterInfo relies
// on. aolib-ts 2.x rejects an empty string (it needs an [options] section with a
// name), so the missing-ini fallback feeds a minimal stub instead. These pin
// both so a future change is caught.

describe("aolib-ts parseCharIni", () => {
  it("rejects an empty string (no [options] section)", () => {
    expect(() => parseCharIni("")).toThrow(/\[options\]/);
  });

  it("parses the missing-ini fallback stub to a valid empty CharIni", () => {
    const cini = parseCharIni("[options]\nname = -\n");
    expect(cini.emotes).toEqual([]);
    // aolib fills the defaults LemmyAO reads without extra guarding.
    expect(cini.options.side).toBe("wit");
    expect(cini.options.blips).toBe("male");
    expect(cini.options.model).toBe("");
    expect(cini.options.chat).toBeNull();
  });

  it("exposes emote fields LemmyAO consumes, with a numeric modifier", () => {
    const cini = parseCharIni(
      [
        "[options]",
        "name = Phoenix",
        "[emote wave]",
        "anim = wave.gif",
        "preanim = point.gif",
        "modifier = preanim",
      ].join("\n"),
    );
    expect(cini.emotes).toHaveLength(1);
    const e = cini.emotes[0];
    expect(e.anim).toBe("wave.gif");
    expect(e.preanim).toBe("point.gif");
    expect(typeof e.modifier).toBe("number");
    expect(e.modifier).toBe(1); // `preanim` name resolves to the numeric AO modifier
  });
});
