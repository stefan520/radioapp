// PROTOTYPE ONLY: deliberately separate from the production build and server.
const source = await Bun.file("src/app.js").text();
const stations = source.match(/const stations = \[[\s\S]*?\r?\n\];/)?.[0];
if (!stations) throw new Error("Could not load the current station catalogue");
const port = Number(Bun.env.PROTOTYPE_PORT || 3004);
Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/api/now-playing") {
      const station = url.searchParams.get("station");
      if (!["retro", "retrojul", "abc"].includes(station || "")) return Response.json({});
      try {
        const response = await fetch(`https://radio.xlaunch.dk/api/now-playing?station=${station}`, { signal: AbortSignal.timeout(8000) });
        return Response.json(await response.json());
      } catch { return Response.json({}); }
    }
    if (url.pathname === "/icon.svg") return new Response(Bun.file("public/icon.svg"));
    if (url.pathname !== "/") return new Response("Not Found", { status: 404 });
    const prototype = (await Bun.file("src/radio.prototype.html").text()).replace("/* STATION_CATALOGUE */", stations);
    return new Response(prototype, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
  }
});
console.log(`Retro prototypes: http://localhost:${port}/?variant=walnut`);
