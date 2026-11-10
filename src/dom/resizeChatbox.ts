import { els } from "../viewport/elements";
import { CHATBOX } from "../client";
/**
 * Set the font size for the chatbox
 */
export function resizeChatbox() {
  const chatContainerBox = els.chatContainer;
  const clockBox = els.clock;
  const trackstatusBox = els.trackStatus;

  const gameHeight = els.background.offsetHeight;

  chatContainerBox.style.fontSize = `${(gameHeight * 0.0521).toFixed(1)}px`;
  clockBox.style.fontSize = `${(gameHeight * 0.0521).toFixed(1)}px`;
  trackstatusBox.style.fontSize = `${(gameHeight * 0.0521).toFixed(1)}px`;

  const trackstatus = els.trackStatusText;
  trackstatus.style.width = trackstatus.offsetWidth - 1 + "px";

  //name spacing
  const namePlate = els.name;
  if (CHATBOX == "aa" && namePlate.innerText.length < 5) {
    namePlate.style.letterSpacing = "0.2em";
  } else {
    namePlate.style.letterSpacing = "normal";
  }

  //clock
  const now = new Date();
  let weekday = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const month = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  els.clockMonth.innerText =
    month[now.getMonth()];
  if (CHATBOX == "acww") {
    weekday = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    els.clockWeekday.innerText =
      weekday[now.getDay()];
    els.clockDate.innerText =
      now.getDay() + "/" + now.getMonth();
    els.clockTime.innerText =
      now.getHours() + ":" + now.getMinutes();
  } else if (CHATBOX == "key") {
    weekday = ["Sun.", "Mon.", "Tue.", "Wed.", "Thu.", "Fri.", "Sat."];
    els.clockWeekday.innerText =
      weekday[now.getDay()];
    els.clockDate.innerText = String(
      now.getDate(),
    );
  }
}
