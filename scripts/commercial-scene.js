// ==========================================================
// COMMERCIAL ENERGY SCENE
// ==========================================================

const canvasCommercial = document.querySelector("#webgl-commercial");

if (canvasCommercial) {

const scene = new THREE.Scene();


const camera = new THREE.PerspectiveCamera(
  45,
  canvasCommercial.clientWidth / canvasCommercial.clientHeight,
  0.1,
  100
);

// ==========================================================
//              Camera-positions
// ==========================================================

const SCENE_HALF_WIDTH = 9;
const SCENE_HALF_HEIGHT = 7;
const CAMERA_TILT_DEG = 20; // угол наклона камеры сверху — не меняется при resize

function updateCameraForAspect() {
  const aspect = canvasCommercial.clientWidth / canvasCommercial.clientHeight;
  camera.aspect = aspect;

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  // Дистанция, при которой по ширине помещается SCENE_HALF_WIDTH
  const distanceForWidth = SCENE_HALF_WIDTH / Math.tan(hFov / 2);
  // Дистанция, при которой по высоте помещается SCENE_HALF_HEIGHT
  const distanceForHeight = SCENE_HALF_HEIGHT / Math.tan(vFov / 2);

  // Берём большую из двух — гарантирует, что влезет и то, и другое
  const distance = Math.max(distanceForWidth, distanceForHeight) * 1.1; 

  const tilt = THREE.MathUtils.degToRad(CAMERA_TILT_DEG);
  camera.position.set(0, distance * Math.sin(tilt), distance * Math.cos(tilt));

  camera.lookAt(0, 2.2, 0);
  camera.updateProjectionMatrix();
}

updateCameraForAspect();

let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas: canvasCommercial,
    alpha: true,
    antialias: true
  });
} catch (err) {
  console.warn("WebGL is not available:", err && err.message);
}
if (renderer) {
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvasCommercial.clientWidth, canvasCommercial.clientHeight);

// ====================================================
//                     Lights
// ====================================================

const ambient = new THREE.AmbientLight(0xffffff, 1.2);
scene.add(ambient);

const keyLight = new THREE.PointLight(0x2ce5ff, 2, 30);
keyLight.position.set(0, 8, 6);
scene.add(keyLight);

const fillLight = new THREE.PointLight(0x66ffcb, 1.2, 25);
fillLight.position.set(-6, 4, 4);
scene.add(fillLight);


// ==========================================================
//              --Core----
// ==========================================================

const CORE_POSITION = new THREE.Vector3(0, 0, 0);

const core = new THREE.Group();
core.position.copy(CORE_POSITION);
scene.add(core);



const coreBase = new THREE.Mesh(
  new THREE.CylinderGeometry(1.3, 1.5, 0.3, 32),
  new THREE.MeshStandardMaterial({ color: 0x0a1a14, metalness: 0.7, roughness: 0.3 })
);
core.add(coreBase);

for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.6 + i * 0.28, 0.02, 8, 64),
    new THREE.MeshBasicMaterial({ color: 0x2ce5ff, transparent: true, opacity: 0.7 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.2 + i * 0.05;
  core.add(ring);
}

const coreGlow = new THREE.Mesh(
  new THREE.CircleGeometry(0.55, 32),
  new THREE.MeshBasicMaterial({
    color: 0x2ce5ff,
    transparent: true,
    opacity: 0.5,
    blending: THREE.AdditiveBlending
  })
);
coreGlow.rotation.x = -Math.PI / 2;
coreGlow.position.y = 0.21;
core.add(coreGlow);

// ---------------- ENERGY CABLES (пульсирующие линии) ----------------

const energyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uDelay: { value: 0 }
  },
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  depthTest: true,
  vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform float uDelay;
    varying vec2 vUv;
    void main(){
      float pulse = fract(vUv.x * 3.0 - uTime * 0.6 - uDelay);
      float glow = smoothstep(0.0, 0.15, pulse) * smoothstep(0.35, 0.15, pulse);
      vec3 color = mix(vec3(0.17,0.9,1.0), vec3(0.4,1.0,0.8), vUv.x);
      gl_FragColor = vec4(color, glow * 0.9 + 0.08);
    }
  `
});

const fibers = [];

function createEnergyFiber(points, count = 24, spread = 0.16, delay = 0) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, count, spread * 0.35, 12, false);
  const fiberMaterial = energyMaterial.clone();
  fiberMaterial.uniforms.uDelay.value = delay;
  const tube = new THREE.Mesh(geometry, fiberMaterial);
  tube.renderOrder = -1;
  scene.add(tube);
  fibers.push(fiberMaterial);
}



// =====================================================
//          --Shared-loaders--
// =====================================================

const sharedGLTFLoader = new THREE.GLTFLoader();
if (typeof MeshoptDecoder !== "undefined") {
  sharedGLTFLoader.setMeshoptDecoder(MeshoptDecoder);
}
if (typeof THREE.DRACOLoader !== "undefined") {
  const sharedDracoLoader = new THREE.DRACOLoader();
  sharedDracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.6/");
  sharedGLTFLoader.setDRACOLoader(sharedDracoLoader);
}

// =====================================================
//          Buildings---Glb---Big--Core
// =====================================================

function loadBuilding(path, position, scaleStart, rotationY, labelName) {
  const group = new THREE.Group();
  scene.add(group);
  group.position.copy(position);

  return new Promise((resolve) => {
    sharedGLTFLoader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0);
        model.rotation.set(0, 0, 0);
        model.scale.set(scaleStart, scaleStart, scaleStart);
        model.rotation.y = rotationY;

        model.traverse((child) => {
          if (child.isMesh) {
            child.renderOrder = 1;
            if (child.material) {
              child.material.depthWrite = true;
              child.material.depthTest = true;
            }
          }
        });

        group.add(model);

        const worldBox = new THREE.Box3().setFromObject(group);

        resolve({ group, box: worldBox, label: labelName });
      },
      undefined,
      (err) => {
        console.warn(labelName + " not found", err);
        resolve(null);
      }
    );
  });
}

      // =====================================================
      //          3d---Glb-Models---
      // =====================================================


// The buildings (20.8 MB) are requested only when the section comes within
// ~1.5 screens, instead of competing with the top of the page on load.
function whenNear(el) {
  return new Promise((resolve) => {
    if (!("IntersectionObserver" in window)) return resolve();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        resolve();
      }
    }, { rootMargin: "150% 0px" });
    io.observe(el);
  });
}
const nearScene = whenNear(canvasCommercial);

const officePromise = nearScene.then(() => loadBuilding("assets/office.glb", new THREE.Vector3(-6, 0, -1), 6, 0, "office.glb"));

const warehousePromise = nearScene.then(() => loadBuilding("assets/warehouse.glb", new THREE.Vector3(6, 0, -1), 6, 0, "warehouse.glb"));

const depotPromise = nearScene.then(() => loadBuilding("assets/depot.glb", new THREE.Vector3(0, 0, 6), 5, 0, "depot.glb"));

// ---------------- CABLES: ЯДРО -> ЗДАНИЯ ----------------
// Координаты ориентировочные — подгони после того, как модели
// загрузятся, через Box3().setFromObject(office) в консоли,
// как мы делали для дома в hero-секции.

const ENTRY_HEIGHT_OFFSET = 0.8;
const SURFACE_PADDING = 0.15;

function getConnectorPoint(box, side) {
  const centerX = (box.min.x + box.max.x) / 2;
  const centerZ = (box.min.z + box.max.z) / 2;
  const y = box.min.y + ENTRY_HEIGHT_OFFSET;
  switch (side) {
    case "right": return new THREE.Vector3(box.max.x + SURFACE_PADDING, y, centerZ);
    case "left":  return new THREE.Vector3(box.min.x - SURFACE_PADDING, y, centerZ);
    case "front": return new THREE.Vector3(centerX, y, box.min.z - SURFACE_PADDING);
    case "back":  return new THREE.Vector3(centerX, y, box.max.z + SURFACE_PADDING);
  }
}

function connectCore(connector, delay) {
  const start = new THREE.Vector3(CORE_POSITION.x, 0.3, CORE_POSITION.z);
  const mid = start.clone().lerp(connector, 0.55);
  mid.y = Math.max(start.y, connector.y) + 0.5;
  createEnergyFiber([start, mid, connector], 24, 0.16, delay);
}

const labelAnchors = {};
const labelElements = {
  office: document.getElementById("label-office"),
  warehouse: document.getElementById("label-warehouse"),
  depot: document.getElementById("label-depot")
};

function setLabelAnchor(key, box) {
  const centerX = (box.min.x + box.max.x) / 2;
  const centerZ = (box.min.z + box.max.z) / 2;
  labelAnchors[key] = new THREE.Vector3(centerX, box.max.y + 0.3, centerZ);
  if (labelElements[key]) labelElements[key].classList.add("visible");
}

officePromise.then(r => {
  if (!r) return;
  connectCore(getConnectorPoint(r.box, "right"), 0);
  setLabelAnchor("office", r.box);
});

warehousePromise.then(r => {
  if (!r) return;
  connectCore(getConnectorPoint(r.box, "left"), 0.6);
  setLabelAnchor("warehouse", r.box);
});

depotPromise.then(r => {
  if (!r) return;
  connectCore(getConnectorPoint(r.box, "front"), 1.2);
  setLabelAnchor("depot", r.box);
});



let canvasRect = canvasCommercial.getBoundingClientRect();

function updateLabels() {
  for (const key in labelAnchors) {
    const el = labelElements[key];
    if (!el) continue;
    const pos = labelAnchors[key].clone().project(camera);
    const x = (pos.x * 0.5 + 0.5) * canvasRect.width;
    const y = (-pos.y * 0.5 + 0.5) * canvasRect.height;
    el.style.left = x + "px";
    el.style.top = y + "px";
  }
}

// ---------------- RESIZE ----------------

let resizeQueued = false;
let lastW = canvasCommercial.clientWidth;
let lastH = canvasCommercial.clientHeight;
window.addEventListener("resize", () => {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(() => {
    resizeQueued = false;
    canvasRect = canvasCommercial.getBoundingClientRect();
    const w = canvasCommercial.clientWidth;
    const h = canvasCommercial.clientHeight;
    if (w === lastW && h === lastH) return;
    lastW = w;
    lastH = h;
    updateCameraForAspect();
    renderer.setSize(w, h);
  });
});

// ===================================================
//              Animate
// ===================================================

const clock = new THREE.Clock();

let isSceneVisible = true;
let modalOpen = false;
let rafId = 0;

function shouldRender() {
  return isSceneVisible && !modalOpen && !document.hidden;
}
function startLoop() {
  if (!rafId && shouldRender()) rafId = requestAnimationFrame(animate);
}

const sceneVisibilityObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    isSceneVisible = entry.isIntersecting;
  });
  if (isSceneVisible) canvasRect = canvasCommercial.getBoundingClientRect();
  startLoop();
}, { threshold: 0.05 });

sceneVisibilityObserver.observe(canvasCommercial);
window.addEventListener("contactModalOpen", () => { modalOpen = true; });
window.addEventListener("contactModalClose", () => { modalOpen = false; startLoop(); });
document.addEventListener("visibilitychange", startLoop);

// L15: the cable pulse repeats every 1/0.6 s, so time is wrapped by a
// whole number of periods (100 s) — same picture, no float drift.
const PULSE_WRAP = 100;

function animate() {
  if (!shouldRender()) { rafId = 0; return; }
  rafId = requestAnimationFrame(animate);

  const t = clock.getElapsedTime();
  const pulseTime = t % PULSE_WRAP;

  core.children.forEach((child, i) => {
    if (child.geometry && child.geometry.type === "TorusGeometry") {
      child.rotation.z = t * (0.2 + i * 0.05);
    }
  });
  coreGlow.material.opacity = 0.4 + Math.sin(t * 2) * 0.15;

  fibers.forEach((mat) => {
    mat.uniforms.uTime.value = pulseTime;
  });

  updateLabels();

  renderer.render(scene, camera);
}

startLoop();

}

}