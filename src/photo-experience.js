export function initPhotoExperience({ getPhotos, getIndex, onNext }) {
  const screen = document.querySelector("#photoScreensaver");
  const image = document.querySelector("#screensaverImage");
  const stage = document.querySelector("#photoStage");
  const keepAwake = document.querySelector("#keepAwake");
  const wakeStatus = document.querySelector("#wakeStatus");
  const backgrounds = [document.querySelector("main"), document.querySelector(".appbar")];
  let active = false, idleTimer, slideTimer, previousFocus, ownedFullscreen = false, wasFullscreen = false;
  let wakeLock = null, wakeRequest = null, dismissedPointer = false;
  try { keepAwake.checked = localStorage.getItem("stueradio:keep-awake") !== "false"; } catch {}

  function showWakeStatus() {
    wakeStatus.textContent = !keepAwake.checked ? "Skærmen følger enhedens normale indstillinger."
      : !navigator.wakeLock ? "Denne browser kan ikke holde skærmen tændt."
      : wakeLock && !wakeLock.released ? "Skærmen holdes tændt, mens appen er synlig."
      : "Skærmlåsen er ikke aktiv. Tryk på skærmen for at prøve igen.";
  }
  async function requestWakeLock() {
    if (!keepAwake.checked || document.hidden || !navigator.wakeLock || wakeLock && !wakeLock.released) { showWakeStatus(); return; }
    if (wakeRequest) return wakeRequest;
    wakeRequest = Promise.resolve().then(async () => {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (!keepAwake.checked || document.hidden) { await lock.release(); return; }
        wakeLock = lock;
        lock.addEventListener("release", () => { if (wakeLock === lock) wakeLock = null; showWakeStatus(); });
      } catch {}
    }).finally(() => { showWakeStatus(); wakeRequest = null; });
    return wakeRequest;
  }
  keepAwake.addEventListener("change", () => {
    try { localStorage.setItem("stueradio:keep-awake", String(keepAwake.checked)); } catch {}
    if (!keepAwake.checked) { wakeLock?.release().catch(() => {}); showWakeStatus(); }
    else requestWakeLock();
  });

  function refresh() {
    if (!active) return;
    const photos = getPhotos();
    if (!photos.length) { close(); return; }
    const url = photos[getIndex()] || photos[0];
    if (image.getAttribute("src") !== url) image.src = url;
    image.alt = `Billede ${getIndex() + 1} af ${photos.length}`;
    document.querySelector("#screensaverCount").textContent = `${getIndex() + 1} / ${photos.length}`;
  }
  function startSlides() {
    clearInterval(slideTimer);
    // Even with a paused preview, the screensaver remains a slideshow.
    const interval = Number(document.querySelector("#photoInterval").value) || 12000;
    slideTimer = setInterval(() => { if (!document.hidden && active) onNext(1); }, interval);
  }
  function schedule() {
    clearTimeout(idleTimer);
    if (!active && !document.hidden) idleTimer = setTimeout(() => {
      const editing = document.activeElement?.closest("input, select, textarea, [contenteditable=true]");
      const ready = stage.querySelector("img")?.naturalWidth > 0;
      if (getPhotos().length && ready && document.querySelector("#settings").hidden && !editing) open(false);
      else schedule();
    }, 10000);
  }
  function open(manual = false) {
    if (active || document.hidden || !getPhotos().length) return;
    active = true;
    clearTimeout(idleTimer);
    previousFocus = document.activeElement;
    wasFullscreen = Boolean(document.fullscreenElement);
    screen.hidden = false;
    document.body.classList.add("screensaver-active");
    backgrounds.forEach((element) => { element.inert = true; });
    refresh();
    document.querySelector("#closeScreensaver").focus({ preventScroll: true });
    startSlides();
    requestWakeLock();
    if (manual && !document.fullscreenElement && document.fullscreenEnabled) {
      ownedFullscreen = true;
      document.documentElement.requestFullscreen().then(() => {
        if (!active && document.fullscreenElement) { document.exitFullscreen().catch(() => {}); return; }
        wasFullscreen = true;
      }).catch(() => { ownedFullscreen = false; });
    }
  }
  function close() {
    if (!active) return;
    active = false;
    clearInterval(slideTimer);
    screen.hidden = true;
    document.body.classList.remove("screensaver-active");
    backgrounds.forEach((element) => { element.inert = false; });
    if (ownedFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    ownedFullscreen = false;
    previousFocus?.focus?.({ preventScroll: true });
    schedule();
  }
  image.addEventListener("error", () => { close(); document.querySelector("#photoStatus").textContent = "Billedet kunne ikke hentes. Prøv at opdatere albummerne."; });
  stage.addEventListener("click", () => open(true));
  screen.addEventListener("click", close);
  document.addEventListener("fullscreenchange", () => { if (active && wasFullscreen && !document.fullscreenElement) close(); });
  document.addEventListener("pointerdown", (event) => {
    requestWakeLock();
    if (active) { dismissedPointer = true; event.preventDefault(); event.stopPropagation(); close(); }
    else { dismissedPointer = false; schedule(); }
  }, true);
  document.addEventListener("click", (event) => {
    if (dismissedPointer) { dismissedPointer = false; event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener("pointermove", (event) => {
    if (!active) schedule();
    else if (event.pointerType === "mouse" && Math.abs(event.movementX) + Math.abs(event.movementY) > 3) close();
  }, { passive: true });
  document.addEventListener("keydown", (event) => {
    if (!active) { schedule(); return; }
    if (event.key === "Tab") { event.preventDefault(); document.querySelector("#closeScreensaver").focus(); }
    else if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); onNext(event.key === "ArrowRight" ? 1 : -1); startSlides(); }
    else { event.preventDefault(); close(); }
  }, true);
  document.addEventListener("scroll", () => { if (!active) schedule(); }, { passive: true, capture: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { clearTimeout(idleTimer); wakeLock?.release().catch(() => {}); }
    else { requestWakeLock(); schedule(); }
  });
  document.querySelector("#photoInterval").addEventListener("change", () => { if (active) startSlides(); });
  showWakeStatus();
  requestWakeLock();
  schedule();
  return { refresh, isActive: () => active };
}
