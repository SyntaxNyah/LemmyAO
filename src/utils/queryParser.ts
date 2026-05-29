/* eslint @typescript-eslint/no-explicit-any: "warn" */

interface QueryParams {
  ip: string;
  connect: string;
  mode: string;
  asset: string;
  theme: string;
  serverName: string;
  char: string;
  area: string;
  /**
   * Feature gate for the JSON wire format. While Athena/akashi JSON
   * support is still being shaken out, the client only opts in when
   * the caller explicitly passes `?json_mode=true`. Without the
   * flag, the client stays on fanta even if the server advertises
   * JSON via `decryptor("JSON")`.
   */
  json_mode: boolean;
}

const queryParser = (): QueryParams => {
  const protocol = window.location.protocol;
  const urlParams = new URLSearchParams(window.location.search);
  const queryParams = {
    ip: urlParams.get("ip") || "",
    connect: urlParams.get("connect") || "",
    mode: urlParams.get("mode") || "join",
    asset: urlParams.get("asset") || `${protocol}//attorneyoffline.de/base/`,
    theme: urlParams.get("theme") || "default",
    serverName: urlParams.get("serverName") || "Attorney Online session",
    char: urlParams.get("char") || "",
    area: urlParams.get("area") || "",
    json_mode: urlParams.get("json_mode") === "true",
  };
  return queryParams as QueryParams;
};
export default queryParser;
