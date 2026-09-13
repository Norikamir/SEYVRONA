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
const SPRITE_COLS = 18;
const SPRITE_ROWS = 19;

const OUTRO_FRAME_COUNT = 36;
const OUTRO_COLS = 6;
const OUTRO_ROWS = 6;

const TOTAL_FRAMES = FRAME_COUNT + OUTRO_FRAME_COUNT;

const sprite = new Image();
const outroSprite = new Image();
let frameW = 0, frameH = 0;
let outroFrameW = 0, outroFrameH = 0;



function loadSprite() {
  return Promise.all([
    new Promise(resolve => {
      sprite.onload = () => {
        frameW = sprite.naturalWidth / SPRITE_COLS;
        frameH = sprite.naturalHeight / SPRITE_ROWS;
        resolve();
      };
      sprite.src = "assets/videos/compressed/spritesheet_q60.jpg";
    }),
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
  const img = isOutro ? outroSprite : sprite;
  const cols = isOutro ? OUTRO_COLS : SPRITE_COLS;
  const fw = isOutro ? outroFrameW : frameW;
  const fh = isOutro ? outroFrameH : frameH;
  const localIndex = isOutro ? index - FRAME_COUNT : index;

  if (!fw) return;

  const col = localIndex % cols;
  const row = Math.floor(localIndex / cols);

  if (canvas.width !== fw) {
    canvas.width = fw;
    canvas.height = fh;
  }

  ctx.drawImage(
  img,
  col * fw, row * fh, fw, fh,
  0, 0, fw, fh
);

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