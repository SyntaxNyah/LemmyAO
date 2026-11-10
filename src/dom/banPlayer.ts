import { removePlayer } from "../core/commands";

/**
 * Tries to ban a player from the playerlist
 * @param {Number} id the players id
 */
export function banPlayer(id: number) {
  const reason = prompt("Please enter the reason", "Being annoying");
  const duration = Number(prompt("Please enter the ban duration in minutes", "60"));

  removePlayer(id, reason, duration);
}

/**
 * Tries to kick a player from the playerlist
 * @param {Number} id the players id
 */
export function kickPlayer(id: number) {
  const reason = prompt("Please enter the reason", "Being annoying");

  removePlayer(id, reason);
}
