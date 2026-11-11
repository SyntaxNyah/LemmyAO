import { moveTab, splitWith, type GroupRef } from "./panelLayout";
import { panels, savePanels, tabDrag } from "./layout";
import type { TabId } from "./tabs";

/** Groups are addressed in the DOM as "under", or "side" followed by their path ("side.0.1"). */
export const groupKey = (ref: GroupRef) => (ref === "under" ? "under" : ["side", ...ref].join("."));
const parseKey = (key: string): GroupRef => (key === "under" ? "under" : key.split(".").slice(1).map(Number));

// The edge of a panel area that splits it rather than moving the tab into it.
const SPLIT_EDGE = 0.25;

function targetAt(x: number, y: number): typeof tabDrag.target {
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
      if (group !== "under" && x > r.right - r.width * SPLIT_EDGE) {
        return { kind: "split", group, where: "beside", rect: new DOMRect(r.left + r.width / 2, r.top, r.width / 2, r.height), label: "New panel beside" };
      }
      if (group !== "under" && y > r.bottom - r.height * SPLIT_EDGE) {
        return { kind: "split", group, where: "below", rect: new DOMRect(r.left, r.top + r.height / 2, r.width, r.height / 2), label: "New panel below" };
      }
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
      target.kind === "into" ? moveTab(panels.value, tab, target.group, index) : splitWith(panels.value, tab, target.group, target.where),
    );
  };
  from.addEventListener("pointermove", move);
  from.addEventListener("pointerup", end);
  from.addEventListener("pointercancel", end);
}
