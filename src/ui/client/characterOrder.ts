export interface CharacterChoice {
  id: number;
  name: string;
  taken: boolean;
  favourite: boolean;
  current: boolean;
}

/**
 * Current character first, so the one you just got (including from /randomchar)
 * is easy to favorite, then favorites, then roster order.
 */
export function orderCharacters(choices: readonly CharacterChoice[]): CharacterChoice[] {
  return [...choices].sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      Number(b.favourite) - Number(a.favourite) ||
      a.id - b.id,
  );
}