import { afterAll, expect, test } from "bun:test";
import { spawn } from "bun";

const port = 18000 + Math.floor(Math.random() * 10000);
const server = spawn([process.execPath, "run", "docker/server.ts"], {
  env: { ...process.env, PORT: String(port) },
  stdout: "ignore",
  stderr: "inherit"
});
afterAll(() => server.kill());
const base = `http://127.0.0.1:${port}`;
let ready = false;
for (let attempt = 0; attempt < 100; attempt++) {
  try { ready = (await fetch(`${base}/health`)).ok; } catch {}
  if (ready) break;
  await Bun.sleep(25);
}
if (!ready) throw new Error("Asset test server did not start");

test("the page references a stylesheet versioned by build content", async () => {
  const html = await (await fetch(base)).text();
  const href = html.match(/rel="stylesheet" href="([^"]+)"/)?.[1];
  expect(href).toMatch(/^\/assets\/[a-f0-9]{12}\/styles\.css$/);
  const css = await fetch(base + href);
  expect(css.headers.get("content-type")).toContain("text/css");
  expect(await css.text()).toContain(":root");
  expect(css.headers.get("cache-control")).toContain("immutable");
});

test("mutable CSS and the service worker must revalidate", async () => {
  for (const path of ["/src/styles.css", "/src/app.js", "/sw.js", "/manifest.webmanifest"]) {
    const response = await fetch(base + path);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-cache");
  }
});

test("missing stylesheets return 404 instead of HTML", async () => {
  const response = await fetch(`${base}/src/missing-styles.css`);
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.text()).not.toContain("<!doctype html>");
});

test("the offline shell precaches the page's versioned scripts and styles", async () => {
  const html = await (await fetch(base)).text();
  const worker = await (await fetch(`${base}/sw.js`)).text();
  const paths = [...html.matchAll(/(?:href|src)="(\/assets\/[^\"]+)"/g)].map((match) => match[1]);
  expect(paths.length).toBe(2);
  for (const path of paths) expect(worker).toContain(path);
  const app = await (await fetch(base + paths.find((path) => path.endsWith("app.js")))).text();
  expect(app).toContain('from "./cover-art.js"');
  const cover = await fetch(base + paths[0].replace("styles.css", "cover-art.js"));
  expect(cover.headers.get("content-type")).toContain("javascript");
});

test("Android installation has real PNG icons in both required sizes", async () => {
  const manifest = await (await fetch(`${base}/manifest.webmanifest`)).json();
  for (const size of [192, 512]) {
    const icon = manifest.icons.find((icon: { sizes: string; type: string; purpose?: string }) =>
      icon.sizes === `${size}x${size}` && icon.type === "image/png" && (icon.purpose || "any").split(" ").includes("any"));
    expect(icon).toBeDefined();
    const response = await fetch(base + icon.src);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    const bytes = await response.arrayBuffer();
    const png = new DataView(bytes);
    expect(png.getUint32(0)).toBe(0x89504e47);
    expect(png.getUint32(4)).toBe(0x0d0a1a0a);
    expect(png.getUint32(16)).toBe(size);
    expect(png.getUint32(20)).toBe(size);
  }
});

test("the versioned manifest keeps a stable identity and is cached for offline use", async () => {
  const html = await (await fetch(base)).text();
  const href = html.match(/rel="manifest" href="([^"]+)"/)?.[1];
  expect(href).toMatch(/^\/manifest\.webmanifest\?v=[a-f0-9]{12}$/);
  const manifest = await (await fetch(base + href)).json();
  expect(manifest.id).toBe("/");
  expect(manifest.start_url).toBe("/");
  const worker = await (await fetch(`${base}/sw.js`)).text();
  expect(worker).toContain(href);
  for (const icon of manifest.icons) {
    expect(worker).toContain(icon.src);
    expect((await fetch(base + icon.src)).status).toBe(200);
  }
});
