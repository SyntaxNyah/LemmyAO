// Per-shout asset stem, keyed by the aolib ShoutModifier member. `none` has no
// bubble/sfx.
export const SHOUTS: Record<string, string | undefined> = {
  none: undefined,
  hold_it: "holdit",
  objection: "objection",
  take_that: "takethat",
  custom: "custom",
};
