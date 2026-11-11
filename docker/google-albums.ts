import { fetchImageUrls } from "@marcus5914/google-photos-album-image-url-fetch";

export function validateAlbumLinks(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 3) throw new Error("Angiv højst tre albumlinks.");
  return [...new Set(value.map((value) => {
    if (typeof value !== "string" || value.length > 2048) throw new Error("Ugyldigt albumlink.");
    let url: URL;
    try { url = new URL(value.trim()); } catch { throw new Error("Indsæt et gyldigt Google Fotos-delingslink."); }
    const short = url.hostname === "photos.app.goo.gl" && /^\/[A-Za-z0-9_-]+\/?$/.test(url.pathname) && !url.search;
    const shared = url.hostname === "photos.google.com" && /^\/share\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
      && [...url.searchParams.keys()].every((key) => key === "key");
    if (url.protocol !== "https:" || url.username || url.password || url.port || (!short && !shared)) {
      throw new Error("Brug et delingslink fra photos.app.goo.gl eller photos.google.com/share/.");
    }
    url.hash = "";
    return url.href;
  }))];
}

export function createAlbumReader(load: typeof fetchImageUrls = fetchImageUrls) {
  const cache = new Map<string, { at: number; photos: string[] }>();
  const pending = new Map<string, Promise<string[]>>();
  async function read(link: string) {
    const cached = cache.get(link);
    if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.photos;
    if (pending.has(link)) return pending.get(link)!;
    const request = (async () => {
      const items = await load(link, AbortSignal.timeout(45000));
      if (!items) throw new Error("Albummet kunne ikke læses. Kontrollér linkdeling i Google Fotos.");
      const photos = [...new Set(items.filter((item) => !item.isVideo).flatMap((item) => {
        try {
          const url = new URL(item.posterUrl || item.url);
          if (url.protocol !== "https:" || !/^lh\d+\.googleusercontent\.com$/.test(url.hostname) || url.username || url.password || url.port) return [];
          return [`${url.href}=w1600-h1200`];
        } catch { return []; }
      }))];
      if (cache.size >= 32) cache.delete(cache.keys().next().value!);
      cache.set(link, { at: Date.now(), photos });
      return photos;
    })();
    pending.set(link, request);
    try { return await request; } finally { pending.delete(link); }
  }
  return async (links: string[]) => {
    const results = await Promise.allSettled(links.map(read));
    const photos = new Set<string>();
    const errors: string[] = [];
    results.forEach((result, index) => {
      if (result.status === "fulfilled") result.value.forEach((photo) => photos.add(photo));
      else errors.push(`Album ${index + 1} kunne ikke hentes. Kontrollér linkdeling, og prøv igen.`);
    });
    return { photos: [...photos], errors };
  };
}
