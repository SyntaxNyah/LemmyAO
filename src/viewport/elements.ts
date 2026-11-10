import { isFullView, type Side } from "aolib-ts";

// The viewport's markup (./markup.ts) uses fixed ids, shared with the chatbox skins.
/** A viewport element by id, for the ones that depend on a side. */
export const element = <T extends HTMLElement = HTMLElement>(id: string) => {
  const found = document.getElementById(id);
  if (!found) throw new Error(`viewport element #${id} is missing`);
  return found as T;
};

/** The viewport's elements by role; valid once the viewport is mounted. */
export const els = {
  get background() { return element<HTMLDivElement>("client_background"); },
  get gameWindow() { return element<HTMLDivElement>("client_gamewindow"); },
  get fullView() { return element<HTMLDivElement>("client_fullview"); },
  get classicView() { return element<HTMLDivElement>("client_classicview"); },
  get court() { return element<HTMLImageElement>("client_court"); },
  get foreground() { return element<HTMLImageElement>("client_fg"); },
  get evidence() { return element<HTMLImageElement>("client_evi"); },
  get testimony() { return element<HTMLImageElement>("client_testimony"); },
  get shout() { return element<HTMLImageElement>("client_shout"); },
  get chatContainer() { return element<HTMLDivElement>("client_chatcontainer"); },
  get name() { return element<HTMLDivElement>("client_name"); },
  get innerName() { return element<HTMLParagraphElement>("client_inner_name"); },
  get chat() { return element<HTMLDivElement>("client_chat"); },
  get innerChat() { return element<HTMLParagraphElement>("client_inner_chat"); },
  get chatWaiting() { return element<HTMLDivElement>("client_chatwaiting"); },
  get trackStatus() { return element<HTMLDivElement>("client_trackstatus"); },
  get trackStatusText() { return element<HTMLElement>("client_trackstatustext"); },
  get clock() { return element<HTMLDivElement>("client_clock"); },
  get clockDate() { return element<HTMLParagraphElement>("client_clock_date"); },
  get clockTime() { return element<HTMLParagraphElement>("client_clock_time"); },
  get clockMonth() { return element<HTMLParagraphElement>("client_clock_month"); },
  get clockWeekday() { return element<HTMLParagraphElement>("client_clock_weekday"); },
  get sfxAudio() { return element<HTMLAudioElement>("client_sfxaudio"); },
};

/**
 * A character layer: full-view sides (def, pro, wit) have their own on the
 * panning court, every other side shares the classic one.
 */
export function charLayer(side: Side, pair = false) {
  const prefix = isFullView(side) ? `client_${side}_` : "client_";
  return {
    container: element<HTMLDivElement>(`${prefix}${pair ? "pair_char" : "char"}`),
    img: element<HTMLImageElement>(`${prefix}${pair ? "pair_img" : "char_img"}`),
  };
}
