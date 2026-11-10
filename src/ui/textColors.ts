import { TextColor } from "aolib-ts";

/** Display label and CSS colour for each AO text colour, tuned to read on both themes. */
export const TEXT_COLORS: Record<TextColor, { label: string; css: string }> = {
  [TextColor.white]: { label: "White", css: "var(--text)" },
  [TextColor.green]: { label: "Green", css: "#22c55e" },
  [TextColor.red]: { label: "Red", css: "#ef4444" },
  [TextColor.orange]: { label: "Orange", css: "#f97316" },
  [TextColor.blue]: { label: "Blue", css: "#3b82f6" },
  [TextColor.yellow]: { label: "Yellow", css: "#eab308" },
  [TextColor.pink]: { label: "Pink", css: "#ec4899" },
  [TextColor.cyan]: { label: "Cyan", css: "#06b6d4" },
  [TextColor.grey]: { label: "Grey", css: "#9ca3af" },
  [TextColor.rainbow]: { label: "Rainbow", css: "#a855f7" },
};

export const RAINBOW = "linear-gradient(90deg, #ef4444, #eab308, #22c55e, #3b82f6, #ec4899)";
