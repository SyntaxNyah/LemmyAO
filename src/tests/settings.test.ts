import { describe, test, expect, beforeEach, spyOn } from "bun:test";
import { effect } from "@vue/reactivity";
import {
  settings,
  setSetting,
  resetSettings,
  reloadSettings,
  getFavourites,
  setFavourites,
} from "../core/settings";

beforeEach(() => {
  localStorage.clear();
  reloadSettings();
});

describe("settings", () => {
  test("falls back to defaults when nothing is stored", () => {
    expect(settings.chatbox).toBe("dynamic");
    expect(settings.musicVolume).toBe(1);
    expect(settings.preanimGlow).toBe(true);
    expect(settings.panTilt).toBe(false);
    expect(settings.callwords).toEqual([]);
  });

  test("reads values written by the legacy UI", () => {
    localStorage.setItem("OOC_name", "Phoenix");
    localStorage.setItem("musicVolume", "0.25");
    localStorage.setItem("musicMuted", "1");
    localStorage.setItem("panTilt", "true");
    localStorage.setItem("preanimGlowEnabled", "false");
    localStorage.setItem("callwords", "objection\nhold it");
    reloadSettings();

    expect(settings.oocName).toBe("Phoenix");
    expect(settings.musicVolume).toBe(0.25);
    expect(settings.musicMuted).toBe(true);
    expect(settings.panTilt).toBe(true);
    expect(settings.preanimGlow).toBe(false);
    expect(settings.callwords).toEqual(["objection", "hold it"]);
  });

  test("writes in the legacy formats", () => {
    setSetting("sfxMuted", true);
    setSetting("hideDesks", true);
    setSetting("blipVolume", 0.5);
    setSetting("callwords", ["a", "b"]);

    expect(localStorage.getItem("sfxMuted")).toBe("1");
    expect(localStorage.getItem("hideDesks")).toBe("true");
    expect(localStorage.getItem("blipVolume")).toBe("0.5");
    expect(localStorage.getItem("callwords")).toBe("a\nb");
  });

  test("clamps ranges and ignores garbage", () => {
    localStorage.setItem("chatOffset", "250");
    localStorage.setItem("sfxVolume", "loud");
    localStorage.setItem("blipPitch", "");
    reloadSettings();
    expect(settings.chatOffset).toBe(100);
    expect(settings.sfxVolume).toBe(1);
    expect(settings.blipPitch).toBe(1);

    setSetting("preanimGlowIntensity", -5);
    expect(settings.preanimGlowIntensity).toBe(0);
    expect(localStorage.getItem("preanimGlowIntensity")).toBe("0");
  });

  test("unknown boolean spellings fall back to the default", () => {
    localStorage.setItem("preanimGlowEnabled", "yes");
    localStorage.setItem("musicMuted", "true");
    reloadSettings();
    expect(settings.preanimGlow).toBe(true);
    expect(settings.musicMuted).toBe(false);
  });

  test("is reactive", () => {
    const seen: number[] = [];
    effect(() => seen.push(settings.musicVolume));
    setSetting("musicVolume", 0.3);
    expect(seen).toEqual([1, 0.3]);
  });

  test("the exported view is read-only", () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    (settings as { chatbox: string }).chatbox = "aa";
    expect(settings.chatbox).toBe("dynamic");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  test("reset clears only the named settings", () => {
    setSetting("chatbox", "aa");
    setSetting("oocName", "Edgeworth");
    resetSettings(["chatbox"]);

    expect(settings.chatbox).toBe("dynamic");
    expect(localStorage.getItem("chatbox")).toBeNull();
    expect(settings.oocName).toBe("Edgeworth");
  });

  test("reset with no arguments clears everything", () => {
    setSetting("chatbox", "aa");
    setSetting("voiceMuted", true);
    resetSettings();
    expect(settings.chatbox).toBe("dynamic");
    expect(settings.voiceMuted).toBe(false);
  });
});

describe("favourites", () => {
  test("are stored per asset host", () => {
    setFavourites("https://a.example/", [1, 5]);
    expect([...getFavourites("https://a.example/")]).toEqual([1, 5]);
    expect(getFavourites("https://b.example/").size).toBe(0);
    expect(localStorage.getItem("favourites_https://a.example/")).toBe("[1,5]");
  });

  test("survive corrupt storage", () => {
    localStorage.setItem("favourites_h", "{not json");
    expect(getFavourites("h").size).toBe(0);
    localStorage.setItem("favourites_h", '[1,"x",2.5,3]');
    expect([...getFavourites("h")]).toEqual([1, 3]);
  });
});
