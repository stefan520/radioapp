const port = Number(Bun.env.PORT ?? 3000);
const root = "./dist";

const contentTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function extension(pathname: string) {
  const index = pathname.lastIndexOf(".");
  return index >= 0 ? pathname.slice(index).toLowerCase() : "";
}

function safePath(pathname: string) {
  const decoded = decodeURIComponent(pathname);
  const normalized = decoded.replace(/\\/g, "/");
  if (normalized.includes("..")) return null;
  return normalized;
}

function withNoIndex(headers: HeadersInit = {}) {
  return new Headers({
    ...Object.fromEntries(new Headers(headers).entries()),
    "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet, noimageindex",
  });
}

const server = Bun.serve({
  port,
  hostname: "0.0.0.0",
  async fetch(req) {
    const url = new URL(req.url);

    if (url.pathname === "/health") {
      return Response.json(
        { status: "ok" },
        { headers: withNoIndex({ "Cache-Control": "no-store" }) }
      );
    }

    if (url.pathname === "/robots.txt") {
      return new Response("User-agent: *\nDisallow: /\n", {
        headers: withNoIndex({
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        }),
      });
    }

    const pathname = safePath(url.pathname);
    if (!pathname) {
      return new Response("Bad Request", {
        status: 400,
        headers: withNoIndex(),
      });
    }

    const requested = pathname === "/" ? "/index.html" : pathname;
    const file = Bun.file(`${root}${requested}`);

    if (await file.exists()) {
      const ext = extension(requested);
      return new Response(file, {
        headers: withNoIndex({
          "Content-Type": contentTypes[ext] ?? file.type ?? "application/octet-stream",
          "Cache-Control": requested.endsWith(".html")
            ? "no-cache"
            : "public, max-age=31536000, immutable",
        }),
      });
    }

    const index = Bun.file(`${root}/index.html`);
    if (await index.exists()) {
      return new Response(index, {
        headers: withNoIndex({
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        }),
      });
    }

    return new Response("Not Found", {
      status: 404,
      headers: withNoIndex(),
    });
  },
});

console.log(`Stueradio listening on http://0.0.0.0:${server.port}`);
