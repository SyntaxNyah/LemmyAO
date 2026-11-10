import { state } from "../core/state";
import { icLogAsText } from "../core/log";
import { safeHtmlTags } from "../escaping";
import downloadFile from "../services/downloadFile";

/** Downloads the IC log as plain text or a standalone HTML page. */
export function exportLog(format: string) {
  const timestamp = new Date().toISOString().replace(/[T:.]/g, "-").slice(0, 19);
  const filename = `lemmyao-log-${timestamp}`;
  const text = icLogAsText(state.icLog);

  if (format === "txt") {
    downloadFile(text, `${filename}.txt`);
  } else if (format === "html") {
    const lines = text
      .split("\n")
      .map((line) => `<p>${safeHtmlTags(line)}</p>`)
      .join("\n");
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>LemmyAO chat log, ${new Date().toLocaleString()}</title>
  <style>
    body { background: #1a1a1a; color: #e0e0e0; font-family: sans-serif; padding: 20px; }
    p { line-height: 1.4em; border-top: 1px solid rgba(255,255,255,0.1); margin: 0; padding: 2px 0; white-space: pre-wrap; }
  </style>
</head>
<body>
${lines}
</body>
</html>`;
    downloadFile(html, `${filename}.html`, "text/html;charset=utf-8");
  }
}
