import { client } from "../client";
import { renderPlayerList } from "./renderPlayerList";
import { changeArea } from "../core/commands";
/**
 * Triggered when an item on the area list is clicked.
 * @param {HTMLElement} el
 */
export function area_click(el: HTMLElement) {
  changeArea(Number(el.id.substring(4)));
  client.area = Number(el.id.substring(4));
  renderPlayerList();
}
