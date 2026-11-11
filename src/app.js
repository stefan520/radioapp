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

const $ = (s)=>document.querySelector(s);
const audio=$("#audio"), rail=$("#stationRail"), playBtn=$("#playBtn"), needle=$("#needle");
let current=0, isPlaying=false, lastVolume=.72, deferredInstall=null, photoUrls=[], photoIndex=0;

rail.style.setProperty("--station-count", stations.length);
stations.forEach((s,i)=>{
  const b=document.createElement("button");
  b.className="station-btn";
  b.type="button";
  b.dataset.index=i;
  b.setAttribute("role","listitem");
  b.setAttribute("aria-label",s.name);
  b.title=s.name;
  b.innerHTML=`<span class="station-logo">${s.short}</span>`;
  b.addEventListener("click",()=>selectStation(i,true));
  rail.appendChild(b);
});

function stationFallbackData(){
  const s=stations[current];
  $("#cover").hidden=true;
  $("#stationMark").hidden=false;
  $("#stationMark").textContent=s.short;
  $("#trackLabel").textContent="LIVE";
  $("#trackTitle").textContent=s.name;
  $("#trackArtist").textContent="Sangoplysninger er ikke tilgængelige fra denne kanal.";
}

async function loadNowPlaying(){
  const s=stations[current];
  stationFallbackData();
  if(!s.meta) return;
  const stationAtRequest=s.id;
  try{
    const r=await fetch(`/api/now-playing?station=${encodeURIComponent(s.meta)}`,{cache:"no-store"});
    if(!r.ok) return;
    const data=await r.json();
    if(stations[current].id!==stationAtRequest || !data?.title) return;
    $("#trackLabel").textContent=data.live===false?"SENEST SPILLET":"SPILLER NU";
    $("#trackTitle").textContent=data.title;
    $("#trackArtist").textContent=data.artist||"";
    if(data.artist){
      const cover=await getFreeCoverArt({title:data.title,artist:data.artist,fallback:""});
      if(stations[current].id!==stationAtRequest) return;
      if(cover){
        $("#cover").src=cover;
        $("#cover").hidden=false;
        $("#stationMark").hidden=true;
        $("#cover").onerror=()=>{$("#cover").hidden=true;$("#stationMark").hidden=false};
      }
    }
  }catch{}
}

function selectStation(index,autoplay=false){
  current=(index+stations.length)%stations.length;
  const s=stations[current];
  [...rail.children].forEach((el,i)=>el.classList.toggle("active",i===current));
  $("#stationTitle").textContent=s.name;
  $("#stationSubtitle").textContent=s.subtitle;
  $("#stationNumber").textContent=`KANAL ${String(current+1).padStart(2,"0")}`;
  $("#stationMark").textContent=s.short;
  const pct=2+(current/(stations.length-1))*96;
  needle.style.left=`calc(${pct}% - 2px)`;
  audio.src=s.stream;
  audio.load();
  loadNowPlaying();
  if(autoplay) play();
}

async function play(){
  try{
    await audio.play();
    isPlaying=true;
    playBtn.textContent="Ⅱ";
    playBtn.setAttribute("aria-label","Pause");
  }catch{
    isPlaying=false;
    playBtn.textContent="▶";
  }
}
function pause(){audio.pause();isPlaying=false;playBtn.textContent="▶";playBtn.setAttribute("aria-label","Afspil")}
playBtn.addEventListener("click",()=>isPlaying?pause():play());
$("#prevBtn").addEventListener("click",()=>selectStation(current-1,isPlaying));
$("#nextBtn").addEventListener("click",()=>selectStation(current+1,isPlaying));
$("#volume").addEventListener("input",e=>{audio.volume=Number(e.target.value);if(audio.volume>0)lastVolume=audio.volume;updateMute()});
$("#muteBtn").addEventListener("click",()=>{if(audio.volume>0){lastVolume=audio.volume;audio.volume=0;$("#volume").value=0}else{audio.volume=lastVolume||.72;$("#volume").value=audio.volume}updateMute()});
function updateMute(){const v=audio.volume;$("#muteBtn").textContent=v===0?"🔇":v<.45?"🔉":"🔊"}
audio.volume=.72;

setInterval(loadNowPlaying,30000);

const weatherCodes={0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌦️",55:"🌧️",61:"🌧️",63:"🌧️",65:"🌧️",71:"🌨️",73:"🌨️",75:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",95:"⛈️"};
async function loadWeather(){
  try{
    const url="https://api.open-meteo.com/v1/forecast?latitude=56.4607&longitude=10.0364&current=temperature_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FCopenhagen&forecast_days=4";
    const d=await (await fetch(url)).json();
    const days=["I dag","I morgen",...d.daily.time.slice(2).map(x=>new Intl.DateTimeFormat("da-DK",{weekday:"short"}).format(new Date(x)))];
    $("#weather").innerHTML=d.daily.time.map((date,i)=>`
      <div class="weather-card ${i===0?"today":""}">
        <div class="weather-day">${days[i]}</div>
        <div class="weather-icon">${weatherCodes[d.daily.weather_code[i]]||"🌤️"}</div>
        <div><span class="weather-temp">${i===0?Math.round(d.current.temperature_2m):Math.round(d.daily.temperature_2m_max[i])}°</span><br><small>${Math.round(d.daily.temperature_2m_min[i])}° / ${Math.round(d.daily.temperature_2m_max[i])}°</small></div>
      </div>`).join("");
    $("#weatherUpdated").textContent=`Vind ${Math.round(d.current.wind_speed_10m)} km/t`;
  }catch{$("#weather").textContent="Kunne ikke hente vejret lige nu."}
}
loadWeather();

const DB_NAME="stueradio-photos",STORE="photos";
function db(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function getPhotos(){const d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction(STORE,"readonly"),r=tx.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
async function addPhotos(files){const d=await db();const tx=d.transaction(STORE,"readwrite");for(const file of files)tx.objectStore(STORE).add({blob:file,name:file.name});return new Promise((res,rej)=>{tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
function renderPhoto(){
  const stage=$("#photoStage");
  if(!photoUrls.length){stage.innerHTML='<div class="photo-empty"><span>▧</span><p>Tryk + for at vælge billeder fra tabletten eller Google Fotos.</p></div>';return}
  stage.innerHTML=`<img src="${photoUrls[photoIndex%photoUrls.length]}" alt="Privat billede" />`;
}
async function refreshPhotos(){
  photoUrls.forEach(URL.revokeObjectURL);photoUrls=[];
  try{const rows=await getPhotos();photoUrls=rows.map(x=>URL.createObjectURL(x.blob));renderPhoto()}catch{}
}
$("#photoInput").addEventListener("change",async e=>{if(e.target.files?.length){await addPhotos([...e.target.files]);await refreshPhotos();e.target.value=""}});
setInterval(()=>{if(photoUrls.length>1){photoIndex=(photoIndex+1)%photoUrls.length;renderPhoto()}},12000);
refreshPhotos();

$("#fullscreenBtn").addEventListener("click",async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();else await document.exitFullscreen()}catch{}});
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredInstall=e;$("#installBtn").hidden=false});
$("#installBtn").addEventListener("click",async()=>{if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;$("#installBtn").hidden=true});

if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(()=>{});
selectStation(0,false);
