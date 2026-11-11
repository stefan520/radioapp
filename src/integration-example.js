// EKSEMPEL: kald dette, hver gang radioens metadata skifter sang.
//
// import { updateNowPlayingCover } from "./cover-art.js";
//
// const coverEl = document.querySelector("#now-playing-cover");
//
// async function renderNowPlaying(song) {
//   document.querySelector("#song-title").textContent = song.title || "";
//   document.querySelector("#song-artist").textContent = song.artist || "";
//
//   const key = `${song.artist || ""}|${song.title || ""}`
//     .toLowerCase()
//     .trim();
//
//   coverEl.dataset.trackKey = key;
//
//   await updateNowPlayingCover({
//     imgElement: coverEl,
//     title: song.title,
//     artist: song.artist,
//     stationLogo: currentStation.logo
//   });
// }
//
// HTML:
// <img
//   id="now-playing-cover"
//   alt="Albumcover"
//   width="160"
//   height="160"
//   loading="lazy"
//   decoding="async"
// />
