import { expect, test } from "bun:test";
import { createAlbumReader, validateAlbumLinks } from "./google-albums.ts";

const first = "https://photos.app.goo.gl/ExampleAlbumOne";
const second = "https://photos.google.com/share/ExampleTwo?key=sharedKey";
function item(id: string, isVideo = false, url = `https://lh3.googleusercontent.com/${id}`) {
  return { uid: id, url, posterUrl: url, videoUrl: null, isVideo, width: 1600, height: 1200, imageUpdateDate: 1, albumAddDate: 1 };
}
test("only up to three genuine HTTPS Google Photos share URLs are accepted", () => {
  expect(validateAlbumLinks([first, first, second])).toEqual([first, second]);
  for (const link of ["http://photos.app.goo.gl/test", "https://localhost/share/test", "https://photos.google.com.evil.test/share/test", "https://photos.google.com/url?url=http://localhost", "https://user:pass@photos.app.goo.gl/test", "https://photos.google.com/album/private", "https://photos.app.goo.gl:8443/test"]) {
    expect(() => validateAlbumLinks([link])).toThrow();
  }
  expect(() => validateAlbumLinks([first, first, first, first])).toThrow();
  expect(() => validateAlbumLinks(null)).toThrow();
});
test("all images from large albums survive, while videos and duplicates are omitted", async () => {
  const read = createAlbumReader(async () => [...Array.from({ length: 650 }, (_, i) => item(String(i))), item("0"), item("video", true), item("bad", false, "http://localhost/private")]);
  const result = await read([first]);
  expect(result.photos).toHaveLength(650);
  expect(result.photos[649]).toBe("https://lh3.googleusercontent.com/649=w1600-h1200");
  expect(result.errors).toEqual([]);
});
test("overlapping reads share network work and cache successful albums", async () => {
  let calls = 0;
  const read = createAlbumReader(async () => { calls++; await Bun.sleep(10); return [item("same")]; });
  await Promise.all([read([first]), read([first])]);
  await read([first]);
  expect(calls).toBe(1);
});
test("partial failure keeps the other albums and retries failures", async () => {
  let failedCalls = 0;
  const read = createAlbumReader(async (link) => {
    if (link === second) { failedCalls++; throw new Error("Private album"); }
    return [item("photo")];
  });
  const result = await read([first, second]);
  expect(result.photos).toHaveLength(1);
  expect(result.errors).toHaveLength(1);
  expect(result.errors[0]).not.toContain(second);
  await read([first, second]);
  expect(failedCalls).toBe(2);
});
test("a parser failure is distinct from an empty album", async () => {
  expect((await createAlbumReader(async () => null)([first])).errors).toHaveLength(1);
  expect(await createAlbumReader(async () => [])([first])).toEqual({ photos: [], errors: [] });
});
