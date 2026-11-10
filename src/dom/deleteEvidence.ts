import { client } from "../client";
import { cancelEvidence } from "./cancelEvidence";
import { deleteEvidence as sendDeleteEvidence } from "../core/commands";

/**
 * Delete selected evidence.
 */
export function deleteEvidence() {
  const id = client.selectedEvidence;
  sendDeleteEvidence(id);
  cancelEvidence();
}
