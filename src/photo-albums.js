const STORAGE_KEY = "stueradio:photo-albums";

export function initPhotoAlbums({ onPhotos, onSelect }) {
  const form = document.querySelector("#albumSettings");
  const status = document.querySelector("#albumStatus");
  const inputs = [...form.querySelectorAll("input[type=url]")];
  const save = document.querySelector("#saveAlbums");
  let links = [], controller, requestId = 0;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (Array.isArray(stored)) links = stored.filter((link) => typeof link === "string").slice(0, 3);
  } catch {}
  inputs.forEach((input, index) => { input.value = links[index] || ""; });

  function message(text) {
    status.textContent = text;
    document.querySelector("#albumFrameStatus").textContent = text;
  }
  async function refresh() {
    controller?.abort();
    const id = ++requestId;
    if (!links.length) { save.disabled = false; form.setAttribute("aria-busy", "false"); onPhotos([]); message(""); return; }
    controller = new AbortController();
    const abort = controller;
    const timeout = setTimeout(() => abort.abort(), 55000);
    save.disabled = true;
    form.setAttribute("aria-busy", "true");
    message("Henter billeder fra Google Fotos…");
    try {
      const response = await fetch("/api/photo-albums", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albums: links }), signal: controller.signal, cache: "no-store"
      });
      const data = await response.json();
      if (id !== requestId) return;
      if (!response.ok) throw new Error(data.error || data.errors?.join(" ") || "Albummerne kunne ikke hentes.");
      if (!Array.isArray(data.photos)) throw new Error("Albummerne kunne ikke læses.");
      // Refresh CDN addresses without changing the saved album links.
      onPhotos(data.photos);
      const updated = new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit" }).format(new Date());
      message(data.errors?.length ? data.errors.join(" ") : data.photos.length
        ? `Opdateret ${updated} · kontrolleres hvert 10. minut`
        : "Albummerne indeholder ingen billeder. Videoer vises ikke.");
    } catch (error) {
      if (id !== requestId) return;
      message(error.name === "AbortError" ? "Forbindelsen tog for lang tid. Prøv at opdatere igen." : error.message);
      // Keep the last successful slideshow when a refresh fails.
    } finally {
      clearTimeout(timeout);
      if (id === requestId) { save.disabled = false; form.setAttribute("aria-busy", "false"); }
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const next = [...new Set(inputs.map((input) => input.value.trim()).filter(Boolean))];
    for (const link of next) {
      let url;
      try { url = new URL(link); } catch { message("Indsæt et gyldigt Google Fotos-delingslink."); return; }
      if (url.protocol !== "https:" || !["photos.app.goo.gl", "photos.google.com"].includes(url.hostname)) {
        message("Brug delingslinks fra Google Fotos."); return;
      }
    }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); }
    catch { message("Linkene kunne ikke gemmes i denne browser. Kontrollér browserens lagerindstillinger."); return; }
    links = next;
    onPhotos([]);
    onSelect(links.length ? "google" : "local");
    refresh();
    if (!links.length) message("Albumlinks er fjernet. Dine lokale billeder er bevaret.");
  });
  document.querySelector("#refreshAlbums").addEventListener("click", refresh);
  setInterval(() => { if (!document.hidden && !save.disabled && links.length) refresh(); }, 10 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !save.disabled && links.length) refresh(); });
  if (links.length) refresh();
}
