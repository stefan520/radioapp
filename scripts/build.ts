import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const hash = createHash("sha256");
async function hashDirectory(directory: string) {
  const entries = await readdir(directory, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await hashDirectory(path);
    else hash.update(path).update("\0").update(await readFile(path)).update("\0");
  }
}
const html = await readFile("index.html", "utf8");
hash.update(html);
await hashDirectory("src");
await hashDirectory("public");
const revision = hash.digest("hex").slice(0, 12);
const assets = `/assets/${revision}`;

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await cp("public", "dist", { recursive: true });
// Keep legacy URLs available for clients upgrading from an earlier release.
await cp("src", "dist/src", { recursive: true });
await cp("src", `dist${assets}`, { recursive: true });
await writeFile("dist/index.html", html.replaceAll('"/src/', `"${assets}/`));
const worker = await readFile("public/sw.js", "utf8");
await writeFile("dist/sw.js", worker
  .replace(/const CACHE="[^"]+";/, `const CACHE="stueradio-${revision}";`)
  .replaceAll('"/src/', `"${assets}/`));

console.log(`Built Stueradio into dist/ (${revision})`);
