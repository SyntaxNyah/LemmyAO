import { cancelEvidence } from "./cancelEvidence";
import { addEvidence as sendAddEvidence } from "../core/commands";

/**
 * Add evidence.
 */
export function addEvidence() {
  const evidence_select = <HTMLSelectElement>(
    document.getElementById("evi_select")
  );
  sendAddEvidence({
    name: (<HTMLInputElement>document.getElementById("evi_name")).value,
    description: (<HTMLInputElement>document.getElementById("evi_desc")).value,
    image:
      evidence_select.selectedIndex === 0
        ? (<HTMLInputElement>document.getElementById("evi_filename")).value
        : evidence_select.options[evidence_select.selectedIndex].text,
  });
  cancelEvidence();
}
