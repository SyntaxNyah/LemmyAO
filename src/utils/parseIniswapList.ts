/**
 * Parse an iniswap.txt asset file: one iniswap folder name per line.
 * Blank lines and lines starting with # (comments) are skipped.
 */
export function parseIniswapList(data: string): string[] {
  return data
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("#"));
}
