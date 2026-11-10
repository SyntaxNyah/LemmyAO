import Client, { client, setClient } from "../client";
import queryParser from "../utils/queryParser";
const { ip: serverIP, connect } = queryParser();

export function reconnect() {
  // Same fallback as the first connection.
  const connectionString = connect || (serverIP ? `${location.protocol === "https:" ? "wss" : "ws"}://${serverIP}` : "");
  const { hdid } = client.connection.options;
  client.cleanup();

  const newClient = new Client(connectionString, hdid);
  setClient(newClient);
  newClient.connect();
}
