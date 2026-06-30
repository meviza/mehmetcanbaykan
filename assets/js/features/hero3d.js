/**
 * Hero3D — Three.js procedural mimari sahne
 * Abstrakt konsept bina kompozisyonu: yüzen kübik kütleler,
 * altın aksan ışıklar, partikül efekti, dönen kamera.
 *
 * Bağımlılık: Three.js r158+ (CDN'den yüklenir)
 * Graceful fallback: WebGL yoksa statik poster görseli gösterilir.
 */

const CONFIG = {
  camera: { fov: 38, near: 0.1, far: 200, z: 14 },
  primary: '#c9a45a',   // altın
  secondary: '#8c5a2a', // bronz
  stone: '#3a342a',     // koyu taş
  glass: '#1a1a1f',     // cam kütle
  ambient: '#1a1810',
};

let renderer, scene, camera, clock;
let buildingGroup, particleSystem, lights = [];
let rafId = null;
let mouseTarget = { x: 0, y: 0 };
let mouseCurrent = { x: 0, y: 0 };
let isVisible = true;
let isReady = false;

export function initHero3D(container) {
  if (!container) return;
  if (typeof window.THREE === 'undefined') {
    console.warn('Three.js yüklenemedi, statik fallback.');
    showFallback(container);
    return;
  }

  try {
    setup(container);
    buildScene();
    bindEvents(container);
    isReady = true;
    animate();
  } catch (err) {
    console.error('Hero3D başlatılamadı:', err);
    showFallback(container);
  }
}

function setup(container) {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  container.appendChild(renderer.domElement);
  renderer.domElement.classList.add('hero3d-canvas');

  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0b, 0.04);

  camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    w / h,
    CONFIG.camera.near,
    CONFIG.camera.far
  );
  camera.position.set(0, 1.2, CONFIG.camera.z);
  camera.lookAt(0, 0.5, 0);

  clock = new THREE.Clock();
}

function buildScene() {
  // Zemin — yansımalı koyu yüzey
  const floorGeo = new THREE.PlaneGeometry(60, 60);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0b,
    metalness: 0.4,
    roughness: 0.6,
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.2;
  scene.add(floor);

  // Grid çizgileri — teknik çizim hissi
  const grid = new THREE.GridHelper(40, 40, 0x222220, 0x141410);
  grid.position.y = -1.19;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  // Bina kompozisyonu — yüzen kübik kütleler
  buildingGroup = new THREE.Group();
  buildingGroup.position.y = 0;
  scene.add(buildingGroup);

  // Ana kule — uzun dikdörtgen
  const tower = makeBlock({
    w: 1.4, h: 5.8, d: 1.4,
    color: CONFIG.stone,
    roughness: 0.7,
    metalness: 0.15,
    y: 1.7,
  });
  buildingGroup.add(tower);

  // Yan kütle — daha kısa, hafif öne çıkık
  const wing = makeBlock({
    w: 2.6, h: 2.2, d: 1.2,
    color: CONFIG.glass,
    roughness: 0.35,
    metalness: 0.6,
    x: 1.9, y: -0.1,
  });
  buildingGroup.add(wing);

  // Üst kütle — asılı / çıkma
  const upper = makeBlock({
    w: 1.8, h: 0.9, d: 1.4,
    color: CONFIG.stone,
    roughness: 0.55,
    metalness: 0.2,
    x: -0.3, y: 4.0,
  });
  buildingGroup.add(upper);

  // Altın aksan — ince hat, kule üst
  const goldCap = makeBlock({
    w: 1.45, h: 0.04, d: 1.45,
    color: CONFIG.primary,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x4a3a18,
    emissiveIntensity: 0.3,
    y: 4.62,
  });
  buildingGroup.add(goldCap);

  // Altın aksan — yatay hat, kanat bağlantısı
  const goldBand = makeBlock({
    w: 2.65, h: 0.03, d: 1.25,
    color: CONFIG.primary,
    roughness: 0.2,
    metalness: 0.9,
    emissive: 0x4a3a18,
    emissiveIntensity: 0.25,
    x: 1.9, y: 1.1,
  });
  buildingGroup.add(goldBand);

  // Cam kütle — kule yarısında
  const glass = makeBlock({
    w: 1.42, h: 1.6, d: 1.42,
    color: 0x0e0e12,
    roughness: 0.05,
    metalness: 0.95,
    emissive: 0x1a1410,
    emissiveIntensity: 0.15,
    y: 3.1,
  });
  buildingGroup.add(glass);

  // Sütun / kiriş — ana yapı iskeleti
  const pillar1 = makeBlock({
    w: 0.08, h: 5.8, d: 0.08,
    color: CONFIG.primary,
    roughness: 0.3,
    metalness: 0.8,
    emissive: 0x3a2e14,
    emissiveIntensity: 0.4,
    x: 0.65, z: 0.65, y: 1.7,
  });
  const pillar2 = pillar1.clone();
  pillar2.position.set(-0.65, 1.7, 0.65);
  const pillar3 = pillar1.clone();
  pillar3.position.set(0.65, 1.7, -0.65);
  const pillar4 = pillar1.clone();
  pillar4.position.set(-0.65, 1.7, -0.65);
  buildingGroup.add(pillar1, pillar2, pillar3, pillar4);

  // Taban plinth
  const plinth = makeBlock({
    w: 3.6, h: 0.15, d: 2.4,
    color: 0x0a0a0a,
    roughness: 0.4,
    metalness: 0.5,
    y: -1.12,
  });
  buildingGroup.add(plinth);

  // Işıklar
  // Anahtar ışık — sıcak, sağ üstten
  const key = new THREE.DirectionalLight(0xfff2d8, 1.6);
  key.position.set(6, 8, 4);
  key.castShadow = false;
  scene.add(key);
  lights.push(key);

  // Dolgu ışık — soğuk, sol alttan
  const fill = new THREE.DirectionalLight(0x6a7280, 0.5);
  fill.position.set(-5, 2, 6);
  scene.add(fill);
  lights.push(fill);

  // Altın rim — arkadan vurgu
  const rim = new THREE.DirectionalLight(CONFIG.primary, 0.9);
  rim.position.set(-2, 3, -5);
  scene.add(rim);
  lights.push(rim);

  // Ambient
  scene.add(new THREE.AmbientLight(CONFIG.ambient, 0.6));

  // Partikül sistemi — toz / parıltı
  buildParticles();
}

function makeBlock({ w, h, d, color, roughness, metalness, emissive, emissiveIntensity, x = 0, y = 0, z = 0 }) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const matOpts = {
    color: new THREE.Color(color),
    roughness,
    metalness,
  };
  if (emissive) {
    matOpts.emissive = new THREE.Color(emissive);
    matOpts.emissiveIntensity = emissiveIntensity || 0.1;
  }
  const mat = new THREE.MeshStandardMaterial(matOpts);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  return mesh;
}

function buildParticles() {
  const count = 400;
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const r = 6 + Math.random() * 14;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI;
    positions[i * 3] = r * Math.cos(theta) * Math.cos(phi);
    positions[i * 3 + 1] = (Math.random() - 0.3) * 8;
    positions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi);
    sizes[i] = 0.02 + Math.random() * 0.05;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  // Yıldız nokta — sprite texture
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(201, 164, 90, 1)');
  g.addColorStop(0.4, 'rgba(201, 164, 90, 0.4)');
  g.addColorStop(1, 'rgba(201, 164, 90, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const sprite = new THREE.CanvasTexture(c);

  const mat = new THREE.PointsMaterial({
    size: 0.15,
    map: sprite,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    color: 0xffe6b8,
  });
  particleSystem = new THREE.Points(geo, mat);
  scene.add(particleSystem);
}

function bindEvents(container) {
  const onResize = () => {
    if (!renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener('resize', onResize);

  // Mouse parallax
  const onMove = (e) => {
    const t = (e.touches && e.touches[0]) || e;
    mouseTarget.x = (t.clientX / window.innerWidth - 0.5) * 0.4;
    mouseTarget.y = (t.clientY / window.innerHeight - 0.5) * 0.2;
  };
  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });

  // Scroll — sayfa aşağı inince render'ı duraklat
  const visObs = new IntersectionObserver(([entry]) => {
    isVisible = entry.isIntersecting;
    if (isVisible && !rafId) animate();
  }, { threshold: 0.01 });
  visObs.observe(container);

  const onPageVis = () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (isVisible && !rafId) {
      animate();
    }
  };
  document.addEventListener('visibilitychange', onPageVis);
}

function animate() {
  if (!renderer || !scene || !camera) return;
  rafId = requestAnimationFrame(animate);
  if (!isVisible) { cancelAnimationFrame(rafId); rafId = null; return; }

  const t = clock.getElapsedTime();
  const dt = Math.min(clock.getDelta(), 0.05);

  // Mouse yumuşatma
  mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.04;
  mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.04;

  // Bina yavaşça yüzer / döner (mousedan etkilenir)
  if (buildingGroup) {
    buildingGroup.rotation.y = mouseCurrent.x * 0.6 + t * 0.06;
    buildingGroup.position.y = Math.sin(t * 0.5) * 0.08;
    buildingGroup.rotation.x = mouseCurrent.y * 0.3;
  }

  // Partiküller yavaşça döner
  if (particleSystem) {
    particleSystem.rotation.y = t * 0.02;
    const pos = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] += Math.sin(t * 0.4 + i) * 0.002;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
  }

  // Kamera hafif breathe
  camera.position.y = 1.2 + Math.sin(t * 0.3) * 0.1;
  camera.lookAt(0, 0.5, 0);

  renderer.render(scene, camera);
}

function showFallback(container) {
  container.classList.add('hero3d-fallback');
  container.innerHTML = `
    <div class="hero3d-poster">
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#c9a45a" stop-opacity="0.3"/>
            <stop offset="1" stop-color="#c9a45a" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="200" height="200" fill="url(#g)"/>
        <g fill="none" stroke="#c9a45a" stroke-width="0.4" opacity="0.5">
          <rect x="60" y="40" width="40" height="120"/>
          <rect x="100" y="80" width="40" height="80"/>
          <line x1="60" y1="40" x2="140" y2="40"/>
          <line x1="60" y1="160" x2="140" y2="160"/>
        </g>
      </svg>
    </div>
  `;
}

export function disposeHero3D() {
  if (rafId) cancelAnimationFrame(rafId);
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
  if (scene) {
    scene.traverse(obj => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
        else obj.material.dispose();
      }
    });
  }
}
