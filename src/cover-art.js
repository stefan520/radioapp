/**
 * Gratis coveropslag til Stueradio
 * Kilder: MusicBrainz + Cover Art Archive
 * Ingen API-nøgle og ingen betaling.
 *
 * Brug:
 *   const coverUrl = await getFreeCoverArt({
 *     title: "Radio Ga Ga",
 *     artist: "Queen",
 *     fallback: "/logos/dr-p3.png"
 *   });
 *   document.querySelector("#now-playing-cover").src = coverUrl;
 */

const MB_ENDPOINT = "https://musicbrainz.org/ws/2/recording/";
const CACHE_PREFIX = "stueradio-cover-v1:";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 dage
const MIN_MB_INTERVAL_MS = 1100; // respekter MusicBrainz' ca. 1 req./sek.

let lastMbRequestAt = 0;
let queue = Promise.resolve();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeText(value = "") {
  return value
    .toLowerCase()
    .replace(/\s*\([^)]*(radio edit|remaster(?:ed)?|live|version|mix)[^)]*\)\s*/gi, " ")
    .replace(/\s*-\s*(radio edit|remaster(?:ed)?|live|version|mix).*$/gi, "")
    .replace(/\bfeat\.?\b.*$/gi, "")
    .replace(/\bft\.?\b.*$/gi, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function cacheKey(title, artist) {
  return CACHE_PREFIX + encodeURIComponent(
    `${normalizeText(artist)}|${normalizeText(title)}`
  );
}

function readCache(title, artist) {
  try {
    const raw = localStorage.getItem(cacheKey(title, artist));
    if (!raw) return null;
    const item = JSON.parse(raw);
    if (!item || Date.now() - item.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(title, artist));
      return null;
    }
    return item.url || null;
  } catch {
    return null;
  }
}

function writeCache(title, artist, url) {
  try {
    localStorage.setItem(
      cacheKey(title, artist),
      JSON.stringify({ url, savedAt: Date.now() })
    );
  } catch {
    // Appen virker stadig, selv hvis lokal cache er slået fra.
  }
}

function escapeMbQuery(value = "") {
  return value.replace(/([+\-&|!(){}\[\]^"~*?:\\/])/g, "\\$1");
}

async function throttledMusicBrainzFetch(url) {
  queue = queue.then(async () => {
    const wait = Math.max(0, MIN_MB_INTERVAL_MS - (Date.now() - lastMbRequestAt));
    if (wait) await sleep(wait);

    lastMbRequestAt = Date.now();
    return fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });
  });

  return queue;
}

function scoreCandidate(recording, wantedTitle, wantedArtist) {
  const title = normalizeText(recording?.title || "");
  const wantedT = normalizeText(wantedTitle);
  const artists = (recording?.["artist-credit"] || [])
    .map(a => a?.artist?.name || a?.name || "")
    .join(" ");
  const artist = normalizeText(artists);
  const wantedA = normalizeText(wantedArtist);

  let score = Number(recording?.score || 0);

  if (title === wantedT) score += 80;
  else if (title.includes(wantedT) || wantedT.includes(title)) score += 30;

  if (artist === wantedA) score += 80;
  else if (artist.includes(wantedA) || wantedA.includes(artist)) score += 35;

  return score;
}

async function imageExists(url) {
  return new Promise(resolve => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.onload = img.onerror = null;
      resolve(false);
    }, 6500);

    img.onload = () => {
      clearTimeout(timer);
      resolve(true);
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };

    img.referrerPolicy = "no-referrer";
    img.src = url;
  });
}

async function findCoverUrl(title, artist) {
  const query =
    `recording:"${escapeMbQuery(title)}" AND artist:"${escapeMbQuery(artist)}"`;

  const url =
    `${MB_ENDPOINT}?query=${encodeURIComponent(query)}` +
    `&fmt=json&limit=8`;

  const response = await throttledMusicBrainzFetch(url);
  if (!response.ok) return null;

  const data = await response.json();
  const recordings = Array.isArray(data?.recordings) ? data.recordings : [];

  recordings.sort(
    (a, b) => scoreCandidate(b, title, artist) - scoreCandidate(a, title, artist)
  );

  for (const recording of recordings.slice(0, 4)) {
    const releases = Array.isArray(recording?.releases) ? recording.releases : [];

    releases.sort((a, b) => {
      const aOfficial = a?.status === "Official" ? 1 : 0;
      const bOfficial = b?.status === "Official" ? 1 : 0;
      return bOfficial - aOfficial;
    });

    for (const release of releases.slice(0, 5)) {
      if (!release?.id) continue;

      const cover = `https://coverartarchive.org/release/${release.id}/front-500`;
      if (await imageExists(cover)) return cover;

      const groupId = release?.["release-group"]?.id;
      if (groupId) {
        const groupCover =
          `https://coverartarchive.org/release-group/${groupId}/front-500`;
        if (await imageExists(groupCover)) return groupCover;
      }
    }
  }

  return null;
}

export async function getFreeCoverArt({ title, artist, fallback = "" }) {
  title = String(title || "").trim();
  artist = String(artist || "").trim();

  if (!title || !artist) return fallback;

  const cached = readCache(title, artist);
  if (cached) return cached;

  try {
    const cover = await findCoverUrl(title, artist);
    const result = cover || fallback;
    if (result) writeCache(title, artist, result);
    return result;
  } catch (error) {
    console.warn("Coveropslag fejlede:", error);
    return fallback;
  }
}

export async function updateNowPlayingCover({
  imgElement,
  title,
  artist,
  stationLogo
}) {
  if (!imgElement) return;

  if (stationLogo) imgElement.src = stationLogo;

  const cover = await getFreeCoverArt({
    title,
    artist,
    fallback: stationLogo
  });

  const expected = `${normalizeText(artist)}|${normalizeText(title)}`;
  const current = imgElement.dataset.trackKey;

  if (!current || current === expected) {
    imgElement.dataset.trackKey = expected;
    if (cover) imgElement.src = cover;
  }
}
