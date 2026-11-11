const CACHE="stueradio-v7";
const SHELL=["/","/manifest.webmanifest","/icon.svg","/icon-192.png","/icon-512.png","/icon-maskable-512.png","/src/styles.css","/src/app.js","/src/cover-art.js","/src/photo-albums.js"];

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate",event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener("fetch",event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=="GET") return;

  if(url.pathname.startsWith("/api/") || url.hostname==="api.open-meteo.com"){
    event.respondWith(fetch(event.request));
    return;
  }

  if(event.request.mode==="navigate"){
    event.respondWith(
      fetch(event.request)
        .then(response=>{
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put("/",copy));
          return response;
        })
        .catch(()=>caches.match("/"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached=>{
      const network=fetch(event.request).then(response=>{
        if(response.ok){
          const copy=response.clone();
          caches.open(CACHE).then(cache=>cache.put(event.request,copy));
        }
        return response;
      }).catch(()=>cached);
      return cached||network;
    })
  );
});
