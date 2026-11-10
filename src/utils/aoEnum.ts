// aolib-ts enums are string objects declared in AO wire-numeric order (with
// `unused_N` fillers where the protocol skips values), so the Nth entry is the
// member for wire number N. The legacy DOM still expresses some as numbers
// (textcolor option values, data-shout), so convert at the aolib boundary.
export function enumByNumber<T extends Record<string, string>>(
  e: T,
  n: number,
): T[keyof T] {
  return Object.values(e)[n] as T[keyof T];
}
