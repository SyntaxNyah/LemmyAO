export type TabId =
  | "viewport"
  | "emotes"
  | "log"
  | "ooc"
  | "areas"
  | "music"
  | "background"
  | "evidence"
  | "players"
  | "settings";

export interface TabDef {
  id: TabId;
  label: string;
}

export const DEFAULT_TABS: TabDef[] = [
  { id: "viewport", label: "Viewport" },
  { id: "emotes", label: "IC Options" },
  { id: "log", label: "Chatlog" },
  { id: "ooc", label: "OOC" },
  { id: "areas", label: "Areas" },
  { id: "music", label: "Music" },
  { id: "players", label: "Players" },
  { id: "background", label: "Background" },
  { id: "evidence", label: "Evidence" },
  { id: "settings", label: "Settings" },
];
