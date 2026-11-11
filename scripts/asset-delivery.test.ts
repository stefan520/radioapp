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
