import type { InjectionKey } from "vue";

/** Moves focus to the IC message bar, provided by the client shell. */
export const focusICInput: InjectionKey<() => void> = Symbol("focusICInput");
