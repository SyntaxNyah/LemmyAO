import { settings } from "../../core/settings";
import { loadLayout, normalize, type PanelLayout } from "./panelLayout";
import { DEFAULT_TABS } from "./tabs";

/** Marks a JSON file as a LemmyAO layout, not just any JSON. */
export const LAYOUT_FORMAT = "lemmyao-layout";
/** Bumped only when an older client could not read the new shape correctly. */
export const LAYOUT_VERSION = 1;

export interface LayoutFile {
  format: typeof LAYOUT_FORMAT;
  version: number;
  /** The landscape tree: groups of tabs, split into rows and columns. */
  panelLayout: PanelLayout;
  /** Portrait's viewport height as a fraction of the window; 0 keeps the default. */
  layoutViewportPortrait: number;
}

const TABS = new Set<string>(DEFAULT_TABS.map((tab) => tab.id));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clampPortrait = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** Whether a saved tree has at least one tab this client knows about. */
function hasKnownTab(node: unknown): boolean {
  if (!isRecord(node)) return false;
  if (Array.isArray(node.tabs) && node.tabs.some((tab) => typeof tab === "string" && TABS.has(tab))) return true;
  if (Array.isArray(node.children) && node.children.some(hasKnownTab)) return true;
  if ("root" in node && hasKnownTab(node.root)) return true;
  // Earlier versions kept the viewport fixed, with a group under it and a tree or columns beside it.
  if ("under" in node && hasKnownTab(node.under)) return true;
  if ("side" in node && hasKnownTab(node.side)) return true;
  return (
    Array.isArray(node.columns) &&
    node.columns.some((column) => isRecord(column) && Array.isArray(column.groups) && column.groups.some(hasKnownTab))
  );
}

/** A layout as a shareable file, normalized so every tab is present exactly once. */
export function layoutFileFor(layout: PanelLayout, portrait: number): LayoutFile {
  return {
    format: LAYOUT_FORMAT,
    version: LAYOUT_VERSION,
    panelLayout: normalize(layout),
    layoutViewportPortrait: clampPortrait(portrait),
  };
}

/** The layout currently in use. A fresh install exports the default layout. */
export function layoutFileData(): LayoutFile {
  return layoutFileFor(loadLayout(settings.panelLayout, settings.tabOrder), settings.layoutViewportPortrait);
}

export function layoutFileText(): string {
  return `${JSON.stringify(layoutFileData(), null, 2)}\n`;
}

/**
 * Reads a layout file. Accepts the wrapped format above, a raw `panelLayout`
 * tree, and the legacy `{ under, side }` / `{ under, columns }` shapes.
 * Throws an Error whose message is safe to show to the player.
 */
export function parseLayoutFile(text: string): LayoutFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!isRecord(parsed)) throw new Error("That file doesn't contain a layout.");

  if ("format" in parsed && parsed.format !== LAYOUT_FORMAT) {
    throw new Error("That file isn't a LemmyAO layout.");
  }
  if ("version" in parsed) {
    const version = Number(parsed.version);
    if (!Number.isFinite(version) || version > LAYOUT_VERSION) {
      throw new Error("That layout was made by a newer version of LemmyAO.");
    }
  }

  let saved: unknown;
  if ("panelLayout" in parsed) {
    saved = parsed.panelLayout;
    if (typeof saved === "string") {
      try {
        saved = JSON.parse(saved);
      } catch {
        throw new Error("That file doesn't contain a valid layout.");
      }
    }
  } else if ("root" in parsed || "under" in parsed) {
    // A raw panelLayout value, e.g. copied out of storage or an older export.
    saved = parsed;
  } else {
    throw new Error("That file doesn't contain a layout.");
  }

  // normalize() would happily turn {} into one group of every tab, so require a real tab first.
  if (!isRecord(saved) || !hasKnownTab(saved)) {
    throw new Error("That file doesn't contain a LemmyAO layout.");
  }

  return {
    format: LAYOUT_FORMAT,
    version: LAYOUT_VERSION,
    panelLayout: loadLayout(JSON.stringify(saved), []),
    layoutViewportPortrait: clampPortrait(parsed.layoutViewportPortrait),
  };
}
