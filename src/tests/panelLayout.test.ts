import { describe, expect, test } from "bun:test";
import {
  allGroups,
  defaultLayout,
  flatTabs,
  loadLayout,
  MAX_GROUPS,
  moveTab,
  normalize,
  showTab,
  splitWith,
  type PanelLayout,
  type PanelNode,
} from "../ui/client/panelLayout";
import { DEFAULT_TABS } from "../ui/client/tabs";

const ALL = DEFAULT_TABS.map((t) => t.id);
// The tree as nested arrays: a group is its tabs, a split is { row | column: children }.
const tree = (n: PanelNode): unknown => (n.kind === "group" ? n.tabs : { [n.dir]: n.children.map(tree) });
const shape = (l: PanelLayout) => tree(l.root);
const side = (...without: string[]) => ALL.filter((t) => !["viewport", "emotes", ...without].includes(t));
// The default's right side is root.children[1]; its path is [1].
const SIDE = [1];

describe("panel layout", () => {
  test("by default the viewport is above IC options, beside one group of the rest", () => {
    const l = defaultLayout();
    expect(shape(l)).toEqual({ row: [{ column: [["viewport"], ["emotes"]] }, side()] });
    expect(allGroups(l)[2].group.active).toBe("log");
  });

  test("the old tab order seeds the first layout", () => {
    const l = loadLayout("", ["log", "emotes"]);
    expect(shape(l)).toEqual({ row: [{ column: [["viewport"], ["log"]] }, ["emotes", ...side("log")]] });
  });

  test("a broken or partial saved layout is repaired: every tab exactly once", () => {
    expect(flatTabs(loadLayout("{not json", [])).sort()).toEqual([...ALL].sort());
    const partial = loadLayout(JSON.stringify({ root: { kind: "split", dir: "row", children: [{ kind: "group", tabs: ["ooc", "ooc", "nope"] }] } }), []);
    expect(allGroups(partial)[0].group.tabs.slice(0, 1)).toEqual(["ooc"]);
    expect(flatTabs(partial).sort()).toEqual([...ALL].sort());
  });

  test("layouts saved with a fixed viewport carry over", () => {
    const g = (tabs: string[]) => ({ kind: "group", tabs, active: tabs[0], size: 1 });
    const withSide = { under: g(["emotes"]), side: { kind: "split", dir: "column", size: 1, children: [g(side("music")), g(["music"])] } };
    expect(shape(loadLayout(JSON.stringify(withSide), []))).toEqual({
      row: [{ column: [["viewport"], ["emotes"]] }, { column: [side("music"), ["music"]] }],
    });
    const withColumns = { under: g([]), columns: [{ groups: [g(["emotes", ...side("music")])], size: 1 }, { groups: [g(["music"])], size: 1 }] };
    expect(shape(loadLayout(JSON.stringify(withColumns), []))).toEqual({ row: [["viewport"], ["emotes", ...side("music")], ["music"]] });
  });

  test("moving a tab between groups shows it in the new one", () => {
    const l = moveTab(defaultLayout(), "ooc", [0, 1], 0);
    expect(allGroups(l)[1].group).toMatchObject({ tabs: ["ooc", "emotes"], active: "ooc" });
    expect(allGroups(l)[2].group.tabs).toEqual(side("ooc"));
  });

  test("the viewport is a tab like the others", () => {
    const l = moveTab(defaultLayout(), "viewport", SIDE, 0);
    expect(shape(l)).toEqual({ row: [["emotes"], ["viewport", ...side()]] });
  });

  test("reordering inside a group lands where it was dropped", () => {
    const l = moveTab(defaultLayout(), "log", SIDE, 3);
    expect(allGroups(l)[2].group.tabs.slice(0, 3)).toEqual(["ooc", "areas", "log"]);
  });

  test("splitting beside a stacked group divides only that group", () => {
    let l = splitWith(defaultLayout(), "background", SIDE, "below");
    expect(shape(l)).toEqual({ row: [{ column: [["viewport"], ["emotes"]] }, { column: [side("background"), ["background"]] }] });
    l = splitWith(l, "music", [1, 0], "beside");
    expect(shape(l)).toEqual({
      row: [{ column: [["viewport"], ["emotes"]] }, { column: [{ row: [side("background", "music"), ["music"]] }, ["background"]] }],
    });
  });

  test("a split joins its parent when that runs the same way", () => {
    const l = splitWith(defaultLayout(), "music", SIDE, "beside");
    expect(shape(l)).toEqual({ row: [{ column: [["viewport"], ["emotes"]] }, side("music"), ["music"]] });
  });

  test("an emptied group disappears and a split of one collapses", () => {
    let l = splitWith(defaultLayout(), "background", SIDE, "below");
    l = moveTab(l, "background", SIDE.concat(0));
    const rest = [...side("background"), "background"];
    expect(shape(l)).toEqual({ row: [{ column: [["viewport"], ["emotes"]] }, rest] });
    l = moveTab(l, "emotes", [0, 0]);
    expect(shape(l)).toEqual({ row: [["viewport", "emotes"], rest] });
  });

  test("a split nested in one running the same way merges into it", () => {
    const g = (tabs: string[]) => ({ kind: "group", tabs, active: tabs[0], size: 1 });
    const l = normalize({
      root: { kind: "split", dir: "row", size: 1, children: [{ kind: "split", dir: "row", size: 1, children: [g(["log"]), g(["ooc"])] }, g(side("log", "ooc"))] },
    } as unknown as PanelLayout);
    expect(shape(l)).toEqual({ row: [["log"], ["ooc"], [...side("log", "ooc"), "viewport", "emotes"]] });
  });

  test("there are at most six groups, and a lone tab can't split its own group", () => {
    let l = splitWith(splitWith(defaultLayout(), "ooc", SIDE, "below"), "areas", [1, 0], "below");
    for (const tab of ["music", "players", "evidence"] as const) l = splitWith(l, tab, [1, 0], "below");
    expect(allGroups(l)).toHaveLength(MAX_GROUPS);
    expect(splitWith(defaultLayout(), "emotes", [0, 1], "beside")).toEqual(defaultLayout());
  });

  test("showTab picks a group's tab", () => {
    expect(allGroups(showTab(defaultLayout(), "music"))[2].group.active).toBe("music");
  });

  test("normalize keeps a valid active tab", () => {
    const l = normalize({ root: { kind: "group", tabs: ["emotes"], active: "log", size: 1 } });
    expect(allGroups(l)[0].group.active).toBe("emotes");
  });
});
