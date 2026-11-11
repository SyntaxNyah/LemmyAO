import { DEFAULT_TABS, type TabId } from "./tabs";

/**
 * How the tabs are arranged in landscape: a tree of splits whose leaves are
 * groups, each showing one of its tabs. The viewport is a tab like any other.
 * Portrait ignores the arrangement: the viewport on top, every other tab in one strip.
 */
export interface PanelGroup {
  kind: "group";
  tabs: TabId[];
  active: TabId | null;
  /** Share of its parent split. */
  size: number;
}

export interface PanelSplit {
  kind: "split";
  /** "row": children side by side; "column": stacked. */
  dir: "row" | "column";
  children: PanelNode[];
  size: number;
}

export type PanelNode = PanelGroup | PanelSplit;

export interface PanelLayout {
  root: PanelNode;
}

/** A group, as the child indices from the root. */
export type GroupRef = number[];

export const MAX_GROUPS = 6;

const ALL_TABS = DEFAULT_TABS.map((t) => t.id);
const group = (tabs: TabId[], size = 1): PanelGroup => ({ kind: "group", tabs, active: tabs[0] ?? null, size });
const split = (dir: PanelSplit["dir"], children: PanelNode[], size = 1): PanelSplit => ({ kind: "split", dir, children, size });

// The viewport above one group, beside the other tabs; sizes roughly match the classic layout.
const around = (under: PanelGroup, side: PanelNode): PanelNode =>
  split("row", [split("column", [group(["viewport"], 2.4), { ...under, size: 1 }], 2.1), { ...side, size: 1 }]);

/** The default arrangement, following a saved tab order: its first tab under the viewport. */
export function defaultLayout(order: readonly TabId[] = ALL_TABS): PanelLayout {
  const [first, ...rest] = order.filter((t) => t !== "viewport");
  return { root: around(group(first ? [first] : []), group(rest)) };
}

export function nodeAt(layout: PanelLayout, path: number[]): PanelNode | undefined {
  let node: PanelNode | undefined = layout.root;
  for (const i of path) node = node?.kind === "split" ? node.children[i] : undefined;
  return node;
}

export function groupAt(layout: PanelLayout, ref: GroupRef): PanelGroup | undefined {
  const node = nodeAt(layout, ref);
  return node?.kind === "group" ? node : undefined;
}

/** Every group with where it is, in reading order. */
export function allGroups(layout: PanelLayout): { ref: GroupRef; group: PanelGroup }[] {
  const out: { ref: GroupRef; group: PanelGroup }[] = [];
  const walk = (node: PanelNode, path: number[]) => {
    if (node.kind === "group") out.push({ ref: path, group: node });
    else node.children.forEach((child, i) => walk(child, [...path, i]));
  };
  walk(layout.root, []);
  return out;
}

const positive = (n: unknown) => (typeof n === "number" && n > 0 ? n : 1);

/**
 * Makes a layout safe to use: every tab exactly once (missing ones join the
 * last group), no empty groups, no split with a single child or nested in one
 * running the same way, and a valid active tab everywhere.
 */
export function normalize(input: PanelLayout): PanelLayout {
  const seen = new Set<TabId>();
  const fixNode = (node: PanelNode | undefined): PanelNode | null => {
    if (!node) return null;
    if (node.kind !== "split") {
      const tabs = (node.tabs ?? []).filter((t) => ALL_TABS.includes(t) && !seen.has(t) && !!seen.add(t));
      if (!tabs.length) return null;
      return { kind: "group", tabs, active: tabs.includes(node.active as TabId) ? node.active! : tabs[0], size: positive(node.size) };
    }
    const dir = node.dir === "column" ? "column" : "row";
    const children = (node.children ?? []).map(fixNode).flatMap((c): PanelNode[] => {
      if (!c) return [];
      if (c.kind === "split" && c.dir === dir) {
        const total = c.children.reduce((sum, k) => sum + k.size, 0);
        return c.children.map((k) => ({ ...k, size: (k.size / total) * c.size }));
      }
      return [c];
    });
    if (!children.length) return null;
    if (children.length === 1) return { ...children[0], size: positive(node.size) };
    return split(dir, children, positive(node.size));
  };
  const root = fixNode(input.root) ?? group([]);
  const missing = ALL_TABS.filter((t) => !seen.has(t));
  if (missing.length) {
    let last: PanelNode = root;
    while (last.kind === "split") last = last.children.at(-1)!;
    last.tabs.push(...missing);
    last.active ??= last.tabs[0];
  }
  return { root: { ...root, size: 1 } };
}

// Earlier versions kept the viewport fixed, with a group under it and the right
// side either as a tree or as columns of stacked groups.
type Saved =
  | PanelLayout
  | { under: PanelGroup; side: PanelNode }
  | { under: PanelGroup; columns: { groups: PanelGroup[]; size: number }[] };

function upgrade(saved: Saved): PanelLayout {
  if ("root" in saved) return saved;
  const under = { ...saved.under, kind: "group" as const };
  if ("side" in saved) return { root: around(under, saved.side) };
  const columns = saved.columns.map((c) => split("column", c.groups.map((g) => ({ ...g, kind: "group" as const })), c.size));
  return { root: around(under, split("row", columns)) };
}

/** Parses a saved layout, falling back to the default (from the old tab order) when it's missing or broken. */
export function loadLayout(saved: string, tabOrder: readonly string[]): PanelLayout {
  if (saved) {
    try {
      return normalize(upgrade(JSON.parse(saved)));
    } catch {
      /* fall through to the default */
    }
  }
  const order = tabOrder.filter((t): t is TabId => (ALL_TABS as string[]).includes(t));
  return normalize(defaultLayout(order.length ? [...order, ...ALL_TABS.filter((t) => !order.includes(t))] : ALL_TABS));
}

const clone = (layout: PanelLayout): PanelLayout => JSON.parse(JSON.stringify(layout));

function take(layout: PanelLayout, tab: TabId) {
  for (const { group: g } of allGroups(layout)) {
    const i = g.tabs.indexOf(tab);
    if (i >= 0) {
      g.tabs.splice(i, 1);
      if (g.active === tab) g.active = g.tabs[Math.min(i, g.tabs.length - 1)] ?? null;
    }
  }
}

/** Moves a tab into a group at `index` (the end by default) and shows it there. */
export function moveTab(layout: PanelLayout, tab: TabId, to: GroupRef, index?: number): PanelLayout {
  const next = clone(layout);
  const target = groupAt(next, to);
  if (!target) return layout;
  const before = target.tabs.indexOf(tab);
  take(next, tab);
  let at = index ?? target.tabs.length;
  if (before >= 0 && before < at) at--;
  target.tabs.splice(Math.max(0, Math.min(at, target.tabs.length)), 0, tab);
  target.active = tab;
  return normalize(next);
}

export type Side = "left" | "right" | "top" | "bottom";

/**
 * Puts the tab in a new group on one side of the node at `at`: a group, or the
 * root ([]) for the edge of the screen. Only that node is divided; when its
 * parent already runs the same way, the new group simply joins it.
 */
export function splitWith(layout: PanelLayout, tab: TabId, at: number[], side: Side): PanelLayout {
  const source = nodeAt(layout, at);
  if (!source || (source.kind === "group" && source.tabs.length === 1 && source.tabs[0] === tab)) return layout;
  const next = clone(layout);
  take(next, tab);
  const dir = side === "left" || side === "right" ? "row" : "column";
  const after = side === "right" || side === "bottom";
  const target = nodeAt(next, at)!;
  // A new panel at the screen's edge takes a smaller share than one splitting a panel in two.
  const share = at.length ? 1 : 0.4;
  const parent = at.length ? (nodeAt(next, at.slice(0, -1)) as PanelSplit) : null;
  if (parent && parent.dir === dir) {
    parent.children.splice(at.at(-1)! + (after ? 1 : 0), 0, group([tab], target.size));
  } else if (!parent && target.kind === "split" && target.dir === dir) {
    const total = target.children.reduce((sum, c) => sum + c.size, 0);
    const fresh = group([tab], (total * share) / (1 - share) / 2);
    if (after) target.children.push(fresh);
    else target.children.unshift(fresh);
  } else {
    const pair = [{ ...target, size: 1 }, group([tab], share)];
    const wrapped = split(dir, after ? pair : pair.reverse(), target.size);
    if (parent) parent.children[at.at(-1)!] = wrapped;
    else next.root = wrapped;
  }
  const result = normalize(next);
  return allGroups(result).length > Math.max(MAX_GROUPS, allGroups(layout).length) ? layout : result;
}

export function showTab(layout: PanelLayout, tab: TabId): PanelLayout {
  const next = clone(layout);
  for (const { group: g } of allGroups(next)) if (g.tabs.includes(tab)) g.active = tab;
  return next;
}

/** Sets the sizes of a split's children (from a resize knob). */
export function resizeSplit(layout: PanelLayout, path: number[], sizes: number[]): PanelLayout {
  const next = clone(layout);
  const node = nodeAt(next, path);
  if (node?.kind === "split") node.children.forEach((c, i) => (c.size = sizes[i] ?? c.size));
  return next;
}

/** Every tab in layout order. */
export const flatTabs = (layout: PanelLayout): TabId[] => allGroups(layout).flatMap(({ group: g }) => g.tabs);
