import Client, { client, setClient } from "../client";
import queryParser from "../utils/queryParser";
const { ip: serverIP, connect } = queryParser();

/**
 * Triggered when the reconnect button is pushed.
 */
export function ReconnectButton() {
  document.getElementById("client_errortext")!.textContent = "Reconnecting...";

  // Build the connection string the same way the initial connection does
  let connectionString = connect;
  if (!connectionString && serverIP) {
    // if connectionString is not set, try IP
    // and just guess ws, though it could be wss
    connectionString = `ws://${serverIP}`;
  }

  const { hdid } = client.connection.options;
  client.cleanup();

  const newClient = new Client(connectionString, hdid);
  setClient(newClient);
  newClient.connect();
}
