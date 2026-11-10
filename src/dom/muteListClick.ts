import { client } from "../client";
import { setMuted } from "../core/commands";
/**
 * Triggered when a character in the mute list is clicked
 * @param {MouseEvent} event
 */
export function mutelist_click(_event: Event) {
  const mutelist = <HTMLSelectElement>document.getElementById("mute_select");
  const selected_character = mutelist.options[mutelist.selectedIndex];

  if (client.chars[selected_character.value].muted === false) {
    client.chars[selected_character.value].muted = true;
    setMuted(Number(selected_character.value), true);
    selected_character.text = `${client.chars[selected_character.value].name} (muted)`;
    console.info(`muted ${client.chars[selected_character.value].name}`);
  } else {
    client.chars[selected_character.value].muted = false;
    setMuted(Number(selected_character.value), false);
    selected_character.text = client.chars[selected_character.value].name;
  }
}
