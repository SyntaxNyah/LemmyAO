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
  type PanelLayout,
  type PanelNode,
} from "../ui/client/panelLayout";
import { DEFAULT_TABS } from "../ui/client/tabs";

const ALL = DEFAULT_TABS.map((t) => t.id);
// The right side as nested arrays: a group is its tabs, a split is { row | column: children }.
const tree = (n: PanelNode): unknown => (n.kind === "group" ? n.tabs : { [n.dir]: n.children.map(tree) });
const side = (l: PanelLayout) => tree(l.side);
const rest = (...without: string[]) => ALL.slice(1).filter((t) => !without.includes(t));

describe("panel layout", () => {
  test("by default the first tab is under the viewport and the rest share one group", () => {
    const l = defaultLayout();
    expect(l.under.tabs).toEqual(["emotes"]);
    expect(side(l)).toEqual(ALL.slice(1));
    expect(allGroups(l)[1].group.active).toBe("log");
  });

  test("the old tab order seeds the first layout", () => {
    const l = loadLayout("", ["log", "emotes"]);
    expect(l.under.tabs).toEqual(["log"]);
    expect(flatTabs(l).slice(1, 3)).toEqual(["emotes", "ooc"]);
  });

  test("a broken or partial saved layout is repaired: every tab exactly once", () => {
    expect(flatTabs(loadLayout("{not json", [])).sort()).toEqual([...ALL].sort());
    const partial = loadLayout(JSON.stringify({ under: { tabs: ["ooc", "ooc", "nope"] }, side: { kind: "split", children: [] } }), []);
    expect(partial.under.tabs).toEqual(["ooc"]);
    expect(flatTabs(partial).sort()).toEqual([...ALL].sort());
  });

  test("a layout saved as columns of groups carries over", () => {
    const old = {
      under: { tabs: ["emotes"], active: "emotes", size: 1 },
      columns: [
        { groups: [{ tabs: rest("music"), active: "log", size: 2 }], size: 1 },
        { groups: [{ tabs: ["music"], active: "music", size: 1 }], size: 1 },
      ],
    };
    expect(side(loadLayout(JSON.stringify(old), []))).toEqual({ row: [rest("music"), ["music"]] });
  });

  test("moving a tab between groups shows it in the new one", () => {
    const l = moveTab(defaultLayout(), "ooc", "under", 0);
    expect(l.under.tabs).toEqual(["ooc", "emotes"]);
    expect(l.under.active).toBe("ooc");
    expect(side(l)).toEqual(rest("ooc"));
  });

  test("reordering inside a group lands where it was dropped", () => {
    const l = moveTab(defaultLayout(), "log", [], 3);
    expect(flatTabs(l).slice(1, 4)).toEqual(["ooc", "areas", "log"]);
  });

  test("splitting beside a stacked group divides only that group", () => {
    let l = splitWith(defaultLayout(), "background", [], "below");
    expect(side(l)).toEqual({ column: [rest("background"), ["background"]] });
    l = splitWith(l, "music", [0], "beside");
    expect(side(l)).toEqual({ column: [{ row: [rest("background", "music"), ["music"]] }, ["background"]] });
  });

  test("a split joins its parent when that runs the same way", () => {
    let l = splitWith(defaultLayout(), "ooc", [], "below");
    l = splitWith(l, "music", [0], "below");
    expect(side(l)).toEqual({ column: [rest("ooc", "music"), ["music"], ["ooc"]] });
  });

  test("an emptied group disappears and a split of one collapses", () => {
    let l = splitWith(defaultLayout(), "background", [], "below");
    l = splitWith(l, "music", [0], "beside");
    l = moveTab(l, "music", [1]);
    expect(side(l)).toEqual({ column: [rest("background", "music"), ["background", "music"]] });
    l = moveTab(l, "background", [0]);
    l = moveTab(l, "music", [0]);
    expect(side(l)).toEqual(rest("background", "music").concat("background", "music"));
  });

  test("a split nested in one running the same way merges into it", () => {
    const g = (tabs: string[]) => ({ kind: "group", tabs, active: tabs[0], size: 1 });
    const l = normalize({
      under: g([]),
      side: { kind: "split", dir: "row", size: 1, children: [{ kind: "split", dir: "row", size: 1, children: [g(["log"]), g(["ooc"])] }, g(rest("log", "ooc"))] },
    } as unknown as PanelLayout);
    expect(side(l)).toEqual({ row: [["log"], ["ooc"], rest("log", "ooc").concat("emotes")] });
  });

  test("the right side holds at most four groups, and a lone tab can't split its own group", () => {
    let l = splitWith(defaultLayout(), "ooc", [], "below");
    for (const tab of ["areas", "music", "players"] as const) l = splitWith(l, tab, [0], "below");
    expect(allGroups(l).length - 1).toBe(MAX_SIDE_GROUPS);
    const lone = splitWith(defaultLayout(), "ooc", [], "below");
    expect(splitWith(lone, "ooc", [1], "beside")).toBe(lone);
  });

  test("the group under the viewport may be emptied, and showTab picks a group's tab", () => {
    const l = moveTab(defaultLayout(), "emotes", []);
    expect(l.under.tabs).toEqual([]);
    expect(l.under.active).toBeNull();
    expect(allGroups(showTab(l, "music"))[1].group.active).toBe("music");
  });

  test("normalize keeps a valid active tab", () => {
    const l = normalize({ under: { kind: "group", tabs: ["emotes"], active: "log", size: 1 }, side: { kind: "group", tabs: [], active: null, size: 1 } });
    expect(l.under.active).toBe("emotes");
  });
});
