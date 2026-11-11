import { DEFAULT_TABS, type TabId } from "./tabs";

/**
 * How the tabs are arranged in landscape: a group under the viewport, and the
 * right side as a tree of splits whose leaves are groups. Each group shows one
 * of its tabs. Portrait ignores the arrangement and lists every tab in one strip.
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
  under: PanelGroup;
  side: PanelNode;
}

/** A group: "under", or the child indices from the right side's root. */
export type GroupRef = "under" | number[];

export const MAX_SIDE_GROUPS = 4;

const ALL_TABS = DEFAULT_TABS.map((t) => t.id);
const group = (tabs: TabId[], size = 1): PanelGroup => ({ kind: "group", tabs, active: tabs[0] ?? null, size });

/** The default arrangement, following a saved tab order: the first tab under the viewport. */
export function defaultLayout(order: readonly TabId[] = ALL_TABS): PanelLayout {
  const [first, ...rest] = order;
  return { under: group(first ? [first] : []), side: group(rest) };
}

export function nodeAt(layout: PanelLayout, path: number[]): PanelNode | undefined {
  let node: PanelNode | undefined = layout.side;
  for (const i of path) node = node?.kind === "split" ? node.children[i] : undefined;
  return node;
}

export function groupAt(layout: PanelLayout, ref: GroupRef): PanelGroup | undefined {
  if (ref === "under") return layout.under;
  const node = nodeAt(layout, ref);
  return node?.kind === "group" ? node : undefined;
}

/** Every group with where it is, the one under the viewport first, then the right side in reading order. */
export function allGroups(layout: PanelLayout): { ref: GroupRef; group: PanelGroup }[] {
  const out: { ref: GroupRef; group: PanelGroup }[] = [{ ref: "under", group: layout.under }];
  const walk = (node: PanelNode, path: number[]) => {
    if (node.kind === "group") out.push({ ref: path, group: node });
    else node.children.forEach((child, i) => walk(child, [...path, i]));
  };
  walk(layout.side, []);
  return out;
}

export const sideGroupCount = (layout: PanelLayout) => allGroups(layout).length - 1;

const positive = (n: unknown) => (typeof n === "number" && n > 0 ? n : 1);

/**
 * Makes a layout safe to use: every tab exactly once (missing ones join the
 * last group), no empty groups on the right, no split with a single child,
 * and a valid active tab everywhere.
 */
export function normalize(input: PanelLayout): PanelLayout {
  const seen = new Set<TabId>();
  const fixGroup = (g: Partial<PanelGroup>): PanelGroup => {
    const tabs = (g.tabs ?? []).filter((t) => ALL_TABS.includes(t) && !seen.has(t) && !!seen.add(t));
    return { kind: "group", tabs, active: tabs.includes(g.active as TabId) ? g.active! : (tabs[0] ?? null), size: positive(g.size) };
  };
  const under = fixGroup(input.under ?? {});
  const fixNode = (node: PanelNode | undefined): PanelNode | null => {
    if (!node) return null;
    if (node.kind !== "split") {
      const g = fixGroup(node);
      return g.tabs.length ? g : null;
    }
    const dir = node.dir === "column" ? "column" : "row";
    const children = (node.children ?? []).map(fixNode).flatMap((c): PanelNode[] => {
      if (!c) return [];
      // A split inside one running the same way merges into it, keeping its share.
      if (c.kind === "split" && c.dir === dir) {
        const total = c.children.reduce((sum, k) => sum + k.size, 0);
        return c.children.map((k) => ({ ...k, size: (k.size / total) * c.size }));
      }
      return [c];
    });
    if (!children.length) return null;
    // A split of one is just that child, in the split's place.
    if (children.length === 1) return { ...children[0], size: positive(node.size) };
    return { kind: "split", dir, children, size: positive(node.size) };
  };
  let side = fixNode(input.side) ?? group([]);
  const missing = ALL_TABS.filter((t) => !seen.has(t));
  if (missing.length) {
    let last: PanelNode = side;
    while (last.kind === "split") last = last.children.at(-1)!;
    last.tabs.push(...missing);
    last.active ??= last.tabs[0];
  }
  if (side.kind === "group") side = { ...side, size: 1 };
  return { under, side };
}

// The first version stored the right side as columns of stacked groups.
interface ColumnsLayout {
  under: PanelGroup;
  columns: { groups: PanelGroup[]; size: number }[];
}

function fromColumns(old: ColumnsLayout): PanelLayout {
  const column = (c: ColumnsLayout["columns"][number]): PanelNode => ({
    kind: "split",
    dir: "column",
    children: c.groups.map((g) => ({ ...g, kind: "group" as const })),
    size: c.size,
  });
  return { under: { ...old.under, kind: "group" }, side: { kind: "split", dir: "row", children: old.columns.map(column), size: 1 } };
}

/** Parses a saved layout, falling back to the default (from the old tab order) when it's missing or broken. */
export function loadLayout(saved: string, tabOrder: readonly string[]): PanelLayout {
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return normalize("columns" in parsed ? fromColumns(parsed) : parsed);
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

/**
 * Splits one right-side group: `beside` puts the tab in a new group to its
 * right, `below` under it. Only that group is divided; when its parent already
 * runs the same way, the new group simply joins it.
 */
export function splitWith(layout: PanelLayout, tab: TabId, at: GroupRef, where: "below" | "beside"): PanelLayout {
  if (at === "under" || sideGroupCount(layout) >= MAX_SIDE_GROUPS) return layout;
  const source = groupAt(layout, at);
  if (!source || (source.tabs.length === 1 && source.tabs[0] === tab)) return layout;
  const next = clone(layout);
  take(next, tab);
  const dir = where === "beside" ? "row" : "column";
  const target = groupAt(next, at)!;
  const parent = at.length ? (nodeAt(next, at.slice(0, -1)) as PanelSplit) : null;
  if (parent && parent.dir === dir) {
    parent.children.splice(at.at(-1)! + 1, 0, group([tab], target.size));
  } else {
    const split: PanelSplit = { kind: "split", dir, children: [{ ...target, size: 1 }, group([tab])], size: target.size };
    if (parent) parent.children[at.at(-1)!] = split;
    else next.side = split;
  }
  return normalize(next);
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

/** Every tab in layout order, for portrait's single strip. */
export const flatTabs = (layout: PanelLayout): TabId[] => allGroups(layout).flatMap(({ group: g }) => g.tabs);
