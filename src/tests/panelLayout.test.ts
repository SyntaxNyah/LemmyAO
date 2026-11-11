import { describe, expect, test } from "bun:test";
import {
  allGroups,
  defaultLayout,
  flatTabs,
  loadLayout,
  MAX_SIDE_GROUPS,
  moveTab,
  normalize,
  showTab,
  splitWith,
} from "../ui/client/panelLayout";
import { DEFAULT_TABS } from "../ui/client/tabs";

const ALL = DEFAULT_TABS.map((t) => t.id);
const shape = (l: ReturnType<typeof defaultLayout>) => ({
  under: l.under.tabs,
  columns: l.columns.map((c) => c.groups.map((g) => g.tabs)),
});

describe("panel layout", () => {
  test("by default the first tab is under the viewport and the rest share one group", () => {
    const l = defaultLayout();
    expect(shape(l)).toEqual({ under: ["emotes"], columns: [[ALL.slice(1)]] });
    expect(l.columns[0].groups[0].active).toBe("log");
  });

  test("the old tab order seeds the first layout", () => {
    const l = loadLayout("", ["log", "emotes"]);
    expect(l.under.tabs).toEqual(["log"]);
    expect(l.columns[0].groups[0].tabs.slice(0, 2)).toEqual(["emotes", "ooc"]);
  });

  test("a broken or partial saved layout is repaired: every tab exactly once", () => {
    expect(flatTabs(loadLayout("{not json", [])).sort()).toEqual([...ALL].sort());
    const partial = loadLayout(JSON.stringify({ under: { tabs: ["ooc", "ooc", "nope"] }, columns: [] }), []);
    expect(partial.under.tabs).toEqual(["ooc"]);
    expect(flatTabs(partial).sort()).toEqual([...ALL].sort());
  });

  test("moving a tab between groups shows it in the new one", () => {
    const l = moveTab(defaultLayout(), "ooc", "under", 0);
    expect(l.under.tabs).toEqual(["ooc", "emotes"]);
    expect(l.under.active).toBe("ooc");
    expect(l.columns[0].groups[0].tabs).not.toContain("ooc");
  });

  test("reordering inside a group lands where it was dropped", () => {
    const l = moveTab(defaultLayout(), "log", { column: 0, group: 0 }, 3);
    expect(l.columns[0].groups[0].tabs.slice(0, 3)).toEqual(["ooc", "areas", "log"]);
  });

  test("splitting below and beside, and an emptied group disappears", () => {
    let l = splitWith(defaultLayout(), "ooc", { column: 0, group: 0 }, "below");
    expect(shape(l).columns).toEqual([[ALL.slice(1).filter((t) => t !== "ooc"), ["ooc"]]]);
    l = splitWith(l, "music", { column: 0, group: 0 }, "beside");
    expect(l.columns).toHaveLength(2);
    expect(l.columns[1].groups[0].tabs).toEqual(["music"]);
    l = moveTab(l, "music", { column: 0, group: 1 });
    expect(l.columns).toHaveLength(1);
    expect(l.columns[0].groups[1].tabs).toEqual(["ooc", "music"]);
  });

  test("the right side holds at most four groups", () => {
    let l = defaultLayout();
    for (const tab of ["ooc", "areas", "music", "players"] as const) l = splitWith(l, tab, { column: 0, group: 0 }, "below");
    expect(allGroups(l).length - 1).toBe(MAX_SIDE_GROUPS);
  });

  test("the group under the viewport may be emptied, and showTab picks a group's tab", () => {
    const l = moveTab(defaultLayout(), "emotes", { column: 0, group: 0 });
    expect(l.under.tabs).toEqual([]);
    expect(l.under.active).toBeNull();
    expect(showTab(l, "music").columns[0].groups[0].active).toBe("music");
  });

  test("normalize keeps a valid active tab", () => {
    const l = normalize({ under: { tabs: ["emotes"], active: "log", size: 1 }, columns: [] });
    expect(l.under.active).toBe("emotes");
  });
});
