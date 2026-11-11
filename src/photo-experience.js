export function initPhotoExperience({ getPhotos, getIndex, onNext, onEmpty }) {
  const screen = document.querySelector("#photoScreensaver");
  const image = document.querySelector("#screensaverImage");
  const launcher = document.querySelector("#showSlideshow");
  const keepAwake = document.querySelector("#keepAwake");
  const wakeStatus = document.querySelector("#wakeStatus");
  const backgrounds = [document.querySelector("main"), document.querySelector(".appbar")];
  let active = false, idleTimer, slideTimer, previousFocus, ownedFullscreen = false, wasFullscreen = false;
  let wakeLock = null, wakeRequest = null, dismissedPointer = false;
  let gesture = null;
  let failedUntil = 0;
  const pointers = new Set();
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
    // The manual setting still uses a gentle default in screensaver mode.
    const interval = Number(document.querySelector("#photoInterval").value) || 12000;
    slideTimer = setInterval(() => { if (!document.hidden && active) onNext(1); }, interval);
  }
  function schedule() {
    clearTimeout(idleTimer);
    if (!active && !document.hidden) idleTimer = setTimeout(() => {
      const editing = document.activeElement?.closest("input, select, textarea, [contenteditable=true]");
      if (getPhotos().length && Date.now() >= failedUntil && document.querySelector("#settings").hidden && !editing) open(false);
      else schedule();
    }, 15000);
  }
  function open(manual = false) {
    if (active || document.hidden) return;
    if (!getPhotos().length) { if (manual) onEmpty(); return; }
    active = true;
    launcher.setAttribute("aria-expanded", "true");
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
    gesture = null;
    pointers.clear();
    launcher.setAttribute("aria-expanded", "false");
    clearInterval(slideTimer);
    screen.hidden = true;
    document.body.classList.remove("screensaver-active");
    backgrounds.forEach((element) => { element.inert = false; });
    if (ownedFullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    ownedFullscreen = false;
    previousFocus?.focus?.({ preventScroll: true });
    schedule();
  }
  image.addEventListener("error", () => { failedUntil = Date.now() + 60000; close(); image.removeAttribute("src"); document.querySelector("#photoStatus").textContent = "Billedet kunne ikke hentes. Prøv at opdatere albummerne."; });
  image.draggable = false;
  launcher.addEventListener("click", () => open(true));
  document.querySelector("#closeScreensaver").addEventListener("click", close);
  screen.addEventListener("contextmenu", (event) => event.preventDefault());
  document.addEventListener("fullscreenchange", () => { if (active && wasFullscreen && !document.fullscreenElement) close(); });
  document.addEventListener("pointerdown", (event) => {
    requestWakeLock();
    if (active) {
      if (event.button !== 0) return;
      dismissedPointer = false;
      pointers.add(event.pointerId);
      gesture = pointers.size === 1 ? { id: event.pointerId, x: event.clientX, y: event.clientY, maxDistance: 0 } : null;
      event.preventDefault();
      try { screen.setPointerCapture(event.pointerId); } catch {}
    }
    else { dismissedPointer = false; schedule(); }
  }, true);
  document.addEventListener("pointerup", (event) => {
    if (!active) return;
    pointers.delete(event.pointerId);
    dismissedPointer = true;
    event.preventDefault();
    event.stopPropagation();
    if (!gesture || gesture.id !== event.pointerId) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    const distance = Math.max(gesture.maxDistance, Math.hypot(dx, dy));
    gesture = null;
    if (Math.abs(dx) >= 50 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      onNext(dx < 0 ? 1 : -1);
      startSlides();
    } else if (distance < 12) close();
  }, true);
  document.addEventListener("pointercancel", (event) => { pointers.delete(event.pointerId); gesture = null; dismissedPointer = true; }, true);
  document.addEventListener("click", (event) => {
    if (dismissedPointer) { dismissedPointer = false; event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  document.addEventListener("pointermove", (event) => {
    if (!active) schedule();
    else if (gesture?.id === event.pointerId) gesture.maxDistance = Math.max(gesture.maxDistance, Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y));
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
