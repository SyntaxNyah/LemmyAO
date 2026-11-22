import { beforeEach, describe, expect, test } from "bun:test";
import { reloadSettings, resetSettings, setSetting, settings } from "../core/settings";
import { defaultLayout, flatTabs, loadLayout, moveTab, type PanelLayout } from "../ui/client/panelLayout";
import {
  LAYOUT_COOKIE,
  LAYOUT_TIME_KEY,
  clearSharedLayout,
  mirrorLayout,
  syncSharedLayout,
} from "../ui/client/layoutStorage";

const HTTPS = "https://webao.example/client.html?connect=wss://server.example";
const HTTP = "http://webao.example/client.html?connect=ws://server.example";
const setUrl = (url: string) =>
  (globalThis as unknown as { happyDOM: { setURL(u: string): void } }).happyDOM.setURL(url);

const clearCookies = () => {
  for (const part of document.cookie.split("; ")) {
    const name = part.split("=")[0];
    if (name) document.cookie = `${name}=; Max-Age=0; Path=${location.pathname}`;
  }
};

/** A valid layout that differs from the default. */
const custom = (tab: "music" | "evidence") => moveTab(defaultLayout(), tab, [1], 0);
const saved = () => loadLayout(settings.panelLayout, []);
const tabs = (layout: PanelLayout) => flatTabs(layout).sort();

beforeEach(() => {
  setUrl(HTTPS);
  clearCookies();
  localStorage.clear();
  resetSettings();
  reloadSettings();
});

describe("shared layout cookie", () => {
  test("adopts a layout made over https when the client loads over http", () => {
    const layout = custom("music");
    mirrorLayout(layout, 0.44);
    expect(document.cookie).toContain(`${LAYOUT_COOKIE}=`);

    // The other scheme has its own localStorage, but not the layout yet.
    setUrl(HTTP);
    localStorage.clear();
    resetSettings();
    reloadSettings();

    syncSharedLayout();
    expect(settings.layoutViewportPortrait).toBe(0.44);
    expect(tabs(saved())).toEqual(tabs(layout));
  });

  test("the newer shared copy wins over an older local layout", () => {
    const newer = custom("evidence");
    mirrorLayout(newer, 0.6);

    setUrl(HTTP);
    setSetting("panelLayout", JSON.stringify(custom("music")));
    setSetting("layoutViewportPortrait", 0.3);
    localStorage.setItem(LAYOUT_TIME_KEY, String(Date.now() - 60_000));

    syncSharedLayout();
    expect(settings.layoutViewportPortrait).toBe(0.6);
    expect(tabs(saved())).toEqual(tabs(newer));
  });

  test("a newer local layout is mirrored to the other scheme", () => {
    mirrorLayout(custom("music"), 0.3);

    const newer = custom("evidence");
    setSetting("panelLayout", JSON.stringify(newer));
    setSetting("layoutViewportPortrait", 0.5);
    localStorage.setItem(LAYOUT_TIME_KEY, String(Date.now() + 60_000));
    syncSharedLayout();
    expect(tabs(saved())).toEqual(tabs(newer));

    setUrl(HTTP);
    localStorage.clear();
    resetSettings();
    syncSharedLayout();
    expect(settings.layoutViewportPortrait).toBe(0.5);
    expect(tabs(saved())).toEqual(tabs(newer));
  });

  test("reset leaves a marker that clears the other scheme too", () => {
    const layout = custom("music");
    setSetting("panelLayout", JSON.stringify(layout));
    setSetting("layoutViewportPortrait", 0.5);
    clearSharedLayout();

    // The other scheme still has the old layout with an older timestamp.
    setUrl(HTTP);
    setSetting("panelLayout", JSON.stringify(layout));
    setSetting("layoutViewportPortrait", 0.5);
    localStorage.setItem(LAYOUT_TIME_KEY, String(Date.now() - 60_000));

    syncSharedLayout();
    expect(settings.panelLayout).toBe("");
    expect(settings.layoutViewportPortrait).toBe(0);
  });

  test("does not resurrect a layout after this scheme was reset", () => {
    mirrorLayout(custom("music"), 0.4);

    setUrl(HTTP);
    localStorage.clear();
    resetSettings();
    // This scheme was deliberately reset after the cookie was written.
    localStorage.setItem(LAYOUT_TIME_KEY, String(Date.now() + 60_000));

    syncSharedLayout();
    expect(settings.panelLayout).toBe("");
    expect(settings.layoutViewportPortrait).toBe(0);
  });

  test("ignores a corrupt shared cookie", () => {
    document.cookie = `${LAYOUT_COOKIE}=not-base64!; Path=${location.pathname}`;
    expect(() => syncSharedLayout()).not.toThrow();
    expect(settings.panelLayout).toBe("");
    expect(settings.layoutViewportPortrait).toBe(0);
  });
});
