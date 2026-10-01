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
   * Force the fanta wire even when the server advertises JSON via
   * `decryptor("JSON")`. Maps to aolib's `disableAutoJson` session option.
   * JSON negotiation is on by default; pass `?disableJson=true` to opt out.
   */
  disableJson: boolean;
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
    disableJson: urlParams.get("disableJson") === "true",
  };
  return queryParams as QueryParams;
};
export default queryParser;
