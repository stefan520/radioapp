import { createAlbumReader, validateAlbumLinks } from "./google-albums.ts";

const readAlbums = createAlbumReader();
const port = Number(Bun.env.PORT ?? 3000);
const root = "./dist";
const contentTypes: Record<string,string> = {
  ".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".webmanifest":"application/manifest+json; charset=utf-8",
  ".svg":"image/svg+xml",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".webp":"image/webp",".ico":"image/x-icon",
  ".woff":"font/woff",".woff2":"font/woff2",".txt":"text/plain; charset=utf-8"
};
const noIndex="noindex, nofollow, noarchive, nosnippet, noimageindex";
const metaCache=new Map<string,{at:number,data:any}>();
const coverCache=new Map<string,{at:number,url:string|null}>();
let lastMusicBrainz=0;

function headers(extra:HeadersInit={}){const h=new Headers(extra);h.set("X-Robots-Tag",noIndex);return h}
function ext(p:string){const i=p.lastIndexOf(".");return i>=0?p.slice(i).toLowerCase():""}
function safe(p:string){try{p=decodeURIComponent(p).replace(/\\/g,"/");return p.includes("..")?null:p}catch{return null}}
function strip(s:string){return s.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&#039;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim()}

async function fetchText(url:string){const r=await fetch(url,{headers:{"User-Agent":"Stueradio/1.0 (private home radio; contact via radio.xlaunch.dk)"}});if(!r.ok)throw new Error(String(r.status));return r.text()}
async function nowPlaying(station:string){
  const cached=metaCache.get(station);if(cached&&Date.now()-cached.at<20000)return cached.data;
  let data:any=null;
  if(station==="retro"||station==="retrojul"){
    const html=await fetchText("https://retro-radio.dk/");
    const marker=html.toLowerCase().indexOf("senest afspillet");
    const slice=marker>=0?html.slice(marker,marker+14000):html;
    const h3=[...slice.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi)].map(m=>strip(m[1])).filter(Boolean);
    if(h3.length){
      const firstPos=slice.indexOf(h3[0]);
      const after=firstPos>=0?slice.slice(firstPos,firstPos+1800):slice;
      const texts=[...after.matchAll(/<(?:p|div)[^>]*>([\s\S]*?)<\/(?:p|div)>/gi)].map(m=>strip(m[1])).filter(x=>x&&x.length<120);
      const artist=texts.find(x=>x!==h3[0]&&!/album cover|default/i.test(x))||"";
      data={title:h3[0],artist,live:true};
    }
  } else if(station==="abc"){
    const html=await fetchText("https://radioabc.dk/");
    const plain=strip(html);
    const m=plain.match(/Vi spiller nu:\s*([^|]{2,160}?)(?= ABC Top| Seneste afspillet| Download vores app|$)/i);
    if(m){
      const raw=m[1].trim();
      const parts=raw.split(/\s{2,}|\s+-\s+/);
      data={title:parts.length>1?parts.slice(1).join(" - "):raw,artist:parts.length>1?parts[0]:"",live:true};
    }
  }
  if(data)metaCache.set(station,{at:Date.now(),data});
  return data||{};
}
async function cover(title:string,artist:string){
  const key=(artist+"|"+title).toLowerCase();const c=coverCache.get(key);if(c&&Date.now()-c.at<30*86400000)return c.url;
  const wait=Math.max(0,1100-(Date.now()-lastMusicBrainz));if(wait)await Bun.sleep(wait);lastMusicBrainz=Date.now();
  const q=`recording:"${title.replace(/"/g,"")}" AND artist:"${artist.replace(/"/g,"")}"`;
  const r=await fetch("https://musicbrainz.org/ws/2/recording/?fmt=json&limit=5&query="+encodeURIComponent(q),{headers:{"User-Agent":"Stueradio/1.0 (private home radio)","Accept":"application/json"}});
  if(!r.ok)return null;const j:any=await r.json();let url:string|null=null;
  for(const rec of j.recordings||[]){const rel=(rec.releases||[]).find((x:any)=>x.status==="Official")||(rec.releases||[])[0];if(rel?.id){url=`https://coverartarchive.org/release/${rel.id}/front-500`;break}}
  coverCache.set(key,{at:Date.now(),url});return url;
}

Bun.serve({
  port,hostname:"0.0.0.0",
  async fetch(req){
    const u=new URL(req.url);
    if(u.pathname==="/api/photo-albums"){
      const responseHeaders=headers({"Cache-Control":"no-store"});
      if(req.method!=="POST")return Response.json({error:"Brug POST."},{status:405,headers:headers({"Allow":"POST","Cache-Control":"no-store"})});
      try{
        // Limit streamed bodies too, rather than trusting Content-Length.
        const reader=req.body?.getReader();let body="",size=0;const decoder=new TextDecoder();
        if(reader)try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>8192){await reader.cancel();return Response.json({error:"For mange data."},{status:413,headers:responseHeaders})}body+=decoder.decode(chunk.value,{stream:true})}}finally{reader.releaseLock()}
        body+=decoder.decode();
        const links=validateAlbumLinks(JSON.parse(body).albums);
        const result=await readAlbums(links);
        return Response.json(result,{status:result.errors.length===links.length&&links.length>0?502:200,headers:responseHeaders});
      }catch(error){return Response.json({error:error instanceof SyntaxError?"Ugyldige data.":error instanceof Error?error.message:"Albummerne kunne ikke hentes."},{status:400,headers:responseHeaders})}
    }
    if(u.pathname==="/health")return Response.json({status:"ok"},{headers:headers({"Cache-Control":"no-store"})});
    if(u.pathname==="/robots.txt")return new Response("User-agent: *\nDisallow: /\n",{headers:headers({"Content-Type":"text/plain","Cache-Control":"public,max-age=3600"})});
    if(u.pathname==="/api/now-playing"){
      try{return Response.json(await nowPlaying(u.searchParams.get("station")||""),{headers:headers({"Cache-Control":"no-store"})})}
      catch{return Response.json({}, {headers:headers({"Cache-Control":"no-store"})})}
    }
    if(u.pathname==="/api/cover"){
      try{return Response.json({url:await cover(u.searchParams.get("title")||"",u.searchParams.get("artist")||"")},{headers:headers({"Cache-Control":"public,max-age=86400"})})}
      catch{return Response.json({url:null},{headers:headers({"Cache-Control":"no-store"})})}
    }
    const p=safe(u.pathname);if(!p)return new Response("Bad Request",{status:400,headers:headers()});
    const requested=p==="/"?"/index.html":p,file=Bun.file(root+requested);
    if(await file.exists())return new Response(file,{headers:headers({"Content-Type":contentTypes[ext(requested)]??file.type??"application/octet-stream","Cache-Control":/^\/assets\/[a-f0-9]{12}\//.test(requested)?"public,max-age=31536000,immutable":"no-cache"})});
    if(ext(requested))return new Response("Not Found",{status:404,headers:headers({"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store"})});
    const index=Bun.file(root+"/index.html");if(await index.exists())return new Response(index,{headers:headers({"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-cache"})});
    return new Response("Not Found",{status:404,headers:headers()});
  }
});
console.log(`Stueradio listening on http://0.0.0.0:${port}`);
