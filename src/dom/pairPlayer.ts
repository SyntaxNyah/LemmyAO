import { client } from "../client";
import { draft, sendOOC } from "../core/commands";

/**
 * Pair with a player on both supported pathways at once:
 *  1. Server-side OOC command `/pair <playerID>` (used by servers that
 *     implement bidirectional pairing announcements).
 *  2. The draft's pair partner (the canonical AO `paired_charid` route,
 *     embedded in the next outgoing IC message). This works on any vanilla
 *     AO server even when the OOC command is unknown.
 */
export function pairPlayer(id: number) {
  sendOOC(`/pair ${id}`);

  const target = client.playerlist?.get(id);
  if (target && Number.isInteger(target.charId) && target.charId >= 0) {
    draft.pair.charId = target.charId;
  }
}
