export type TabId = "emotes" | "log" | "ooc" | "areas" | "music" | "background" | "evidence" | "players" | "menu";

export interface TabDef {
  id: TabId;
  label: string;
}

export const DEFAULT_TABS: TabDef[] = [
  { id: "emotes", label: "IC Options" },
  { id: "log", label: "Chatlog" },
  { id: "ooc", label: "OOC" },
  { id: "areas", label: "Areas" },
  { id: "music", label: "Music" },
  { id: "players", label: "Players" },
  { id: "background", label: "Background" },
  { id: "evidence", label: "Evidence" },
  { id: "menu", label: "Menu" },
];

/** The tabs in the saved order; unknown ids are dropped and new tabs go last. */
export function orderTabs(order: readonly string[]): TabDef[] {
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i < 0 ? order.length + DEFAULT_TABS.findIndex((t) => t.id === id) : i;
  };
  return [...DEFAULT_TABS].sort((a, b) => rank(a.id) - rank(b.id));
}
