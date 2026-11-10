import { state, LOG_LIMIT, type ICEntry, type OOCEntry } from "./state";

const pushLimited = <T>(log: T[], entry: T) => {
  log.push(entry);
  if (log.length > LOG_LIMIT) log.splice(0, log.length - LOG_LIMIT);
};

export const logOOC = (entry: OOCEntry) => pushLimited(state.oocLog, entry);
export const logIC = (entry: ICEntry) => pushLimited(state.icLog, entry);

/** A divider line in the IC log, e.g. "Connected". */
export const logNotice = (text: string) => logIC({ kind: "notice", text, time: Date.now() });

/** Whether `message` contains one of the callwords (case-insensitive). */
export function matchesCallword(message: string, callwords: readonly string[]) {
  const lower = message.toLowerCase();
  return callwords.some((word) => word.trim() !== "" && lower.includes(word.trim().toLowerCase()));
}

/** The name an IC entry is shown under. */
export const speakerName = (entry: Extract<ICEntry, { kind: "message" }>, useShownames: boolean) =>
  (useShownames && entry.showname) || entry.character;

/** AO's `~~` prefix centres the chatbox text; it is not part of the message. */
export const messageText = (message: string) => (message.startsWith("~~") ? message.slice(2) : message);

const clock = (time: number) =>
  new Date(time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

/** The IC log as plain text, one line per entry. */
export function icLogAsText(entries: readonly ICEntry[], useShownames: boolean) {
  return entries
    .map((e) => {
      const at = `[${clock(e.time)}]`;
      switch (e.kind) {
        case "message":
          return `${at} ${speakerName(e, useShownames)}: ${messageText(e.message)}`;
        case "music":
          return `${at} ${e.showname || "Someone"} played ${e.track}${e.looping ? " (looping)" : ""}`;
        case "notice":
          return `${at} -- ${e.text} --`;
      }
    })
    .join("\n");
}
