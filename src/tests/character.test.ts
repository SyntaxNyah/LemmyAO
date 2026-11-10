import { describe, test, expect, beforeEach } from "bun:test";
import { parseCharIni, Side } from "aolib-ts";
import { emotesFromIni, selectEmote, setPosition } from "../core/character";
import { draft } from "../core/commands";
import { state } from "../core/state";

const INI = `[Options]
name = Phoenix
side = def

[Emotions]
number = 3
1 = Normal#-#normal#0#1
2 = Pointing#objecting#pointing#1#1
3 = Zoom#-#zoom#5#0

[SoundN]
2 = sfx-deskslam

[SoundT]
2 = 3
`;

describe("emotesFromIni", () => {
  test("maps legacy rows, keeping aolib's enum modifiers", () => {
    const emotes = emotesFromIni(parseCharIni(INI));
    expect(emotes.map((e) => [e.index, e.label, e.preanim, e.anim, e.modifier, e.deskModifier, e.sfx])).toEqual([
      [1, "Normal", "-", "normal", "no_preanim", "shown", "0"],
      [2, "Pointing", "objecting", "pointing", "preanim", "shown", "sfx-deskslam"],
      [3, "Zoom", "-", "zoom", "zoom", "hidden", "0"],
    ]);
    expect(emotes[1].sfxDelay).toBeGreaterThan(0);
  });
});

describe("selectEmote and setPosition", () => {
  beforeEach(() => {
    state.self.character = { name: "Phoenix", showname: "Phoenix", side: Side.def, emotes: emotesFromIni(parseCharIni(INI)) };
    state.self.position = "";
  });

  test("selecting an emote fills the draft and its sfx/preanim defaults", () => {
    selectEmote(1);
    expect(state.self.emoteIndex).toBe(1);
    expect(draft.emote).toMatchObject({ anim: "pointing", preanim: "objecting", modifier: "preanim" });
    expect([draft.sendSfx, draft.sendPreanim]).toEqual([true, true]);
    selectEmote(0);
    expect([draft.sendSfx, draft.sendPreanim]).toEqual([false, false]);
  });

  test("out-of-range selections are ignored", () => {
    selectEmote(0);
    selectEmote(99);
    expect(state.self.emoteIndex).toBe(0);
  });

  test("the default position is the character's own side", () => {
    setPosition("");
    expect(draft.side).toBe(Side.def);
    setPosition(Side.jud);
    expect([state.self.position, draft.side]).toEqual([Side.jud, Side.jud]);
  });
});

describe("characterInfo", () => {
  const serve = (body: string | null) => {
    globalThis.fetch = (async () =>
      body === null ? new Response("", { status: 404 }) : new Response(body)) as unknown as typeof fetch;
  };

  test("reads the viewport's display data from char.ini", async () => {
    state.server.assetHost = "https://info-a.test/";
    serve("[Options]\nname = Apollo\nshowname = Apollo Justice\nside = DEF\nblips = Male\ncategory = AA\nmodel = Apollo.pmx\n[Emotions]\nnumber = 1\n1 = Normal#-#normal#0#1\n");
    const { characterInfo } = await import("../core/character");
    expect(await characterInfo("Apollo")).toMatchObject({
      name: "Apollo",
      showname: "Apollo Justice",
      side: Side.def,
      blips: "male",
      chatbox: "aa",
      model: "apollo.pmx",
    });
  });

  test("falls back to the folder name and the default chatbox", async () => {
    state.server.assetHost = "https://info-b.test/";
    serve(null);
    const { characterInfo } = await import("../core/character");
    expect(await characterInfo("Nobody")).toMatchObject({
      showname: "Nobody",
      side: Side.wit,
      blips: "male",
      chatbox: "default",
      model: "",
    });
  });
});
