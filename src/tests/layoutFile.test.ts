import { beforeEach, describe, expect, test } from "bun:test";
import { reloadSettings, resetSettings, setSetting, settings } from "../core/settings";
import { defaultLayout, flatTabs, loadLayout, moveTab, type PanelLayout } from "../ui/client/panelLayout";
import { DEFAULT_TABS } from "../ui/client/tabs";
import { applyLayoutText } from "../ui/client/layout";
import { layoutFileData, layoutFileText, parseLayoutFile } from "../ui/client/layoutFile";

const ALL = DEFAULT_TABS.map((tab) => tab.id);
const sorted = (layout: PanelLayout) => flatTabs(layout).sort();

/** A valid layout that differs from the default: music leads the side group. */
const custom = () => moveTab(defaultLayout(), "music", [1], 0);

beforeEach(() => {
  localStorage.clear();
  resetSettings();
  reloadSettings();
});

describe("layout files", () => {
  test("export the layout in use, and read it back unchanged", () => {
    const layout = custom();
    setSetting("panelLayout", JSON.stringify(layout));
    setSetting("layoutViewportPortrait", 0.42);

    const text = layoutFileText();
    expect(text.endsWith("\n")).toBe(true);

    const file = parseLayoutFile(text);
    expect(file.format).toBe("lemmyao-layout");
    expect(file.version).toBe(1);
    expect(file.panelLayout).toEqual(loadLayout(JSON.stringify(layout), []));
    expect(file.layoutViewportPortrait).toBe(0.42);
  });

  test("a fresh install exports the default layout, not an empty value", () => {
    const file = layoutFileData();
    expect(file.panelLayout).toEqual(loadLayout("", []));
    expect(file.layoutViewportPortrait).toBe(0);
  });

  test("accepts a raw panelLayout value and a stringified one", () => {
    const layout = custom();
    expect(parseLayoutFile(JSON.stringify(layout)).panelLayout).toEqual(loadLayout(JSON.stringify(layout), []));
    expect(parseLayoutFile(JSON.stringify({ panelLayout: JSON.stringify(layout) })).panelLayout).toEqual(
      loadLayout(JSON.stringify(layout), []),
    );
  });

  test("accepts the old fixed-viewport shapes", () => {
    const group = (tabs: string[]) => ({ kind: "group", tabs, active: tabs[0], size: 1 });
    const legacy = {
      under: group(["log"]),
      side: { kind: "split", dir: "column", size: 1, children: [group(["music"]), group(["ooc"])] },
    };
    const file = parseLayoutFile(JSON.stringify(legacy));
    expect(sorted(file.panelLayout)).toEqual([...ALL].sort());
    expect(flatTabs(file.panelLayout)).toContain("log");
    expect(flatTabs(file.panelLayout)).toContain("music");
  });

  test("repairs a partial layout: every tab once, no duplicates", () => {
    const partial = {
      root: {
        kind: "group",
        tabs: ["log", "log", "nope"],
        active: "nope",
        size: 1,
      },
    };
    const file = parseLayoutFile(JSON.stringify(partial));
    const tabs = flatTabs(file.panelLayout);
    expect(tabs.sort()).toEqual([...ALL].sort());
    expect(new Set(tabs).size).toBe(ALL.length);
  });

  test("clamps the portrait height and ignores a non-number", () => {
    const layout = custom();
    const portrait = (value: unknown) =>
      parseLayoutFile(JSON.stringify({ panelLayout: layout, layoutViewportPortrait: value })).layoutViewportPortrait;
    expect(portrait(-2)).toBe(0);
    expect(portrait(2)).toBe(1);
    expect(portrait("0.4")).toBe(0);
    expect(portrait(undefined)).toBe(0);
  });

  test("ignores unknown fields", () => {
    const file = parseLayoutFile(JSON.stringify({ ...layoutFileData(), somethingElse: true }));
    expect(file.format).toBe("lemmyao-layout");
    expect(file.panelLayout).toEqual(loadLayout("", []));
  });

  test("rejects files that aren't layouts, with a readable reason", () => {
    expect(() => parseLayoutFile("{")).toThrow("valid JSON");
    expect(() => parseLayoutFile("{}")).toThrow("doesn't contain a layout");
    expect(() => parseLayoutFile(JSON.stringify({ format: "something-else", root: {} }))).toThrow("isn't a LemmyAO layout");
    expect(() => parseLayoutFile(JSON.stringify({ panelLayout: "{" }))).toThrow("valid layout");
    expect(() => parseLayoutFile(JSON.stringify({ panelLayout: { root: { kind: "group", tabs: ["nope"] } } }))).toThrow(
      "doesn't contain a LemmyAO layout",
    );
  });

  test("rejects a layout made by a newer version", () => {
    expect(() => parseLayoutFile(JSON.stringify({ format: "lemmyao-layout", version: 2, panelLayout: custom() }))).toThrow(
      "newer version",
    );
  });

  test("applying a file updates both saved layout settings", () => {
    const layout = custom();
    applyLayoutText(
      JSON.stringify({
        format: "lemmyao-layout",
        version: 1,
        panelLayout: layout,
        layoutViewportPortrait: 0.3,
      }),
    );
    expect(loadLayout(settings.panelLayout, [])).toEqual(loadLayout(JSON.stringify(layout), []));
    expect(settings.layoutViewportPortrait).toBe(0.3);
  });
});
