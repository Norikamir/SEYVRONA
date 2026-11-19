gsap.registerPlugin(ScrollTrigger);

const pinWrap = document.querySelector(".tech-process-pin");
const processLabel = document.getElementById("processLabel");
const processTrust = document.getElementById("processTrust");
const processStepNumber = document.getElementById("processStepNumber");
const progressBar = document.getElementById("processProgressBar");
const canvas = document.getElementById("processCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const preloader = document.getElementById("videoPreloader");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;


// ==========================================================
//        SPRITE SHEETS — frame layout
// ==========================================================

const FRAME_COUNT = 342;

const SHEET_COLS = 5;
const SHEET_ROWS = 9;                              // rows of a full sheet (part0–part6)
const FRAMES_PER_SHEET = SHEET_COLS * SHEET_ROWS;  // 45
const SHEET_COUNT = Math.ceil(FRAME_COUNT / FRAMES_PER_SHEET); // 8 (part7 holds 27 frames in 6 rows)

const OUTRO_FRAME_COUNT = 36;
const OUTRO_COLS = 6;
const OUTRO_ROWS = 6;

const TOTAL_FRAMES = FRAME_COUNT + OUTRO_FRAME_COUNT;

// One frame of the main sequence is 760×428 (3800×3852 sheet / 5×9).
// Every sheet computes its own frame size from its own grid, so the
// result no longer depends on which file finishes loading first.
const FRAME_W = 760;
const FRAME_H = 428;

const sources = [];
for (let s = 0; s < SHEET_COUNT; s++) {
  const frames = Math.min(FRAMES_PER_SHEET, FRAME_COUNT - s * FRAMES_PER_SHEET);
  sources.push({
    url: `assets/videos/compressed/spritesheet_q60_part${s}.webp`,
    cols: SHEET_COLS,
    rows: Math.ceil(frames / SHEET_COLS),
    first: s * FRAMES_PER_SHEET,
    frames
  });
}
sources.push({
  url: "assets/videos/spritesheet-outro_optimized.webp",
  cols: OUTRO_COLS,
  rows: OUTRO_ROWS,
  first: FRAME_COUNT,
  frames: OUTRO_FRAME_COUNT,
  outro: true
});
sources.forEach((src, i) => {
  src.index = i;
  src.status = "idle";     // idle → loading → loaded | error
  src.blob = null;         // compressed file kept in memory: re-decoding never re-downloads
  src.frameImgs = null;    // decoded frames (ImageBitmap[]) or { img } fallback
  src.decoding = null;
  src.frameW = 0;
  src.frameH = 0;
});

function sourceIndexForFrame(index) {
  return index >= FRAME_COUNT ? sources.length - 1 : Math.floor(index / FRAMES_PER_SHEET);
}


// ==========================================================
//        LOADING — prioritised queue, timeout, one retry
// ==========================================================

const FETCH_TIMEOUT_MS = 45000;
const MAX_PARALLEL = 2;
const canBitmap = typeof window.createImageBitmap === "function";
const lowMemory = window.matchMedia("(pointer: coarse)").matches || (navigator.deviceMemory && navigator.deviceMemory <= 4);
// How many sheets around the current one stay decoded (≈58 MB each).
const KEEP_RADIUS = lowMemory ? 1 : 2;

let activeFetches = 0;
const queue = sources.map((s) => s.index);

function fetchWithTimeout(url) {
  const controller = "AbortController" in window ? new AbortController() : null;
  const timer = setTimeout(() => controller && controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, controller ? { signal: controller.signal } : undefined)
    .then((res) => {
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.permanent = res.status >= 400 && res.status < 500;
        throw err;
      }
      return res.blob();
    })
    .finally(() => clearTimeout(timer));
}

function loadSource(src) {
  src.status = "loading";
  activeFetches++;
  // One retry for network errors and timeouts; a 404 will not fix itself.
  const attempt = (retry) => fetchWithTimeout(src.url).catch((err) => {
    if (retry && !err.permanent) return new Promise((r) => setTimeout(r, 1500)).then(() => attempt(false));
    throw err;
  });
  attempt(true)
    .then((blob) => {
      src.blob = blob;
      src.status = "loaded";
      onSourceLoaded(src);
    })
    .catch((err) => {
      src.status = "error";
      console.warn("Sprite sheet failed to load:", src.url, err && err.message);
      onSourceFailed(src);
    })
    .finally(() => {
      activeFetches--;
      pumpQueue();
    });
}

function pumpQueue() {
  while (activeFetches < MAX_PARALLEL && queue.length) {
    const src = sources[queue.shift()];
    if (src.status === "idle") loadSource(src);
  }
}

// Move a sheet to the front of the queue when the user scrolls to it early.
function prioritise(index) {
  const pos = queue.indexOf(index);
  if (pos > 0) {
    queue.splice(pos, 1);
    queue.unshift(index);
  }
}


// ==========================================================
//        DECODING — off the main thread, kept near the playhead
// ==========================================================

// Decodes run one at a time: a decoded sheet is ~58 MB, so this keeps the
// memory peak low on phones and leaves the CPU to scrolling.
let decodeChain = Promise.resolve();

function stillNeeded(src) {
  return drawnFrame < 0 || Math.abs(src.index - sourceIndexForFrame(wantedFrame)) <= KEEP_RADIUS;
}

function decodeSource(src) {
  if (src.frameImgs || src.decoding || !src.blob) return src.decoding;
  src.decoding = decodeChain = decodeChain
    .then(() => (stillNeeded(src) ? (canBitmap ? decodeWithBitmap(src) : decodeWithImage(src)) : null))
    .catch(() => decodeWithImage(src))
    .then(() => {
      src.decoding = null;
      onSourceDecoded(src);
    });
  return src.decoding;
}

function decodeWithBitmap(src) {
  return createImageBitmap(src.blob).then((sheet) => {
    src.frameW = sheet.width / src.cols;
    src.frameH = sheet.height / src.rows;
    // Small per-frame bitmaps: drawing a frame never uploads the whole
    // 3800×3852 sheet, so there is no hitch when crossing sheets.
    const jobs = [];
    for (let i = 0; i < src.frames; i++) {
      const col = i % src.cols;
      const row = Math.floor(i / src.cols);
      jobs.push(createImageBitmap(sheet, col * src.frameW, row * src.frameH, src.frameW, src.frameH));
    }
    return Promise.all(jobs).then((frames) => {
      if (sheet.close) sheet.close();
      src.frameImgs = frames;
    });
  });
}

// Fallback for browsers without createImageBitmap: original <img> path.
function decodeWithImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(src.blob);
    const done = () => {
      src.frameW = img.naturalWidth / src.cols;
      src.frameH = img.naturalHeight / src.rows;
      src.frameImgs = { img };
      resolve();
    };
    img.onload = () => {
      if (img.decode) img.decode().then(done, done);
      else done();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      src.status = "error";
      resolve();
    };
    img.src = url;
  });
}

function releaseSource(src) {
  if (!src.frameImgs) return;
  if (Array.isArray(src.frameImgs)) src.frameImgs.forEach((b) => b.close && b.close());
  src.frameImgs = null;
}

function updateDecodedWindow(centerIndex) {
  sources.forEach((src) => {
    const distance = Math.abs(src.index - centerIndex);
    if (distance <= KEEP_RADIUS) {
      if (src.status === "loaded") decodeSource(src);
      else if (src.status === "idle") prioritise(src.index);
    } else if (src.frameImgs && Array.isArray(src.frameImgs)) {
      // Decoded pixels are dropped far from the playhead; the compressed
      // file stays in memory, so scrolling back only needs a quick re-decode.
      releaseSource(src);
    }
  });
}


// ==========================================================
//        DRAWING
// ==========================================================

let currentSource = -1;
let drawnFrame = -1;
let wantedFrame = 0;

function isReady(src) {
  return !!src.frameImgs;
}

function nearestReadyFrame(index) {
  const own = sources[sourceIndexForFrame(index)];
  if (isReady(own)) return index;
  for (let d = 1; d < TOTAL_FRAMES; d++) {
    const before = index - d;
    const after = index + d;
    if (before >= 0 && isReady(sources[sourceIndexForFrame(before)])) return before;
    if (after < TOTAL_FRAMES && isReady(sources[sourceIndexForFrame(after)])) return after;
  }
  return -1;
}

function drawFrame(index) {
  if (!ctx) return;
  wantedFrame = index;
  const target = nearestReadyFrame(index);
  if (target < 0 || target === drawnFrame) return;

  const src = sources[sourceIndexForFrame(target)];
  const local = target - src.first;
  const w = src.frameW;
  const h = src.frameH;

  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  if (Array.isArray(src.frameImgs)) {
    ctx.drawImage(src.frameImgs[local], 0, 0, w, h);
  } else {
    const col = local % src.cols;
    const row = Math.floor(local / src.cols);
    ctx.drawImage(src.frameImgs.img, col * w, row * h, w, h, 0, 0, w, h);
  }
  drawnFrame = target;

  const isOutro = !!src.outro;
  if (src.index !== currentSource) {
    currentSource = src.index;
    const frameEl = canvas.closest(".process-video-frame");
    const infoEl = document.querySelector(".process-info");
    if (frameEl) frameEl.classList.toggle("fullscreen-outro", isOutro);
    if (infoEl) infoEl.classList.toggle("hide-outro", isOutro);
  }
}


// ==========================================================
//        LOADING STATES
// ==========================================================

function hidePreloader() {
  if (preloader) preloader.classList.add("hidden");
}

function showLoadError() {
  if (!preloader) return;
  preloader.classList.remove("hidden");
  preloader.classList.add("is-error");
  let msg = preloader.querySelector(".video-preloader-message");
  if (!msg) {
    msg = document.createElement("p");
    msg.className = "video-preloader-message";
    msg.setAttribute("role", "status");
    preloader.appendChild(msg);
  }
  msg.textContent = "The animation couldn't load. Please check your connection and refresh the page.";
}

function onSourceLoaded(src) {
  if (stillNeeded(src)) decodeSource(src);
}

function onSourceDecoded(src) {
  if (src.status === "error" && !src.frameImgs) {
    onSourceFailed(src);
    return;
  }
  if (src.frameImgs) {
    if (drawnFrame < 0) hidePreloader();
    // Redraw when the frame the user is looking at just became available
    // (or a closer substitute did).
    if (drawnFrame !== wantedFrame) drawnFrame = -1;
    drawFrame(wantedFrame);
  }
}

function onSourceFailed() {
  if (sources.every((s) => s.status === "error")) {
    showLoadError();
    return;
  }
  // Nothing on screen yet and nothing left that could still arrive.
  const pending = sources.some((s) => s.status === "idle" || s.status === "loading" || s.decoding || isReady(s));
  if (drawnFrame < 0 && !pending) showLoadError();
}


// ==========================================================
//        SCROLL-DRIVEN PLAYBACK
// ==========================================================

if (pinWrap && canvas) {

const labels = [
  "Raw Silicon Ingot",
  "Wafer Slicing",
  "Cell Formation",
  "Coating Application",
  "Ready to Power",
  "Powered by Seyvrona"
];

const trustLines = [
  "99.999% purity — the foundation of a 25-year lifespan",
  "Every slice checked for micro-cracks before assembly",
  "Each cell individually tested for energy conversion efficiency",
  "Laminated and sealed to withstand hail, moisture, and UV",
  "Certified, warrantied, and ready to power your home",
  "From raw silicon to renewable power — engineered by Seyvrona"
];

  const pad = (n) => String(n).padStart(2, "0");
  let currentStage = -1;

  function setStage(index) {
    if (index === currentStage) return;
    currentStage = index;
    processLabel.textContent = labels[index];
    processTrust.textContent = trustLines[index];
    processStepNumber.textContent = `${pad(index + 1)} / ${pad(labels.length)}`;
  }

  // Stable canvas size before anything is drawn (no layout jump).
  canvas.width = FRAME_W;
  canvas.height = FRAME_H;
  setStage(0);

  // The playhead is a real tween, so `scrub` smooths the frames themselves
  // (with an empty timeline it only delayed nothing). Frame index, progress
  // bar and stage label are all derived from the same smoothed value.
  const playhead = { frame: 0 };
  let lastSheet = -1;

  function render() {
    const frameIndex = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(playhead.frame)));
    const progress = playhead.frame / (TOTAL_FRAMES - 1);
    progressBar.style.width = (progress * 100) + "%";

    const sheet = sourceIndexForFrame(frameIndex);
    if (sheet !== lastSheet) {
      lastSheet = sheet;
      updateDecodedWindow(sheet);
      pumpQueue();
    }
    drawFrame(frameIndex);

    const stageIndex = Math.min(labels.length - 1, Math.floor(progress * labels.length));
    setStage(stageIndex);
  }

  // Created right away (not after 12.8 MB of images), so the pinned
  // section has its final height from the first paint.
  gsap.to(playhead, {
    frame: TOTAL_FRAMES - 1,
    ease: "none",
    onUpdate: render,
    scrollTrigger: {
      trigger: ".tech-process-pin",
      start: "top top",
      end: "+=4600",
      pin: true,
      scrub: prefersReducedMotion ? true : 1.5
    }
  });

  updateDecodedWindow(0);
  pumpQueue();

  // Re-measure once web fonts have changed the intro's height.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
  window.addEventListener("load", () => ScrollTrigger.refresh());

}

if (prefersReducedMotion) {
  gsap.set(".tech-process-intro h1 .word, .scroll-indicator", { opacity: 1 });
} else {
  gsap.set(".tech-process-intro h1 .word", {
    opacity: 0,
    y: 25,
    filter: "blur(12px)"
  });

  gsap.to(".tech-process-intro h1 .word", {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    duration: 1,
    ease: "power3.out",
    stagger: 0.08,
    delay: 0.3
  });

  gsap.to(".scroll-indicator", {
    opacity: 1,
    duration: 0.8,
    delay: 1.3,
    ease: "power2.out"
  });
}


// Re-measure triggers after a rotation / width change. ScrollTrigger can skip a
// second resize event on phones, which leaves trigger positions from the old layout.
if (window.ScrollTrigger) {
  let lastWidth = window.innerWidth;
  let resizeTimer;
  const remeasure = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (window.innerWidth !== lastWidth) {
        lastWidth = window.innerWidth;
        ScrollTrigger.refresh();
      }
    }, 300);
  };
  window.addEventListener("resize", remeasure);
  window.addEventListener("orientationchange", remeasure);
}
