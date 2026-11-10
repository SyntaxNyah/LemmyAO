import { computed, watch } from "vue";
import { state } from "../../core/state";
import { loadCharIni } from "../../core/character";
import { charSelectOpen } from "./overlays";

// Warms char.ini for the characters in our area so their first IC message
// starts sooner. Low priority, and held back while we pick or load our own.
const areaCharacters = computed(() => {
  if (charSelectOpen.value || state.self.characterLoad === "loading") return [];
  const names = Object.values(state.players)
    .filter((p) => p.area === state.self.areaId && p.id !== state.server.playerId && p.charName)
    .map((p) => p.charName);
  return [...new Set(names)];
});

watch(areaCharacters, (names) => names.forEach((name) => void loadCharIni(name, "low")), { immediate: true });
