/**
 * Parses the `#pair_select` value into a paired character ID.
 *
 * AO character IDs are 0-based, so the old `Number(value) || -1` turned the
 * first character on the server (id 0) into "no pair". That also stopped
 * aolib from packing `paired_order`: the suffix is only emitted when
 * `paired_charid` is a real partner. The "None" option is `-1`; an empty
 * value, a non-integer, or a negative value means no pair.
 */
export function parsePairedCharID(value: string): number {
  const trimmed = value.trim();
  if (trimmed === "") return -1;
  const id = Number(trimmed);
  return Number.isInteger(id) && id >= 0 ? id : -1;
}
