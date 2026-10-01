import { client } from "../client";

export function changeMusicVolume(volume: number = -1) {
  const clientVolume = Number(
    (<HTMLInputElement>document.getElementById("client_mvolume")).value,
  );
  const musicVolume = volume === -1 ? clientVolume : volume;
  for (const channel of Object.values(client.viewport.music)) {
    channel.volume = musicVolume;
  }
  localStorage.setItem("musicVolume", String(musicVolume));
}
