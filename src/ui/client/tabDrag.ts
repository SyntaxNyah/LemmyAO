import { moveTab, splitWith, type GroupRef, type Side } from "./panelLayout";
import { panels, savePanels, tabDrag } from "./layout";
import type { TabId } from "./tabs";

/** Groups are addressed in the DOM by their path ("g.0.1"). */
export const groupKey = (ref: GroupRef) => ["g", ...ref].join(".");
const parseKey = (key: string): GroupRef => key.split(".").slice(1).map(Number);

// The edge of a panel area that splits it rather than moving the tab into it.
const SPLIT_EDGE = 0.25;
// The band along the screen's edge that adds a full-height or full-width panel.
export const SCREEN_EDGE = 16;

/** Half of `r` on `side`, previewing where a new panel goes. */
function half(r: DOMRect, side: Side, share = 0.5) {
  const w = r.width * share;
  const h = r.height * share;
  if (side === "left") return new DOMRect(r.left, r.top, w, r.height);
  if (side === "right") return new DOMRect(r.right - w, r.top, w, r.height);
  if (side === "top") return new DOMRect(r.left, r.top, r.width, h);
  return new DOMRect(r.left, r.bottom - h, r.width, h);
}

/** The side of `r` within `band` (a fraction of its size, or pixels) of the point, nearest first. */
function edgeOf(r: DOMRect, x: number, y: number, band: (size: number) => number): Side | null {
  const near = [
    { side: "left" as const, d: (x - r.left) / band(r.width) },
    { side: "right" as const, d: (r.right - x) / band(r.width) },
    { side: "top" as const, d: (y - r.top) / band(r.height) },
    { side: "bottom" as const, d: (r.bottom - y) / band(r.height) },
  ].filter((e) => e.d >= 0 && e.d < 1);
  return near.sort((a, b) => a.d - b.d)[0]?.side ?? null;
}

function targetAt(x: number, y: number): typeof tabDrag.target {
  const tree = document.querySelector(".tree")?.getBoundingClientRect();
  const screenSide = tree && edgeOf(tree, x, y, () => SCREEN_EDGE);
  if (tree && screenSide) {
    return { kind: "split", at: [], side: screenSide, rect: half(tree, screenSide, 0.25), label: `New panel at the ${screenSide} of the screen` };
  }
  for (const el of document.elementsFromPoint(x, y)) {
    const strip = (el as HTMLElement).closest<HTMLElement>("[data-drop-strip]");
    if (strip) {
      const tabs = [...strip.querySelectorAll<HTMLElement>("[data-tab]")];
      const rects = tabs.map((t) => t.getBoundingClientRect());
      const index = rects.filter((r) => r.left + r.width / 2 < x).length;
      const area = strip.getBoundingClientRect();
      // An insertion bar between the tabs where the dragged one would go.
      const at = index < rects.length ? rects[index].left - 1 : (rects.at(-1)?.right ?? area.left) + 1;
      const marker = new DOMRect(at - 1.5, area.top + 4, 3, area.height - 8);
      return { kind: "into", group: parseKey(strip.dataset.dropStrip!), index, rect: area, label: "", marker };
    }
    const slot = (el as HTMLElement).closest<HTMLElement>("[data-drop-slot]");
    if (slot) {
      const group = parseKey(slot.dataset.dropSlot!);
      const r = slot.getBoundingClientRect();
      const side = edgeOf(r, x, y, (size) => size * SPLIT_EDGE);
      if (side) return { kind: "split", at: group, side, rect: half(r, side), label: `New panel ${side === "left" || side === "right" ? `on the ${side}` : side === "top" ? "above" : "below"}` };
      return { kind: "into", group, index: Infinity, rect: r, label: "Move here" };
    }
  }
  return null;
}

/** Starts dragging `tab` from a pointerdown; it only counts as a drag once the pointer moves. */
export function startTabDrag(tab: TabId, down: PointerEvent, onClick: () => void) {
  const from = down.currentTarget as HTMLElement;
  from.setPointerCapture(down.pointerId);
  let dragging = false;

  const move = (e: PointerEvent) => {
    if (!dragging && Math.hypot(e.clientX - down.clientX, e.clientY - down.clientY) < 6) return;
    if (!dragging) document.documentElement.classList.add("dragging-tab");
    dragging = true;
    tabDrag.tab = tab;
    tabDrag.x = e.clientX;
    tabDrag.y = e.clientY;
    tabDrag.target = targetAt(e.clientX, e.clientY);
  };
  const end = () => {
    from.removeEventListener("pointermove", move);
    from.removeEventListener("pointerup", end);
    from.removeEventListener("pointercancel", end);
    document.documentElement.classList.remove("dragging-tab");
    const target = tabDrag.target;
    tabDrag.tab = null;
    tabDrag.target = null;
    if (!dragging) return onClick();
    if (!target) return;
    const index = target.kind === "into" && Number.isFinite(target.index) ? target.index : undefined;
    savePanels(
      target.kind === "into" ? moveTab(panels.value, tab, target.group, index) : splitWith(panels.value, tab, target.at, target.side),
    );
  };
  from.addEventListener("pointermove", move);
  from.addEventListener("pointerup", end);
  from.addEventListener("pointercancel", end);
}
