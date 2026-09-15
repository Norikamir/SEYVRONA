// ==========================================================
//                 3D ENERGY ENGINE v2.0
// ==========================================================

const canvas = document.querySelector("#webgl");
if (canvas) {
const container = canvas.parentElement;
const scene = new THREE.Scene();
const tooltip = document.getElementById('tooltip');
const tooltipTitle = document.getElementById('tooltip-title');
const tooltipText = document.getElementById('tooltip-text');
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const fiberMaterials = [];
const clock = new THREE.Clock();
let sceneRevealed = false;
const hiddenUntilLoaded = [];
let revealStartTime = null;
const pendingFibers = [];
function hideUntilLoaded(obj){
    obj.visible = sceneRevealed;
    if(!sceneRevealed) hiddenUntilLoaded.push(obj);
    return obj;
}


// ==========================================================
//                      ENERGY SHADER
// ==========================================================

const energyMaterial = new THREE.ShaderMaterial({
    uniforms:{
        uTime:{value:0},
        uDelay:{value:0}
    },
    transparent:true,
    blending:THREE.AdditiveBlending,
    depthWrite:false,
    depthTest:true,
    vertexShader:`
        varying vec2 vUv;
        void main(){
            vUv=uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
    `,
    fragmentShader:`
    uniform float uTime;
    uniform float uDelay;
    varying vec2 vUv;
    void main(){
        float localTime = uTime - uDelay;
        if(localTime < 0.0){
            discard;
        }
        float revealDuration = 1.3;
        float revealProgress = clamp(localTime / revealDuration, 0.0, 1.0);
        if(vUv.x > revealProgress){
            discard;
        }
        float t = localTime * 4.2;
        float pulse = sin(vUv.x * 24.0 - t);
        pulse = pow(pulse * .5 + .5, 4.0);
        float head = smoothstep(revealProgress - 0.06, revealProgress, vUv.x);
        vec3 cyan = vec3(0.0, 1.0, 1.0);
        vec3 gold = vec3(1.0, 0.8, 0.25);
        vec3 purple = vec3(0.55, 0.2, 1.0);
        vec3 col = mix(gold, cyan, smoothstep(0.0, 0.65, vUv.x));
        col = mix(col, purple, smoothstep(0.65, 1.0, vUv.x));
        float alpha = sin(vUv.x * 3.14159);
        gl_FragColor = vec4(col * (1.0 + pulse * 4.0 + head * 7.0), alpha);
    }
    `
});
scene.fog = new THREE.FogExp2(0x08090c, 0.018); 


const camera = new THREE.PerspectiveCamera(
    46,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
);
camera.position.set(9.2, 1.5, 18.5);

const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha:true,
    antialias:false,
    powerPreference:"high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, container.clientWidth > 1400 ? 1.25 : 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;

// ==========================================================
//                       LIGHTING
// ==========================================================


const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);
const mainLight = new THREE.PointLight(0xffbb55, 4, 28);
mainLight.position.set(-0.8, -0.2, 2.0);
scene.add(mainLight);
const blueLight = new THREE.PointLight(0x00ccff, 2.5, 26);
blueLight.position.set(5.5, 4.5, 4);
scene.add(blueLight);
const greenLight = new THREE.PointLight(0x55ffcc, 1.8, 22);
greenLight.position.set(-4.0, -1.0, 3);
scene.add(greenLight);
const carLight = new THREE.PointLight(0x2ce5ff, 2.2, 18);
carLight.position.set(3.5, -1.2, 2.5);
scene.add(carLight);


// ==========================================================
//                          TEXTURES
// ==========================================================


const loadingScreen = document.getElementById('loading-screen');
const progressBar = document.getElementById('progress-bar');
const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
  if (!progressBar) return;
  const percent = Math.round((loaded / total) * 100);
  progressBar.style.width = percent + '%';
};
const loadStartTime = performance.now();
const MIN_LOADING_TIME = 800;


let managerDone = false;
let modelsDone = false;
function tryReveal(){

  if (!managerDone || !modelsDone) return;
  const elapsed = performance.now() - loadStartTime;
  const remaining = Math.max(MIN_LOADING_TIME - elapsed, 0);
  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => loadingScreen.style.display = 'none', 500);
    }
    sceneRevealed = true;
    hiddenUntilLoaded.forEach(obj => obj.visible = true);
    revealStartTime = clock.getElapsedTime();
    pendingFibers.forEach(({ material, offset }) => {
      material.uniforms.uDelay.value = revealStartTime + offset;
    });
  }, remaining);
}
manager.onLoad = () => { managerDone = true; tryReveal(); };



const loader = new THREE.TextureLoader(manager);
function load(name){
    return loader.load(
        "assets/" + name,
        undefined,
        undefined,
        () => { console.warn(name + " not found"); }
    );
}
const textures = {
    shield: load("image-security.png")
};
function Sprite(texture, width, height, x, y, z){
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
        map:texture,
        transparent:true,
        depthWrite:true,
        alphaTest:0.5 
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
}


// ==========================================================
//               3D OBJECTS & BALANCED LAYOUT
// ==========================================================


const dracoLoader = new THREE.DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
const gltfLoader = new THREE.GLTFLoader(manager);
gltfLoader.setDRACOLoader(dracoLoader);
if (typeof MeshoptDecoder !== "undefined") {
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
}

const panels = new THREE.Group();
scene.add(panels);
hideUntilLoaded(panels);
panels.position.set(-4.2, -2.4, 1.8);



// 2. УМНЫЙ ДОМ 
const house = new THREE.Group();
scene.add(house);
hideUntilLoaded(house);
window.house = house;
house.position.set(5.6, 5.7, -1.2);
house.scale.set(5.8, 5.8, 5.8);
house.rotation.y = -0.8;
house.rotation.x = 0.11;


// 3. ЗАРЯДНАЯ СТАНЦИЯ 
const charger = new THREE.Group();
scene.add(charger);
hideUntilLoaded(charger);
charger.position.set(1.5, 1.3, -0.1);
charger.rotation.y = -0.5;
charger.rotation.x = 0.1;


// 4. ЭЛЕКТРОКАР 
const car = new THREE.Group();
scene.add(car);
hideUntilLoaded(car);
car.position.set(4.8, -1.85, 0.6);



// 6. ЩИТ БЕЗОПАСНОСТИ 

const shield = hideUntilLoaded(Sprite(textures.shield, 3.8, 4.8, -3.2, 5.2, 0.5));
function setupMesh(model) {
  model.traverse((child) => {
    if (child.isMesh) {
      child.renderOrder = 1;
      if (child.material) {
        child.material.depthWrite = true;
        child.material.depthTest = true;
      }
    }
  });
}
function fadeInModel(model, duration = 700, delay = 0) {
  const materials = [];
  model.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.transparent = true;
      child.material.opacity = 0;
      materials.push(child.material);
    }
  });
  setTimeout(() => {
    const start = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      materials.forEach(m => m.opacity = eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, delay);
}
function loadModel(url) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
}
let houseBaseY = house.position.y;
const carBaseY = car.position.y;
const chargerBaseY = charger.position.y;
const shieldBaseY = shield.position.y;
panels.renderOrder = 1;
charger.renderOrder = 1;
house.renderOrder = 1;
car.renderOrder = 1;
shield.renderOrder = 1;


// ==========================================================
//                ENERGY CORE (Центральный хаб)
// ==========================================================


const corePos = new THREE.Vector3(-0.8, -0.2, 1.2);
const energyCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 32, 32),
    new THREE.MeshBasicMaterial({color:0xffcc55})
);
energyCore.position.copy(corePos);
scene.add(energyCore);
hideUntilLoaded(energyCore);


// ==========================================================
//                        CURSOR
// ==========================================================

const mouse = { x:0, y:0 };
window.addEventListener("mousemove", e => {
    mouse.x = e.clientX / window.innerWidth - .5;
    mouse.y = e.clientY / window.innerHeight - .5;
});


// ==========================================================
//                  PARTICLES SYSTEM
// ==========================================================

const particleCount = 3000;
const particleGeometry = new THREE.BufferGeometry();
const particleArray = [];
for (let i = 0; i < particleCount; i++) {
    particleArray.push(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 24,
        (Math.random() - 0.5) * 16
    );
}
particleGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(particleArray, 3)
);
const particleMaterial = new THREE.PointsMaterial({
    color:0x66ffff,
    size:0.025,
    transparent:true,
    opacity:0.55,
    depthWrite:false
});
const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);
hideUntilLoaded(particles);


// ==========================================================
//                  ENERGY FIBER CREATOR
// ==========================================================


function createEnergyFiber(points, count=3, spread=.05, offset=0, thickness=0.024){
    const group = new THREE.Group();
    const fiberMaterial = energyMaterial.clone();
    fiberMaterial.uniforms = {
        uTime: { value: 0 },
        uDelay: { value: 999999 }
    };
    pendingFibers.push({ material: fiberMaterial, offset });
    for(let i=0; i<count; i++){
        const p0=points[0].clone();
        const p1=points[1].clone();
        const p2=points[2].clone();
        const p3=points[3].clone();
        p1.x+=(Math.random()-.5)*spread;
        p1.y+=(Math.random()-.5)*spread;
        p2.x+=(Math.random()-.5)*spread;
        p2.y+=(Math.random()-.5)*spread;
        const curve = new THREE.CatmullRomCurve3([p0,p1,p2,p3]);
        const tube = new THREE.Mesh(
            new THREE.TubeGeometry(curve, 80, thickness+Math.random()*0.008, 8, false),
            fiberMaterial
        );
        group.add(tube);
        tube.renderOrder = -1;
    }
    scene.add(group);
    fiberMaterials.push(fiberMaterial);
    return group;
}


function stopBeforeObject(fromPoint, targetObject, margin = 0.5) {
    const box = new THREE.Box3().setFromObject(targetObject);
    const nearestDist = box.distanceToPoint(fromPoint);
    if (nearestDist <= 0.001) {
        return fromPoint.clone();
    }
    const center = box.getCenter(new THREE.Vector3());
    const dir = new THREE.Vector3().subVectors(center, fromPoint).normalize();
    const stopDist = Math.max(nearestDist - margin, 0.1);
    return fromPoint.clone().add(dir.multiplyScalar(stopDist));
}


/// ==========================================================
//       ПОТОКИ ЭНЕРГИИ С ИДЕАЛЬНОЙ СВЯЗНОСТЬЮ ОБЪЕКТОВ
// ==========================================================

// 1. Панели -> Ядро (энергия ветвится как дерево: тонкие веточки -> узлы-круги -> толще -> ствол в ядро)
const branchNodes = [];
function createBranchNode(position, size=0.05){
    const node = new THREE.Group();
    const core = new THREE.Mesh(
        new THREE.SphereGeometry(size, 16, 16),
        new THREE.MeshBasicMaterial({color:0x9fe8ff})
    );
    node.add(core);
    const glow = new THREE.Mesh(
        new THREE.PlaneGeometry(size*10, size*10),
        new THREE.ShaderMaterial({
            transparent:true,
            depthWrite:false,
            blending:THREE.AdditiveBlending,
            vertexShader:`
                varying vec2 vUv;
                void main(){
                    vUv=uv;
                    gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
                }
            `,
            fragmentShader:`
                varying vec2 vUv;
                void main(){
                    float d=length(vUv-.5);
                    float a=.4-d*.7;
                    vec3 c=vec3(0.4, 0.9, 1.0);
                    gl_FragColor=vec4(c,max(a,0.0));
                }
            `
        })
    );
    node.add(glow);
    node.position.copy(position);
    scene.add(node);
    hideUntilLoaded(node);
    branchNodes.push(node);
    return node;
  
}


function animateCore(time){
    const pulse = 1 + Math.sin(time*5)*0.25;
    energyCore.scale.set(pulse, pulse, pulse);
    mainLight.intensity = 3 + Math.sin(time*4) * 0.5;
    halo.scale.set(pulse*1.4, pulse*1.4, 1);
    branchNodes.forEach((node, i) => {
        const s = 1 + Math.sin(time*3 + i*1.7)*0.18;
        node.scale.set(s, s, s);
    });
}

function getRenderScale(){
    return Math.min(window.devicePixelRatio, container.clientWidth > 1400 ? 1.25 : 2);
}


const midNode1 = new THREE.Vector3(-2.9, -1.3, 1.45);
const midNode2 = new THREE.Vector3(-2.5, -1.6, 1.4);
const panelMergePoint = new THREE.Vector3(-1.8, -0.6, 1.3);

createBranchNode(midNode1, 0.07);
createBranchNode(midNode2, 0.07);
createBranchNode(panelMergePoint, 0.1);

// Тонкие веточки -> узел 1
hideUntilLoaded(createEnergyFiber([
  new THREE.Vector3(-4.9, -1.3, 1.75),
  new THREE.Vector3(-4.0, -1.3, 1.6),
  new THREE.Vector3(-3.3, -1.3, 1.5),
  midNode1
], 1, .05, 0.15, 0.007));

hideUntilLoaded(createEnergyFiber([
  new THREE.Vector3(-4.3, -1.75, 1.65),
  new THREE.Vector3(-3.7, -1.5, 1.55),
  new THREE.Vector3(-3.2, -1.4, 1.48),
  midNode1
], 1, .05, 0.2, 0.007));

hideUntilLoaded(createEnergyFiber([
  new THREE.Vector3(-3.9, -2.3, 1.55),
  new THREE.Vector3(-3.4, -1.7, 1.48),
  new THREE.Vector3(-3.1, -1.4, 1.42),
  midNode1
], 1, .05, 0.25, 0.007));

// Тонкие веточки -> узел 2
hideUntilLoaded(createEnergyFiber([
  new THREE.Vector3(-3.6, -2.7, 1.5),
  new THREE.Vector3(-3.0, -2.1, 1.45),
  new THREE.Vector3(-2.6, -1.75, 1.4),
  midNode2
], 1, .05, 0.2, 0.007));

hideUntilLoaded(createEnergyFiber([
  new THREE.Vector3(-3.1, -2.9, 1.45),
  new THREE.Vector3(-2.7, -2.2, 1.4),
  new THREE.Vector3(-2.5, -1.8, 1.38),
  midNode2
], 1, .05, 0.3, 0.007));

// Узлы -> общий узел перед ядром (ветви чуть толще)
hideUntilLoaded(createEnergyFiber([
  midNode1,
  new THREE.Vector3(-2.3, -1.0, 1.35),
  new THREE.Vector3(-2.0, -0.75, 1.32),
  panelMergePoint
], 1, .04, 0.45, 0.01));

hideUntilLoaded(createEnergyFiber([
  midNode2,
  new THREE.Vector3(-2.1, -1.0, 1.33),
  new THREE.Vector3(-1.9, -0.8, 1.31),
  panelMergePoint
], 1, .04, 0.5, 0.01));

// Ствол -> Ядро (самый толстый, финальный поток)
hideUntilLoaded(createEnergyFiber([
  panelMergePoint,
  new THREE.Vector3(-1.5, -0.5, 1.28),
  new THREE.Vector3(-1.1, -0.35, 1.22),
  corePos
], 1, .03, 0.7, 0.016));


// 2. Ядро -> Щит безопасности (Вверх-влево)

hideUntilLoaded(createEnergyFiber([
  corePos,
  new THREE.Vector3(-1.6, 1.8, 0.9),
  new THREE.Vector3(-3.0, 4.7, 0.55),
  stopBeforeObject(new THREE.Vector3(-2.4, 3.6, 0.7), shield, 0.3)
], 20, .15, 3.8));


// 3. Загрузка 3D-моделей и построение оставшихся линий сети

Promise.all([
  loadModel("assets/charger-clean.glb"),
  loadModel("assets/car-final.glb"),
  loadModel("assets/new_house_2_optimized.glb"),
  loadModel("assets/solar_panel_optimized.glb")
])
  .then(([chargerGltf, carGltf, hauseGltf, panelsGltf]) => {
    

 // --- 0. SOLAR PANELS ---

   const panelsModel = panelsGltf.scene;
    panelsModel.scale.set(6, 6, 6);
    panelsModel.rotation.y = -5.5;
    panelsModel.rotation.x = 0;
    setupMesh(panelsModel);
    panels.add(panelsModel);
    fadeInModel(panelsModel, 700, 0);


    // --- 1. CHARGER ---

    const chargerModel = chargerGltf.scene;
    chargerModel.scale.set(1.9, 1.9, 1.9);
    chargerModel.rotation.y = 0.4;
    setupMesh(chargerModel);
    charger.add(chargerModel);
    fadeInModel(chargerModel, 700, 0);


    // Кабель: Ядро -> Станция зарядки
       createEnergyFiber([
  corePos,
  new THREE.Vector3(0.2, 0.4, 1.0),
  new THREE.Vector3(0.9, 0.9, 0.4),
  stopBeforeObject(new THREE.Vector3(1.2, 1.1, 0.1), charger, 0.3)
], 20, .15, 1.4);



    // --- 2. CAR ---

    const carModel = carGltf.scene;
    carModel.scale.set(6.2, 6.2, 6.2);
    carModel.rotation.y = -6.6; // красивый 3/4 ракурс в изометрии
    setupMesh(carModel);
    car.add(carModel);
    fadeInModel(carModel, 700, 250);


    // Кабель: Станция зарядки -> Левитирующий Электрокар
   createEnergyFiber([
  corePos,
  new THREE.Vector3(1.6, -1.0, 0.7),
  new THREE.Vector3(2.6, -1.4, 0.6),
  stopBeforeObject(new THREE.Vector3(2.6, -1.4, 0.6), car, 0.1)
], 4, .07, 2.6, 0.04);


        // --- 3. HOUSE ---
        
    const hauseModel = hauseGltf.scene;
    setupMesh(hauseModel);
    hauseModel.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.color.multiplyScalar(0.75);
            if (child.material.emissive) {
                child.material.emissiveIntensity = 0;
            }
            child.material.needsUpdate = true;
        }
    });
    house.add(hauseModel);
    fadeInModel(hauseModel, 700, 450);


      createEnergyFiber([
  charger.position.clone(),
  new THREE.Vector3(2.4, 2.6, 0.05),
  new THREE.Vector3(4.4, 4.5, -0.4),
  stopBeforeObject(new THREE.Vector3(4.4, 4.5, -0.4), house, 0.1)
], 24, .16, 2.8);

    canvas.classList.add('loaded');
    document.getElementById('sceneLoader')?.remove();
    modelsDone = true;
    tryReveal();
  })
  .catch(err => console.warn("Ошибка загрузки модели:", err));


// ==========================================================
//                  ENERGY SPARKS & HALO
// ==========================================================


const sparkGroup = new THREE.Group();
scene.add(sparkGroup);
hideUntilLoaded(sparkGroup);
const sparks = [];
for(let i=0; i<180; i++){
    const spark = new THREE.Mesh(
        new THREE.SphereGeometry(0.025, 8, 8),
        new THREE.MeshBasicMaterial({ color:0x66ffff })
    );
    spark.position.set(
        corePos.x + (Math.random()-0.5)*0.6,
        corePos.y + (Math.random()-0.5)*0.6,
        corePos.z + Math.random()*0.3
    );
    spark.userData={
        angle:Math.random()*Math.PI*2,
        radius:.1+Math.random()*.4,
        speed:.5+Math.random()*2,
        height:Math.random()
    };
    sparkGroup.add(spark);
    sparks.push(spark);
}
const rings=[];
for(let i=0; i<8; i++){
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(.18,.22,48),
        new THREE.MeshBasicMaterial({
            color:0x55ffff,
            transparent:true,
            opacity:.4,
            side:THREE.DoubleSide
        })
    );
    ring.position.copy(corePos);
    hideUntilLoaded(ring);
    scene.add(ring);
    rings.push(ring);
}
const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
        transparent:true,
        depthWrite:false,
        blending:THREE.AdditiveBlending,
        vertexShader:`
            varying vec2 vUv;
            void main(){
                vUv=uv;
                gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
            }
        `,
        fragmentShader:`
            varying vec2 vUv;
            void main(){
                float d=length(vUv-.5);
                float a=.25-d*.45;
                vec3 c=vec3(0.2, 1., 1.);
                gl_FragColor=vec4(c,a);
            }
        `
    })
);
halo.position.copy(corePos);
scene.add(halo);


// ==========================================================
//                  CAMERA PARALLAX
// ==========================================================

let cameraTargetX = 0;
let cameraTargetY = 0;
window.addEventListener("mousemove", e => {
    cameraTargetX = (e.clientX/window.innerWidth-.5)*1.2;
    cameraTargetY = (e.clientY/window.innerHeight-.5)*.8;
});

// ==========================================================
//                  FLOATING OBJECTS & ANTIGRAVITY
// ==========================================================


function floatObjects(time){

  // Дом и зарядка
  house.position.y = houseBaseY + Math.sin(time * 0.8) * 0.04;
  charger.position.y = chargerBaseY + Math.sin(time * 1.1) * 0.03;
  shield.rotation.z = Math.sin(time) * 0.07;
  shield.position.y = shieldBaseY + Math.sin(time * 1.6) * 0.05;
  panels.rotation.z = Math.sin(time * 0.5) * 0.01;

  // === ЭФФЕКТ АНТИГРАВИТАЦИИ (ANTIGRAVITY) ДЛЯ АВТО ===
  // car.position.y = carBaseY + Math.sin(time * 1.6) * 0.12;
  car.rotation.z = Math.sin(time * 1.2) * 0.025;
  car.rotation.x = Math.cos(time * 1.0) * 0.018;
}
function animateParticles(){
    particles.rotation.y += 0.00025;
    particles.rotation.x += 0.00008;
}



// ==========================================================
//                 FINAL ENGINE ANIMATE LOOP
// ==========================================================


let canvasVisible = true;
const heroObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => { canvasVisible = entry.isIntersecting; });
}, { threshold: 0 });

heroObserver.observe(container);

window.addEventListener("contactModalOpen", () => { canvasVisible = false; });
window.addEventListener("contactModalClose", () => { canvasVisible = true; });

function animate(){
    requestAnimationFrame(animate);
    if(!canvasVisible) return;  
    const t = clock.getElapsedTime();
    fiberMaterials.forEach(mat => { mat.uniforms.uTime.value = t; });
    animateCore(t);
    floatObjects(t);
    animateParticles();

    // -------Sparks-------//
    
    sparks.forEach((spark)=>{
        const d = spark.userData;
        d.angle += 0.015 * d.speed;
        spark.position.x = corePos.x + Math.cos(d.angle) * d.radius;
        spark.position.y = corePos.y + Math.sin(d.angle) * d.radius;
        spark.position.z = corePos.z + Math.sin(t + d.height * 10) * 0.08;
    });
    // Rings
    rings.forEach((ring, index)=>{
        ring.rotation.z += 0.015;
        const scale = 1 + Math.sin(t * 2 + index) * 0.18;
        ring.scale.set(scale, scale, 1);
        ring.material.opacity = 0.18 + Math.sin(t * 2 + index) * 0.12;
    });
    // Camera Smooth Tracking


    camera.position.x += (cameraTargetX - camera.position.x) * 0.03;
    camera.position.y += (-cameraTargetY - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
    // Dynamic Lights
    blueLight.intensity = 2 + Math.sin(t * 2);
    greenLight.intensity = 1.6 + Math.cos(t * 2);
    carLight.intensity = 2 + Math.sin(t * 3);
    halo.rotation.z += 0.002;
    shield.material.opacity = 0.9 + Math.sin(t * 4) * 0.1;
    renderer.render(scene, camera);
}
animate();


// ==========================================================
//                          RESIZE
// ==========================================================

window.addEventListener("resize", ()=>{
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();

    const initialScale = getRenderScale();
    renderer.setPixelRatio(1);
    renderer.setSize(container.clientWidth * initialScale, container.clientHeight * initialScale, false);
    canvas.style.width = container.clientWidth + 'px';
    canvas.style.height = container.clientHeight + 'px';

    adjustCameraForAspect();
});


function adjustCameraForAspect(){
  const aspect = container.clientWidth / container.clientHeight;
  const screenWidth = window.innerWidth;
  let baseDistance = 1;
      if(screenWidth <= 400){
    camera.fov = 54;
    baseDistance = 0.95;
  } else if(screenWidth <= 480){
    camera.fov = 58;
    baseDistance = 0.95;
  } else if(screenWidth <= 900){
    camera.fov = 47;
    baseDistance = 0.92;
  } else {
    camera.fov = 46;
  }
  camera.position.set(9.2 * baseDistance, 1.5 * baseDistance, 19 * baseDistance);
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

adjustCameraForAspect();


// ==========================================================
//                    AUTO CAMERA IDLE
// ==========================================================


let autoMove = true;
window.addEventListener("mouseleave", () => { autoMove = true; });
window.addEventListener("mouseenter", () => { autoMove = false; });
setInterval(()=>{
    if(autoMove){
        cameraTargetX = Math.sin(Date.now() * 0.00025) * 0.5;
        cameraTargetY = Math.cos(Date.now() * 0.00018) * 0.35;
    }
}, 16);


// ==========================================================
//                      SCROLL REVEAL
// ==========================================================


const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('show');
    }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.card, .project-card, .stat').forEach(el => {
  revealObserver.observe(el);
});


// ==========================================================
//                    ORBIT DIAGRAMS
// ==========================================================


function buildOrbitDiagram(){
  const diagram = document.getElementById('orbitDiagram');
  const svg = document.getElementById('orbitLines');
  if(!diagram || !svg) return;
  const nodes = diagram.querySelectorAll('.orbit-node');
  const centerX = diagram.clientWidth / 2;
  const centerY = diagram.clientHeight / 2;
  const radiusX = diagram.clientWidth * 0.40;
  const radiusY = diagram.clientHeight * 0.38;
  svg.setAttribute('viewBox', `0 0 ${diagram.clientWidth} ${diagram.clientHeight}`);
  svg.innerHTML = '';
  const total = nodes.length;
  nodes.forEach((node, i) => {
    const angle = (-90 + (360 / total) * i) * (Math.PI / 180);
    const x = centerX + Math.cos(angle) * radiusX;
    const y = centerY + Math.sin(angle) * radiusY;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    const color = node.dataset.color;
    node.style.setProperty('--line-color', color); 
    node.innerHTML = `
      <div class="node-icon">
          <img src="${node.dataset.icon}" alt="${node.dataset.label}" loading="lazy">
      </div>
      <h4>${node.dataset.label}</h4>
      <p>${node.dataset.desc}</p>
    `;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const midX = centerX + (x - centerX) * 0.5;
    const midY = centerY + (y - centerY) * 0.5;
    path.setAttribute('d', `M${centerX},${centerY} Q${midX},${midY} ${x},${y}`);
    path.setAttribute('class', 'orbit-line');
    path.setAttribute('stroke', color);
    path.style.animationDelay = (i * 0.15) + 's';
    svg.appendChild(path);
  });
}
buildOrbitDiagram();
window.addEventListener('resize', buildOrbitDiagram);
const orbitObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('active');
    }
  });
}, { threshold: 0.3 });
document.querySelectorAll('.orbit-diagram').forEach(el => {
  orbitObserver.observe(el);
});


// ==========================================================
//                    HOVER TOOLTIPS
// ==========================================================


const objectsInfo = new Map();
objectsInfo.set(panels, { title: "Solar Panels", text: "High-efficiency photovoltaic panels generating clean energy." });
objectsInfo.set(house, { title: "Smart Home", text: "Fully automated home with integrated energy management." });
objectsInfo.set(car, { title: "EV Antigravity", text: "Electric vehicle charging via high-speed wireless inductors." });
objectsInfo.set(charger, { title: "Smart Hub & Charger", text: "Intelligent battery distribution and power routing." });
objectsInfo.set(shield, { title: "Security Network", text: "AI-powered surveillance and network defense." });
const hoverables = [panels, house, car, charger, shield];


let lastRaycast = 0;
canvas.addEventListener('mousemove', (e) => {
  const now = performance.now();
  if (now - lastRaycast < 60) return;
  lastRaycast = now;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(hoverables, true);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !objectsInfo.has(obj)) {
      obj = obj.parent;
    }
    const info = obj ? objectsInfo.get(obj) : null;
    if (info) {
      tooltipTitle.textContent = info.title;
      tooltipText.textContent = info.text;
      tooltip.style.display = 'block';
      tooltip.style.left = (e.clientX - rect.left) + 'px';
      tooltip.style.top = (e.clientY - rect.top) + 'px';
      canvas.style.cursor = 'pointer';
    }
  } else {
    tooltip.style.display = 'none';
    canvas.style.cursor = 'default';
  }
});
canvas.addEventListener('mouseleave', () => {
  tooltip.style.display = 'none';
});

function showTooltipAt(clientX, clientY){
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(hoverables, true);
  if (intersects.length > 0) {
    let obj = intersects[0].object;
    while (obj && !objectsInfo.has(obj)) obj = obj.parent;
    const info = obj ? objectsInfo.get(obj) : null;
    if (info) {
      tooltipTitle.textContent = info.title;
      tooltipText.textContent = info.text;
      tooltip.style.display = 'block';

      const tw = tooltip.offsetWidth;
      let x = clientX - rect.left;
      let y = clientY - rect.top;

      if (x - tw/2 < 8) x = tw/2 + 8;
      if (x + tw/2 > rect.width - 8) x = rect.width - 8 - tw/2;
      if (y < 90) y = 90;

      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
      return true;
    }
  }
  tooltip.style.display = 'none';
  return false;
}

canvas.addEventListener('touchstart', (e) => {
  if (!e.touches[0]) return;
  showTooltipAt(e.touches[0].clientX, e.touches[0].clientY);
}, { passive: true });

document.addEventListener('touchstart', (e) => {
  if (!canvas.contains(e.target)) {
    tooltip.style.display = 'none';
  }
}, { passive: true });
};

// ==========================================================
//              Lazy Loading Image Cards
// ==========================================================

const projectImgSrc = {
  image1: 'assets/solar-house.webp',
  image2: 'assets/image-vehicle.webp',
  image3: 'assets/security-camera.webp'
};
const lazyImgObserver = new IntersectionObserver((entries, obs) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const key = Object.keys(projectImgSrc).find(k => el.classList.contains(k));
    if (key) el.style.backgroundImage = `url('${projectImgSrc[key]}')`;
    obs.unobserve(el);
  });
}, { rootMargin: '300px' });
document.querySelectorAll('.project-image').forEach(el => lazyImgObserver.observe(el));


// ==========================================================
// END
// ==========================================================