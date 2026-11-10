import { ref, watch } from "vue";
import { state } from "../../core/state";
import { on } from "../../core/events";
import queryParser from "../../utils/queryParser";

const { mode, char: autoChar } = queryParser();

/** Whether character select is showing. */
export const charSelectOpen = ref(false);

// Watchers don't pick a character, and ?char= picks one automatically.
on("joined", () => {
  if (mode !== "watch" && !autoChar && state.self.charId < 0) charSelectOpen.value = true;
});

watch(
  () => state.self.charId,
  (id) => {
    if (id >= 0) charSelectOpen.value = false;
  },
);
