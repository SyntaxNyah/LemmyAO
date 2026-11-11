import { DEFAULT_TABS, type TabId } from "./tabs";

/**
 * How the tabs are arranged in landscape: a group under the viewport, and the
 * right side as columns of stacked groups. Each group shows one of its tabs.
 * Portrait ignores the arrangement and lists every tab in one strip.
 */
export interface PanelGroup {
  tabs: TabId[];
  active: TabId | null;
  /** Share of its column's height. */
  size: number;
}

export interface PanelColumn {
  groups: PanelGroup[];
  /** Share of the right side's width. */
  size: number;
}

export interface PanelLayout {
  under: PanelGroup;
  columns: PanelColumn[];
}

/** Where a group is: "under", or a column and its index in it. */
export type GroupRef = "under" | { column: number; group: number };

export const MAX_SIDE_GROUPS = 4;

const ALL_TABS = DEFAULT_TABS.map((t) => t.id);
const group = (tabs: TabId[], size = 1): PanelGroup => ({ tabs, active: tabs[0] ?? null, size });

/** The default arrangement, following a saved tab order: the first tab under the viewport. */
export function defaultLayout(order: readonly TabId[] = ALL_TABS): PanelLayout {
  const [first, ...rest] = order;
  return { under: group(first ? [first] : []), columns: [{ groups: [group(rest)], size: 1 }] };
}

export const groupAt = (layout: PanelLayout, ref: GroupRef) =>
  ref === "under" ? layout.under : layout.columns[ref.column]?.groups[ref.group];

/** Every group with where it is, the one under the viewport first. */
export function allGroups(layout: PanelLayout): { ref: GroupRef; group: PanelGroup }[] {
  return [
    { ref: "under" as GroupRef, group: layout.under },
    ...layout.columns.flatMap((c, column) => c.groups.map((g, i) => ({ ref: { column, group: i } as GroupRef, group: g }))),
  ];
}

export const sideGroupCount = (layout: PanelLayout) => layout.columns.reduce((n, c) => n + c.groups.length, 0);

/**
 * Makes a layout safe to use: every tab exactly once (missing ones join the last
 * group), no empty groups or columns on the right, a valid active tab everywhere.
 */
export function normalize(input: PanelLayout): PanelLayout {
  const seen = new Set<TabId>();
  const keep = (tabs: TabId[]) => tabs.filter((t) => ALL_TABS.includes(t) && !seen.has(t) && seen.add(t));
  const fix = (g: PanelGroup): PanelGroup => {
    const tabs = keep(g.tabs ?? []);
    return { tabs, active: tabs.includes(g.active as TabId) ? g.active : (tabs[0] ?? null), size: g.size > 0 ? g.size : 1 };
  };
  const under = fix(input.under ?? group([]));
  let columns = (input.columns ?? [])
    .map((c) => ({ groups: (c.groups ?? []).map(fix).filter((g) => g.tabs.length), size: c.size > 0 ? c.size : 1 }))
    .filter((c) => c.groups.length);
  const missing = ALL_TABS.filter((t) => !seen.has(t));
  if (missing.length) {
    if (!columns.length) columns = [{ groups: [group([])], size: 1 }];
    const last = columns.at(-1)!.groups.at(-1)!;
    last.tabs.push(...missing);
    last.active ??= last.tabs[0];
  }
  return { under, columns };
}

/** Parses a saved layout, falling back to the default (from the old tab order) when it's missing or broken. */
export function loadLayout(saved: string, tabOrder: readonly string[]): PanelLayout {
  if (saved) {
    try {
      return normalize(JSON.parse(saved) as PanelLayout);
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
  const sameGroupBefore = target.tabs.indexOf(tab);
  take(next, tab);
  let at = index ?? target.tabs.length;
  if (sameGroupBefore >= 0 && sameGroupBefore < at) at--;
  target.tabs.splice(Math.max(0, Math.min(at, target.tabs.length)), 0, tab);
  target.active = tab;
  return normalize(next);
}

/**
 * Splits a right-side group: `below` adds a group under it in its column,
 * `beside` adds a column to its right. The tab moves into the new group.
 */
export function splitWith(layout: PanelLayout, tab: TabId, at: GroupRef, where: "below" | "beside"): PanelLayout {
  if (at === "under" || sideGroupCount(layout) >= MAX_SIDE_GROUPS) return layout;
  const next = clone(layout);
  const column = next.columns[at.column];
  if (!column?.groups[at.group]) return layout;
  take(next, tab);
  if (where === "below") column.groups.splice(at.group + 1, 0, group([tab], column.groups[at.group].size));
  else next.columns.splice(at.column + 1, 0, { groups: [group([tab])], size: column.size });
  return normalize(next);
}

export function showTab(layout: PanelLayout, tab: TabId): PanelLayout {
  const next = clone(layout);
  for (const { group: g } of allGroups(next)) if (g.tabs.includes(tab)) g.active = tab;
  return next;
}

/** Every tab in layout order, for portrait's single strip. */
export const flatTabs = (layout: PanelLayout): TabId[] => allGroups(layout).flatMap(({ group: g }) => g.tabs);
