gsap.registerPlugin(ScrollTrigger);

const pinWrap = document.querySelector(".tech-process-pin");
const processLabel = document.getElementById("processLabel");
const processTrust = document.getElementById("processTrust");
const processStepNumber = document.getElementById("processStepNumber");
const progressBar = document.getElementById("processProgressBar");
const canvas = document.getElementById("processCanvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const preloader = document.getElementById("videoPreloader");


const FRAME_COUNT = 342;

const SHEET_COLS = 5;
const SHEET_ROWS = 9;
const FRAMES_PER_SHEET = SHEET_COLS * SHEET_ROWS; // 45
const SHEET_COUNT = Math.ceil(FRAME_COUNT / FRAMES_PER_SHEET); // 8

const OUTRO_FRAME_COUNT = 36;
const OUTRO_COLS = 6;
const OUTRO_ROWS = 6;

const TOTAL_FRAMES = FRAME_COUNT + OUTRO_FRAME_COUNT;

const sheets = [];
const outroSprite = new Image();
let frameW = 0, frameH = 0;
let outroFrameW = 0, outroFrameH = 0;



function loadSprite() {
  const sheetPromises = [];
  for (let s = 0; s < SHEET_COUNT; s++) {
    const img = new Image();
    sheets.push(img);
    sheetPromises.push(new Promise(resolve => {
      img.onload = () => {
        if (!frameW) {
          frameW = img.naturalWidth / SHEET_COLS;
          frameH = img.naturalHeight / SHEET_ROWS;
        }
        resolve();
      };
      img.src = `assets/videos/compressed/spritesheet_q60_part${s}.jpg`;
    }));
  }

  return Promise.all([
    Promise.all(sheetPromises),
    new Promise(resolve => {
      outroSprite.onload = () => {
        outroFrameW = outroSprite.naturalWidth / OUTRO_COLS;
        outroFrameH = outroSprite.naturalHeight / OUTRO_ROWS;
        resolve();
      };
      outroSprite.src = "assets/videos/spritesheet-outro_optimized.webp";
    })
  ]);
}


function drawFrame(index) {
  if (!ctx) return;

  const isOutro = index >= FRAME_COUNT;

  if (isOutro) {
    const localIndex = index - FRAME_COUNT;
    const col = localIndex % OUTRO_COLS;
    const row = Math.floor(localIndex / OUTRO_COLS);
    if (!outroFrameW) return;

    if (canvas.width !== outroFrameW) {
      canvas.width = outroFrameW;
      canvas.height = outroFrameH;
    }

    ctx.drawImage(
      outroSprite,
      col * outroFrameW, row * outroFrameH, outroFrameW, outroFrameH,
      0, 0, outroFrameW, outroFrameH
    );
  } else {
    const sheetIndex = Math.floor(index / FRAMES_PER_SHEET);
    const localIndex = index % FRAMES_PER_SHEET;
    const col = localIndex % SHEET_COLS;
    const row = Math.floor(localIndex / SHEET_COLS);
    if (!frameW) return;

    if (canvas.width !== frameW) {
      canvas.width = frameW;
      canvas.height = frameH;
    }

    ctx.drawImage(
      sheets[sheetIndex],
      col * frameW, row * frameH, frameW, frameH,
      0, 0, frameW, frameH
    );
  }

  const frameEl = canvas.closest(".process-video-frame");
  const infoEl = document.querySelector(".process-info");
  if (frameEl) frameEl.classList.toggle("fullscreen-outro", isOutro);
  if (infoEl) infoEl.classList.toggle("hide-outro", isOutro);
}

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

  function setStage(index) {
    if (processLabel.textContent !== labels[index]) {
      processLabel.textContent = labels[index];
      processTrust.textContent = trustLines[index];
      processStepNumber.textContent = `0${index + 1} / 0${labels.length}`;
    }
  }

  loadSprite().then(() => {

    if (preloader) preloader.classList.add("hidden");

    drawFrame(0);

    gsap.timeline({
      scrollTrigger: {
        trigger: ".tech-process-pin",
        start: "top top",
        end: "+=4600",
        pin: true,
        scrub: 1.5,
        onUpdate: (self) => {
          progressBar.style.width = (self.progress * 100) + "%";

          const frameIndex = Math.min(
  TOTAL_FRAMES - 1,
  Math.floor(self.progress * TOTAL_FRAMES)
);
drawFrame(frameIndex);

const stageIndex = Math.min(
  labels.length - 1,
  Math.floor(self.progress * labels.length)
);
setStage(stageIndex);
        }
      }
    });

  });

}

gsap.set(".tech-process-intro h2 .word", {
  opacity: 0,
  y: 25,
  filter: "blur(12px)"
});

gsap.to(".tech-process-intro h2 .word", {
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