const CACHE_PREFIX="stueradio-cover-v2:",TTL=1000*60*60*24*30;
function key(t,a){return CACHE_PREFIX+encodeURIComponent((a+"|"+t).toLowerCase())}
export async function getFreeCoverArt({title,artist,fallback=""}){
  if(!title||!artist)return fallback;
  try{const raw=localStorage.getItem(key(title,artist));if(raw){const c=JSON.parse(raw);if(Date.now()-c.at<TTL)return c.url||fallback}}catch{}
  try{
    const r=await fetch(`/api/cover?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist)}`);
    const d=await r.json(),url=d?.url||fallback;
    try{localStorage.setItem(key(title,artist),JSON.stringify({at:Date.now(),url}))}catch{}
    return url;
  }catch{return fallback}
}
