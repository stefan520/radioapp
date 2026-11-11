import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await cp("index.html", "dist/index.html");

try {
  await cp("public", "dist", { recursive: true });
} catch {}

try {
  await cp("src", "dist/src", { recursive: true });
} catch {}

console.log("Built Stueradio into dist/");
