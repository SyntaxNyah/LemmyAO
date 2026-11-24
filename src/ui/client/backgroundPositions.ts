import { Side } from "aolib-ts";
import { positions } from "../../viewport/constants/positions";

export interface BackgroundPosition {
  side: Side;
  label: string;
  /** Image base inside a background folder, without the extension. */
  image: string;
}

/** Every position the court can show, with the image each one uses. */
export const BACKGROUND_POSITIONS: BackgroundPosition[] = [
  { side: Side.def, label: "Defense", image: positions.def.bg },
  { side: Side.pro, label: "Prosecution", image: positions.pro.bg },
  { side: Side.hld, label: "Defense helper", image: positions.hld.bg },
  { side: Side.hlp, label: "Prosecution helper", image: positions.hlp.bg },
  { side: Side.wit, label: "Witness", image: positions.wit.bg },
  { side: Side.jud, label: "Judge", image: positions.jud.bg },
  { side: Side.jur, label: "Jury", image: positions.jur.bg },
  { side: Side.sea, label: "Seance", image: positions.sea.bg },
];

export function backgroundPositionFor(side: Side): BackgroundPosition | undefined {
  return BACKGROUND_POSITIONS.find((position) => position.side === side);
}

/** The positions whose images exist in a folder; all standard positions when the listing is unavailable. */
export function availableBackgroundPositions(files: readonly string[]): BackgroundPosition[] {
  if (!files.length) return BACKGROUND_POSITIONS;
  const stems = new Set(files.map((file) => file.replace(/\.[^.]+$/, "").toLowerCase()));
  const present = BACKGROUND_POSITIONS.filter((position) => stems.has(position.image));
  return present.length ? present : BACKGROUND_POSITIONS;
}

/** The actual file in a folder listing for a position, if known. */
export function backgroundPositionFile(position: BackgroundPosition, files: readonly string[]): string | undefined {
  return files.find((file) => file.replace(/\.[^.]+$/, "").toLowerCase() === position.image);
}