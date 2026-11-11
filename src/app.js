import { getFreeCoverArt } from "./cover-art.js";

const stations = [
  { id:"retro", name:"Retro-Radio", short:"RETRO", subtitle:"Danmarks Retro-Radio", stream:"https://streammp3.retro-radio.dk/retro-mp3", meta:"retro" },
  { id:"retrojul", name:"Retro-Radio JUL", short:"JUL", subtitle:"Julemusik i november og december", stream:"https://tx-1.retro-radio.dk/TX-1", meta:"retrojul" },
  { id:"p1", name:"DR P1", short:"P1", subtitle:"Nyheder, debat og aktualitet", stream:"https://live-icy.dr.dk/A/A03H.mp3" },
  { id:"p2", name:"DR P2", short:"P2", subtitle:"Klassisk musik og kultur", stream:"https://live-icy.dr.dk/A/A04H.mp3" },
  { id:"p3", name:"DR P3", short:"P3", subtitle:"Pop, hits og nye lyde", stream:"https://live-icy.dr.dk/A/A05H.mp3" },
  { id:"p4", name:"DR P4 Østjylland", short:"P4", subtitle:"Lokalt fra Østjylland", stream:"https://live-icy.dr.dk/A/A14H.mp3" },
  { id:"p5", name:"DR P5", short:"P5", subtitle:"Musikken du kender", stream:"https://live-icy.dr.dk/A/A25H.mp3" },
  { id:"soft", name:"Radio Soft", short:"SOFT", subtitle:"Blødere pop og klassikere", stream:"https://live-bauerdk.sharp-stream.com/radiosoft_dk_mp3" },
  { id:"popfm", name:"POP FM", short:"POP", subtitle:"Klassikere og store hits", stream:"https://live-bauerdk.sharp-stream.com/popfm_dk_mp3" },
  { id:"nova", name:"NOVA", short:"NOVA", subtitle:"De største hits", stream:"https://live-bauerdk.sharp-stream.com/nova128.mp3" },
  { id:"abc", name:"Radio ABC", short:"ABC", subtitle:"Vi gi'r dig hits · Randers", stream:"https://radioserver.dk/abc", meta:"abc" }
];

const $ = (selector) => document.querySelector(selector);
const audio = $("#audio"), rail = $("#stationRail"), playBtn = $("#playBtn");
let current = 0, playback = "ready", playRequest = 0, metadataRequest = 0;
let lastVolume = .72, deferredInstall = null, photoUrls = [], photoIndex = 0, photoTimer;

function readPreference(key, fallback) {
  try { return localStorage.getItem(`stueradio:${key}`) ?? fallback; } catch { return fallback; }
}
function savePreference(key, value) {
  try { localStorage.setItem(`stueradio:${key}`, String(value)); } catch {}
}

stations.forEach((station, index) => {
  const button = document.createElement("button");
  button.className = "station-btn";
  button.type = "button";
  button.setAttribute("aria-label", station.name);
  button.setAttribute("aria-pressed", "false");
  button.title = station.name;
  button.innerHTML = `<span class="station-logo" data-brand="${station.short}" aria-hidden="true">${station.short}</span><span class="station-name">${station.name}</span>`;
  button.addEventListener("click", () => selectStation(index, true));
  rail.appendChild(button);
});

function setPlayback(state, message) {
  playback = state;
  document.body.dataset.playback = state;
  const active = state === "playing" || state === "connecting";
  playBtn.textContent = active ? "Ⅱ" : "▶";
  playBtn.setAttribute("aria-label", active ? "Pause" : "Afspil");
  $("#playbackStatus").textContent = message || ({
    ready: "Klar til at spille", playing: "Du lytter live", connecting: "Forbinder…",
    paused: "En lille pause", error: "Ingen forbindelse · prøv afspil igen"
  })[state];
}
function stationFallbackData() {
  const station = stations[current];
  $("#cover").hidden = true;
  $("#stationMark").hidden = false;
  $("#stationMark").textContent = station.short;
  $("#trackLabel").textContent = "LIVE RADIO";
  $("#trackTitle").textContent = station.name;
  $("#trackArtist").textContent = "Din kanal, direkte fra studiet.";
}
async function loadNowPlaying() {
  const station = stations[current], request = ++metadataRequest;
  if (!station.meta) return;
  try {
    const response = await fetch(`/api/now-playing?station=${encodeURIComponent(station.meta)}`, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) return;
    const data = await response.json();
    if (request !== metadataRequest || !data?.title) return;
    $("#trackLabel").textContent = data.live === false ? "SENEST SPILLET" : "SPILLER NU";
    $("#trackTitle").textContent = data.title;
    $("#trackArtist").textContent = data.artist || station.name;
    const cover = data.artist ? await getFreeCoverArt({ title: data.title, artist: data.artist, fallback: "" }) : "";
    if (request !== metadataRequest) return;
    const image = $("#cover");
    image.onload = () => {
      if (request !== metadataRequest) return;
      image.hidden = false;
      $("#stationMark").hidden = true;
    };
    image.onerror = () => { image.hidden = true; $("#stationMark").hidden = false; };
    if (cover) image.src = cover;
    else { image.hidden = true; $("#stationMark").hidden = false; }
  } catch {}
}
function selectStation(index, autoplay = false) {
  ++playRequest;
  current = (index + stations.length) % stations.length;
  const station = stations[current];
  [...rail.children].forEach((button, i) => {
    button.classList.toggle("active", i === current);
    button.setAttribute("aria-pressed", String(i === current));
  });
  $("#stationTitle").textContent = station.name;
  $("#stationSubtitle").textContent = station.subtitle;
  $("#stationNumber").textContent = `KANAL ${String(current + 1).padStart(2, "0")}`;
  $("#needle").style.left = `${2 + (current / (stations.length - 1)) * 96}%`;
  audio.src = station.stream;
  audio.load();
  stationFallbackData();
  loadNowPlaying();
  setPlayback("ready");
  if (autoplay) play();
}
async function play() {
  const request = ++playRequest;
  setPlayback("connecting");
  try {
    await audio.play();
    if (request === playRequest) setPlayback("playing");
  } catch (error) {
    if (request !== playRequest || error.name === "AbortError") return;
    setPlayback("error");
  }
}
function pause() { ++playRequest; audio.pause(); setPlayback("paused"); }
playBtn.addEventListener("click", () => playback === "playing" || playback === "connecting" ? pause() : play());
$("#prevBtn").addEventListener("click", () => selectStation(current - 1, playback === "playing" || playback === "connecting"));
$("#nextBtn").addEventListener("click", () => selectStation(current + 1, playback === "playing" || playback === "connecting"));
audio.addEventListener("playing", () => setPlayback("playing"));
audio.addEventListener("pause", () => { if (playback === "playing") setPlayback("paused"); });
audio.addEventListener("waiting", () => { if (!audio.paused) setPlayback("connecting"); });
audio.addEventListener("error", () => setPlayback("error"));
audio.addEventListener("ended", () => setPlayback("paused"));
function updateVolume() {
  const volume = audio.volume;
  $("#volume").value = volume;
  $("#volumeValue").textContent = `${Math.round(volume * 100)}%`;
  $("#muteBtn").textContent = volume === 0 ? "🔇" : volume < .45 ? "🔉" : "🔊";
  $("#muteBtn").setAttribute("aria-label", volume === 0 ? "Slå lyd til" : "Slå lyd fra");
  $("#muteBtn").setAttribute("aria-pressed", String(volume === 0));
}
$("#volume").addEventListener("input", (event) => {
  audio.volume = Number(event.target.value);
  if (audio.volume > 0) lastVolume = audio.volume;
  updateVolume();
});
$("#muteBtn").addEventListener("click", () => {
  if (audio.volume > 0) { lastVolume = audio.volume; audio.volume = 0; }
  else audio.volume = lastVolume || .72;
  updateVolume();
});
audio.volume = .72;
updateVolume();
setInterval(loadNowPlaying, 30000);

const weatherCodes = { 0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️", 45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌦️", 55: "🌧️", 61: "🌧️", 63: "🌧️", 65: "🌧️", 71: "🌨️", 73: "🌨️", 75: "❄️", 80: "🌦️", 81: "🌧️", 82: "⛈️", 95: "⛈️" };
const weatherDescriptions = { 0: "Sol", 1: "Mest sol", 2: "Let skyet", 3: "Skyet", 45: "Tåge", 48: "Rimtåge", 51: "Støvregn", 53: "Støvregn", 55: "Støvregn", 61: "Regn", 63: "Regn", 65: "Kraftig regn", 71: "Sne", 73: "Sne", 75: "Kraftig sne", 80: "Regnbyger", 81: "Regnbyger", 82: "Kraftige byger", 95: "Torden" };
const weatherHour = new Intl.DateTimeFormat("da-DK", { hour: "2-digit", timeZone: "Europe/Copenhagen" });
const weatherDate = new Intl.DateTimeFormat("da-DK", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Copenhagen" });
function weatherNumber(value) { return Number.isFinite(value) ? Math.round(value) : "–"; }
function weatherIcon(code, isDay = 1) {
  const night = isDay === 0 && (code === 0 || code === 1);
  return `<span class="weather-icon" role="img" aria-label="${night ? "Klar nat" : weatherDescriptions[code] || "Vejrudsigt"}">${night ? "🌙" : weatherCodes[code] || "🌤️"}</span>`;
}
function updateWeatherScroll() {
  const hours = $("#weatherHours");
  if (!hours) return;
  $("#weatherPrevious").disabled = hours.scrollLeft < 2;
  $("#weatherNext").disabled = hours.scrollLeft + hours.clientWidth >= hours.scrollWidth - 2;
}
async function loadWeather() {
  $("#weather").setAttribute("aria-busy", "true");
  $("#retryWeather").hidden = true;
  try {
    const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=56.4607&longitude=10.0364&current=temperature_2m,weather_code,wind_speed_10m,is_day&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FCopenhagen&timeformat=unixtime&forecast_days=2&forecast_hours=25", { cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error("Weather unavailable");
    const data = await response.json();
    if (!Number.isFinite(data.current?.time) || !data.hourly?.time?.length) throw new Error("Invalid weather");
    const now = data.current.time, end = now + 24 * 60 * 60;
    const futureHours = data.hourly.time.map((time, index) => ({ time, index })).filter(({ time }) => time > now && time <= end);
    if (futureHours.length < 24) throw new Error("Incomplete hourly forecast");
    const currentHour = data.hourly.time.findLastIndex((time) => time <= now);
    const hours = [{ time: now, index: currentHour, current: true }, ...futureHours];
    const previousScroll = $("#weatherHours")?.scrollLeft || 0;
    const tomorrow = data.daily?.time?.length > 1 ? `<div class="weather-tomorrow">${weatherIcon(data.daily.weather_code?.[1])}<div><h3>I morgen</h3><p>${weatherDescriptions[data.daily.weather_code?.[1]] || "Vejrudsigt"} · ${weatherNumber(data.daily.precipitation_probability_max?.[1])}% regn</p></div><span class="tomorrow-temp" aria-label="Laveste ${weatherNumber(data.daily.temperature_2m_min?.[1])}, højeste ${weatherNumber(data.daily.temperature_2m_max?.[1])} grader">${weatherNumber(data.daily.temperature_2m_min?.[1])}–${weatherNumber(data.daily.temperature_2m_max?.[1])}°</span></div>` : "";
    $("#weather").innerHTML = `<div class="weather-toolbar"><h3>Næste 24 timer</h3><div><button id="weatherPrevious" class="small-icon" type="button" aria-label="Vis tidligere timer" aria-controls="weatherHours" disabled>←</button><button id="weatherNext" class="small-icon" type="button" aria-label="Vis senere timer" aria-controls="weatherHours">→</button></div></div><ol id="weatherHours" class="weather-hours" tabindex="0" aria-label="Time for time de næste 24 timer. Rul til siden for flere timer.">${hours.map(({ time, index, current }) => {
      const date = new Date(time * 1000);
      const code = current ? data.current.weather_code : data.hourly.weather_code?.[index];
      return `<li class="weather-card${current ? " weather-now" : ""}"><time class="weather-day" datetime="${date.toISOString()}" title="${weatherDate.format(date)} kl. ${weatherHour.format(date)}">${current ? "Nu" : weatherHour.format(date)}</time>${weatherIcon(code, current ? data.current.is_day : data.hourly.is_day?.[index])}<span class="weather-temp">${weatherNumber(current ? data.current.temperature_2m : data.hourly.temperature_2m?.[index])}°</span><small aria-label="${weatherNumber(data.hourly.precipitation_probability?.[index])} procent sandsynlighed for nedbør">${weatherNumber(data.hourly.precipitation_probability?.[index])}% regn</small></li>`;
    }).join("")}</ol>${tomorrow}`;
    $("#weatherHours").scrollLeft = previousScroll;
    $("#weatherHours").addEventListener("scroll", updateWeatherScroll, { passive: true });
    updateWeatherScroll();
    $("#weatherUpdated").textContent = `Vind ${weatherNumber(data.current.wind_speed_10m)} km/t`;
  } catch {
    $("#weather").innerHTML = '<p class="loading-text">Vejret lader vente på sig.<br>Prøv igen om et øjeblik.</p>';
    $("#weatherUpdated").textContent = "Kunne ikke hente vejret";
    $("#retryWeather").hidden = false;
  } finally { $("#weather").setAttribute("aria-busy", "false"); }
}
$("#retryWeather").addEventListener("click", loadWeather);
$("#weather").addEventListener("click", (event) => {
  const button = event.target.closest("#weatherPrevious, #weatherNext");
  if (!button) return;
  const hours = $("#weatherHours");
  hours.scrollBy({ left: (button.id === "weatherNext" ? 1 : -1) * hours.clientWidth * .8, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
});
window.addEventListener("resize", updateWeatherScroll);
loadWeather();
setInterval(loadWeather, 30 * 60 * 1000);

const DB_NAME = "stueradio-photos", STORE = "photos";
function openPhotoDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function getPhotos() {
  const database = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readonly");
    const request = transaction.objectStore(STORE).getAll();
    transaction.oncomplete = () => { database.close(); resolve(request.result); };
    transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}
async function addPhotos(files) {
  const database = await openPhotoDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, "readwrite");
    for (const file of files) transaction.objectStore(STORE).add({ blob: file, name: file.name });
    transaction.oncomplete = () => { database.close(); resolve(); };
    transaction.onabort = transaction.onerror = () => { database.close(); reject(transaction.error); };
  });
}
function renderPhoto() {
  $("#prevPhoto").disabled = $("#nextPhoto").disabled = photoUrls.length < 2;
  $("#photoCount").textContent = photoUrls.length ? `${photoIndex + 1} / ${photoUrls.length} · kun på denne enhed` : "Kun på denne enhed";
  if (!photoUrls.length) return;
  const image = document.createElement("img");
  image.alt = `Privat billede ${photoIndex + 1} af ${photoUrls.length}`;
  image.src = photoUrls[photoIndex];
  image.onerror = () => { $("#photoStatus").textContent = "Billedet kan ikke vises. Prøv et billede i JPG-, PNG- eller WebP-format."; };
  $("#photoStage").replaceChildren(image);
}
async function refreshPhotos() {
  const rows = await getPhotos();
  photoUrls.forEach(URL.revokeObjectURL);
  photoUrls = rows.map((row) => URL.createObjectURL(row.blob));
  photoIndex = Math.min(photoIndex, Math.max(0, photoUrls.length - 1));
  renderPhoto();
}
function nextPhoto(direction = 1) {
  if (!photoUrls.length) return;
  photoIndex = (photoIndex + direction + photoUrls.length) % photoUrls.length;
  $("#photoStatus").textContent = "";
  renderPhoto();
}
function startSlideshow() {
  clearInterval(photoTimer);
  const interval = Number($("#photoInterval").value);
  if (interval > 0) photoTimer = setInterval(() => { if (!document.hidden && photoUrls.length > 1) nextPhoto(); }, interval);
}
$("#addPhotosBtn").addEventListener("click", () => $("#photoInput").click());
$("#photoStage").addEventListener("click", (event) => { if (event.target.closest(".photo-empty")) $("#photoInput").click(); });
$("#prevPhoto").addEventListener("click", () => { nextPhoto(-1); startSlideshow(); });
$("#nextPhoto").addEventListener("click", () => { nextPhoto(); startSlideshow(); });
$("#photoInput").addEventListener("change", async (event) => {
  const files = [...event.target.files].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  $("#addPhotosBtn").disabled = true;
  $("#photoStatus").textContent = "Gemmer dine billeder…";
  try {
    await addPhotos(files);
    await refreshPhotos();
    $("#photoStatus").textContent = "";
    startSlideshow();
  } catch { $("#photoStatus").textContent = "Billederne kunne ikke gemmes. Kontrollér, at der er plads på enheden, og prøv igen."; }
  finally { event.target.value = ""; $("#addPhotosBtn").disabled = false; }
});
refreshPhotos().catch(() => { $("#photoStatus").textContent = "Billedrammen kræver adgang til browserens lokale lager."; });

function toggleSettings(open) {
  $("#settings").hidden = !open;
  $("#settingsBtn").setAttribute("aria-expanded", String(open));
  if (open) $("#photoInterval").focus();
  else $("#settingsBtn").focus();
}
$("#settingsBtn").addEventListener("click", () => toggleSettings($("#settings").hidden));
$("#closeSettings").addEventListener("click", () => toggleSettings(false));
$("#settings").addEventListener("keydown", (event) => { if (event.key === "Escape") toggleSettings(false); });
const savedInterval = readPreference("photo-interval", "12000");
if (["12000", "30000", "60000", "0"].includes(savedInterval)) $("#photoInterval").value = savedInterval;
$("#photoInterval").addEventListener("change", () => { savePreference("photo-interval", $("#photoInterval").value); startSlideshow(); });
$("#showWeather").checked = readPreference("show-weather", "true") !== "false";
$("#weatherPanel").hidden = !$("#showWeather").checked;
$("#showWeather").addEventListener("change", () => { $("#weatherPanel").hidden = !$("#showWeather").checked; savePreference("show-weather", $("#showWeather").checked); });
startSlideshow();
function updateNavigation() {
  const target = location.hash === "#photos" ? "#photos" : "#radio";
  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.getAttribute("href") === target;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("hashchange", updateNavigation);
updateNavigation();
$("#fullscreenBtn").hidden = !document.fullscreenEnabled;
$("#fullscreenBtn").addEventListener("click", async () => {
  try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch {}
});
document.addEventListener("fullscreenchange", () => {
  $("#fullscreenBtn").setAttribute("aria-label", document.fullscreenElement ? "Forlad fuld skærm" : "Fuld skærm");
});
window.addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); deferredInstall = event; $("#installBtn").hidden = false; });
$("#installBtn").addEventListener("click", async () => {
  if (!deferredInstall) return;
  try { await deferredInstall.prompt(); await deferredInstall.userChoice; }
  finally { deferredInstall = null; $("#installBtn").hidden = true; }
});
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
selectStation(0);
function updateChromeTime() {
  const now = new Date();
  $("#clock").textContent = new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit" }).format(now);
  $("#clock").dateTime = now.toISOString();
  $("#dateLabel").textContent = new Intl.DateTimeFormat("da-DK", { weekday: "long", day: "numeric", month: "long" }).format(now);
}
updateChromeTime();
setInterval(updateChromeTime, 30000);
