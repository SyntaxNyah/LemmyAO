export interface BackgroundChoice {
  name: string;
  favourite: boolean;
  current: boolean;
}

/**
 * Current background first, then favorites, then alphabetical order, matching
 * the character picker. Favorites stay pinned above the rest.
 */
export function orderBackgrounds(choices: readonly BackgroundChoice[]): BackgroundChoice[] {
  return [...choices].sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      Number(b.favourite) - Number(a.favourite) ||
      a.name.localeCompare(b.name),
  );
}