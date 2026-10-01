import { describe, it, expect } from "bun:test";
import {
  EmoteModifier,
  TextColor,
  ShoutModifier,
  DeskModifier,
  Side,
} from "aolib-ts";
import { enumByNumber } from "../utils/aoEnum";

// enumByNumber assumes aolib-ts declares each enum in AO wire-numeric order, so
// the Nth value is the member for wire number N. LemmyAO relies on this to
// convert the numeric DOM/char.ini values (textcolor option, data-shout,
// char.ini modifier/deskmod) into aolib enum members when building a packet.
// If aolib-ts ever reorders an enum, these fail and flag the boundary break.

describe("enumByNumber maps AO wire numbers to aolib-ts enum members", () => {
  it("EmoteModifier (with the unused_3/4 wire gaps)", () => {
    expect(enumByNumber(EmoteModifier, 0)).toBe(EmoteModifier.no_preanim);
    expect(enumByNumber(EmoteModifier, 1)).toBe(EmoteModifier.preanim);
    expect(enumByNumber(EmoteModifier, 5)).toBe(EmoteModifier.zoom);
    expect(enumByNumber(EmoteModifier, 6)).toBe(EmoteModifier.objection_zoom);
  });

  it("TextColor 0..9", () => {
    expect(enumByNumber(TextColor, 0)).toBe(TextColor.white);
    expect(enumByNumber(TextColor, 2)).toBe(TextColor.red);
    expect(enumByNumber(TextColor, 9)).toBe(TextColor.rainbow);
  });

  it("ShoutModifier 0..4", () => {
    expect(enumByNumber(ShoutModifier, 0)).toBe(ShoutModifier.none);
    expect(enumByNumber(ShoutModifier, 2)).toBe(ShoutModifier.objection);
    expect(enumByNumber(ShoutModifier, 4)).toBe(ShoutModifier.custom);
  });

  it("DeskModifier 0..5", () => {
    expect(enumByNumber(DeskModifier, 0)).toBe(DeskModifier.hidden);
    expect(enumByNumber(DeskModifier, 1)).toBe(DeskModifier.shown);
    expect(enumByNumber(DeskModifier, 5)).toBe(
      DeskModifier.show_during_preanim_then_center,
    );
  });

  it("Side is string-valued (member equals its wire value)", () => {
    expect(Side.def).toBe("def");
    expect(Side.wit).toBe("wit");
  });
});
