// src/main.js
// Full game runtime with:
// - 3rd-person camera with mouse-X yaw control (fixed pitch/zoom)
// - Lock-on toggle (L)
// - Separation moves only enemies
// - Splash particles tied to ship bobbing
// - Realistic gun: muzzle flash, recoil, shell ejection, smoke trail, camera shake
// - Extensive comments for tuning

import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { Water } from './objects/Water';
import { Ground } from './objects/Ground';
import { setupUI } from './ui';
import { ClippingGroup } from 'three/webgpu';

// ================== TUNABLE CONFIG ==================
const WATER_SIZE = 2000;
const SHIP_MODEL_SCALE = 4;          // change model scale here
const CAMERA_FOV = 55;
const TONE_EXPOSURE = 0.82;
const BLOOM_STRENGTH = 0.28;

// Camera follow + mouse yaw settings
const CAMERA_PITCH = 0.35;             // radians down tilt (fixed)
const CAMERA_DISTANCE = 30;            // distance behind ship
const CAMERA_HEIGHT = 7;               // height above ship
const CAMERA_YAW_MAX = 0;            // max yaw offset (radians) from mouse X [-1..1]*CAMERA_YAW_MAX
const CAMERA_LERP = 0.12;              // smoothing toward desired camera pos

// Lock-on settings
const LOCKON_KEY = 'l';                // toggle lock-on
const LOCKON_SMOOTH = 0.14;            // how fast camera transitions when locked
const LOCKON_MIN_DISTANCE = 8;         // min distance to consider enemy for lock

// Sway (bobbing) and splash settings
const SWAY = {
  baseAmplitude: 0.04,
  baseFreq: 1.4,
  rollAmp: 0.02,
  pitchAmp: 0.012,
  splashThresholdFactor: 0.6,
  splashCooldown: 0.28
};

// Gun / muzzle / shell settings
const MUZZLE_FLASH_DURATION = 0.08;
const MUZZLE_FLASH_SCALE = 1 * SHIP_MODEL_SCALE;
const RECOIL_AMOUNT = 0.22 * SHIP_MODEL_SCALE;
const RECOIL_DURATION = 0.12;
const SHELL_EJECT_SPEED = 6.0;
const CAMERA_SHAKE_INTENSITY = 0.06;
const CAMERA_SHAKE_DURATION = 0.12;

// Gameplay config
const CONFIG = {
  PLAYER_HEALTH: 12000,
  ENEMY_HEALTH: 900,
  SHIP_RADIUS: 5,
  PLAYER_COOLDOWN: 0.35,
  ENEMY_SHOOT_RANGE: 240,
  ENEMY_COOLDOWN_MIN: 1.0,
  ENEMY_COOLDOWN_MAX: 2.4,
  BALL_RADIUS: 0.18,
  BALL_SPEED: 80,
  BALL_DAMAGE: 30,
  ENEMY_TURN_SPEED: 2.2,
  ENEMY_MOVE_SPEED: 8
};
// ===================================================

// --- Minimal CSS so canvas fills screen ---
const style = document.createElement('style');
style.innerText = `html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}`;
document.head.appendChild(style);

// --- Renderer / Scene / Camera ---
const clock = new THREE.Clock();
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = TONE_EXPOSURE;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(0, CAMERA_HEIGHT, CAMERA_DISTANCE);

// --- Lighting ---
const hemi = new THREE.HemisphereLight(0xbfeaf5, 0x404040, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(30, 80, 50);
scene.add(dir);

// --- HDR environment (optional; replace or remove if you don't have the HDR) ---
const environmentMap = new RGBELoader();
environmentMap.load('src/objects/sky.hdr', (tex) => { tex.mapping = THREE.EquirectangularReflectionMapping; scene.background = tex; scene.environment = tex; });

// --- Water & Ground ---
const poolTexture = new THREE.TextureLoader().load('/threejs-water-shader/ocean_floor.png');
const water = new Water({ environmentMap, resolution: 512, width: WATER_SIZE, height: WATER_SIZE });
water.material.transparent = true;
water.material.depthTest = true;
water.material.depthWrite = false;
water.renderOrder = 100;
water.position.y = 0;
scene.add(water);

const ground = new Ground({ texture: poolTexture, width: WATER_SIZE, height: WATER_SIZE });
ground.position.y = -0.12;
scene.add(ground);

const gltfLoader = new GLTFLoader();
gltfLoader.load('src/models/island.glb',
  (gltf) => {
    const island = gltf.scene;

    // scale first
    island.scale.set(1, 1, 1);

    // ensure world matrices are up-to-date before computing bounds
    island.updateMatrixWorld(true);

    // compute bounding box in world space
    const box = new THREE.Box3().setFromObject(island);
    console.log('island bbox', box.min, box.max);

    // desired water surface (your water y is 0 in code)
    const waterY = water.position ? water.position.y : 0;

    // translation to bring the lowest point (box.min.y) to waterY + clearance
    const clearance = 0.02; // small gap so it doesn't clip into water
    const translation = (waterY + clearance) - box.min.y;

    // apply translation to island.position
    island.position.y += translation;

    // optional: further tune position and orientation
    island.position.x = 100;
      island.position.y= 85;
      console.log(  island.position.y)
    island.position.z = -10;

    // sanity clamps — if island still ends up absurdly high, log details
    if (Math.abs(translation) > 500) {
      console.warn('Large island translation:', translation, 'bbox:', box);
      // as a fallback set a safe default
      island.position.set(50, 0.5, -100);
    }

    // add bounding box helper for debugging (remove later)
    // const helper = new THREE.Box3Helper(box, 0xff0000);
    // scene.add(helper);

    scene.add(island);
  },
  (xhr) => { /* progress if you want */ },
  (err) => { console.error('island load error', err); }
);




// --- Postprocessing (bloom) ---
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), BLOOM_STRENGTH, 0.2, 0.85);
bloomPass.threshold = 0.9; bloomPass.radius = 0.18;
composer.addPass(bloomPass);

// --- State & helpers ---
const state = {
  keys: {},
  mouse: new THREE.Vector2(),       // normalized [-1..1] for mouse
  mouseRawX: 0,
  ray: new THREE.Raycaster(),

  player: null,
  enemies: [],
  cannonballs: [],
  particles: [],
  sinking: [],
  debris: [],                       // shell casings, etc.
  score: 0,
  kills: 0,

  lockOn: false,
  lockTarget: null,

  cameraShake: { t: 0, intensity: 0 }
};

const loader = new OBJLoader();

// --- Input listeners ---
// store raw mouse X (clientX) so we can compute normalized mouse X against screen
window.addEventListener('mousemove', (ev) => {
  state.mouseRawX = ev.clientX;
  state.mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
  state.mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
});
window.addEventListener('mousedown', (ev) => {
  if (ev.button === 0 && state.player && !gameOver) tryPlayerShoot();
});
window.addEventListener('keydown', (e) => {
  state.keys[e.key.toLowerCase()] = true;
  if (e.key.toLowerCase() === LOCKON_KEY) toggleLockOn();
});
window.addEventListener('keyup', (e) => state.keys[e.key.toLowerCase()] = false);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight); composer.setSize(window.innerWidth, window.innerHeight);
});

// =================== PARTICLE & SPRITE HELPERS ===================
function makeSplashTexture(size = 256, inner = '#e41818ff', outer = '#ff66ebff') {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(size/2, size/2, 2, size/2, size/2, size/2);
  grd.addColorStop(0, inner); grd.addColorStop(0.5, outer); grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd; ctx.fillRect(0,0,size,size);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipMapLinearFilter; t.magFilter = THREE.LinearFilter; t.encoding = THREE.sRGBEncoding; return t;
}
const splashTexture = makeSplashTexture(256);

// smoke texture for trails/muzzle
function makeSmokeTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 28;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64,64,2,64,64,64);
  grd.addColorStop(0, 'rgba(228, 0, 0, 0.9)'); grd.addColorStop(0.5, 'rgba(255, 12, 12, 0.6)'); grd.addColorStop(1, 'rgba(235, 40, 40, 0)');
  ctx.fillStyle = grd; ctx.fillRect(0,0,128,128);
  const t = new THREE.CanvasTexture(c); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; return t;
}
const smokeTexture = makeSmokeTexture();

// 3D health bar helpers
function create3DHealthBar() {
  const width = 3.2, height = 0.44, gap = 0.06;
  const group = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.6, transparent: true }));
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(width - gap*2, height - gap*2), new THREE.MeshBasicMaterial({ color: 0x29a329, transparent: true }));
  const fgContainer = new THREE.Group(); fgContainer.add(fg);
  group.add(bg); group.add(fgContainer);
  group.userData = { fg, fgContainer, width, height };
  return group;
}
function attachHealthBarToShip(ship) {
  const bar = create3DHealthBar(); bar.position.set(0, 2.6, 0); ship.add(bar); ship.userData._hp3D = bar; updateShipHealthBar(ship);
}
function updateShipHealthBar(ship) {
  if (!ship?.userData?._hp3D) return;
  const bar = ship.userData._hp3D; const fg = bar.userData.fg;
  const max = ship.userData.isEnemy ? CONFIG.ENEMY_HEALTH : CONFIG.PLAYER_HEALTH;
  const pct = Math.max(0, Math.min(1, (ship.userData.health || 0) / max));
  fg.scale.x = pct;
  const full = bar.userData.width - 0.08;
  fg.position.x = -full/2 + (full * pct)/2;
  if (pct < 0.33) fg.material.color.set(0xff4433);
  else if (pct < 0.66) fg.material.color.set(0xffb84d);
  else fg.material.color.set(0x29a329);
  bar.quaternion.copy(camera.quaternion);
}

// =================== CORE: place ship above water & radius ===================
function setShipAboveWater(obj, waterY = 0, clearance = 0.02) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const bottomWorldY = box.min.y;
  const dy = (waterY + clearance) - bottomWorldY;
  obj.position.y += dy;
  obj.updateMatrixWorld(true);
  obj.userData.baseFloatY = obj.position.y;
  // radius computed from horizontal box size
  const size = new THREE.Vector3(); box.getSize(size);
  const radiusFromModel = Math.max(size.x, size.z) * 0.5;
  obj.userData.radius = (radiusFromModel && radiusFromModel > 0.01) ? radiusFromModel : (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
}

// =================== SWAY + SPLASH (per-ship) ===================
function setupShipSway(obj) {
  const amp = SWAY.baseAmplitude * (0.75 + Math.random() * 0.6);
  const freq = SWAY.baseFreq * (0.8 + Math.random() * 0.6);
  const phase = Math.random() * Math.PI * 2;
  obj.userData.sway = { amp, freq, phase, rollAmp: SWAY.rollAmp, pitchAmp: SWAY.pitchAmp };
  obj.userData._prevSwayOffset = 0;
  obj.userData._lastSplashTime = -999;
}

function applyShipSway(obj) {
  if (!obj?.userData?.sway) return;
  const s = obj.userData.sway; const t = clock.getElapsedTime();
  const base = (obj.userData.baseFloatY !== undefined) ? obj.userData.baseFloatY : obj.position.y;
  const offset = Math.sin(t * s.freq + s.phase) * s.amp; obj.position.y = base + offset;
  const roll = Math.cos(t * s.freq + s.phase) * s.rollAmp;
  const pitch = Math.sin(t * s.freq + s.phase) * s.pitchAmp;
  obj.rotation.x = pitch; obj.rotation.z = roll;

  // spawn splash when ship dips below threshold
  const threshold = -s.amp * SWAY.splashThresholdFactor;
  const prev = obj.userData._prevSwayOffset ?? 0;
  const now = offset;
  const elapsed = clock.getElapsedTime();
  if (prev > threshold && now <= threshold) {
    if (elapsed - (obj.userData._lastSplashTime || -999) > SWAY.splashCooldown) {
      spawnSplashAtShip(obj); obj.userData._lastSplashTime = elapsed;
    }
  }
  obj.userData._prevSwayOffset = offset;
}

// animated sprite splash (multiple particles)
function spawnSplashAtShip(ship) {
  const pos = new THREE.Vector3(ship.position.x, water.position.y + 0.02, ship.position.z);
  spawnSplashParticleBurst(pos, 6, 1.6 * (0.9 + Math.random()*0.4));
}

function spawnSplashParticleBurst(position, count = 5, scale = 1.8) {
  for (let i = 0; i < count; i++) {
    const mat = new THREE.SpriteMaterial({ map: splashTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const sp = new THREE.Sprite(mat);
    sp.position.copy(position).add(new THREE.Vector3((Math.random()-0.5)*1.4, 0.02, (Math.random()-0.5)*1.4));
    const s = scale * (0.6 + Math.random()*1.2);
    sp.scale.set(s, s, 1);
    // per-particle motion and life
    sp.userData = {
      life: 0,
      maxLife: 0.45 + Math.random()*0.6,
      vel: new THREE.Vector3((Math.random()-0.5)*2.4, 1.2 + Math.random()*1.6, (Math.random()-0.5)*2.4),
      rotSpeed: (Math.random()-0.5)*6,
      startScale: s,
      endScale: s*2.2
    };
    scene.add(sp); state.particles.push(sp);
  }
}

// ---------------- shell debris & smoke ----------------
function spawnShellEject(position, direction) {
  // small capsule/box that flies off to the side
  const g = new THREE.BoxGeometry(0.06, 0.03, 0.02);
  const m = new THREE.MeshStandardMaterial({ color: 0x996633 });
  const s = new THREE.Mesh(g, m);
  s.position.copy(position);
  // random sidewards and upwards
  const ejectDir = new THREE.Vector3((Math.random()*0.6 + 0.6) * (Math.random()<0.5?-1:1), 0.6 + Math.random()*0.6, 0.2 + Math.random()*0.6);
  // rotate ejectDir by ship quaternion to have it relative to ship orientation
  // if a direction (world) was provided, use perpendicular to that for ejection
  if (direction) {
    // pick perpendicular axis to direction in XZ plane
    const perp = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    ejectDir.copy(perp.multiplyScalar((Math.random()*0.5+0.8) * (Math.random()<0.5?-1:1))).add(new THREE.Vector3(0, 0.6 + Math.random()*0.6, 0.2));
  }
  s.userData = { vel: ejectDir.multiplyScalar(SHELL_EJECT_SPEED * (0.7 + Math.random()*0.6)), life: 0, maxLife: 1.2 + Math.random()*0.8 };
  scene.add(s); state.debris.push(s);
}

function spawnSmokeTrail(position, direction, life = 1.0, scale = 1.0) {
  const mat = new THREE.SpriteMaterial({ map: smokeTexture, transparent: true, depthWrite: false });
  const sp = new THREE.Sprite(mat);
  sp.position.copy(position);
  sp.scale.set(scale, scale, 1);
  sp.userData = { vel: direction.clone().multiplyScalar(6 * (0.6 + Math.random()*0.8)).add(new THREE.Vector3((Math.random()-0.5)*1, (Math.random()*0.3), (Math.random()-0.5)*1)), life:0, maxLife: life };
  scene.add(sp); state.particles.push(sp);
}

// =================== SHIP LOADER (adds turret with muzzle) ===================
function createShipOBJ(objUrl, color = 0x8b4513, onLoad) {
  loader.load(objUrl, (obj) => {
    obj.traverse((c) => {
      if (c.isMesh) {
        c.material = new THREE.MeshStandardMaterial({ color, metalness: 0.1, roughness: 0.6 });
        c.castShadow = true; c.receiveShadow = true;
        c.renderOrder = 0; c.material.depthWrite = true; c.material.depthTest = true;
      }
    });

    obj.scale.set(SHIP_MODEL_SCALE, SHIP_MODEL_SCALE, SHIP_MODEL_SCALE);
    obj.renderOrder = 0;

    // turret: group with barrel pointing local +Z
    const turret = new THREE.Group();
    const barrelLen = 2.6 * (0.9 + SHIP_MODEL_SCALE * 0.05);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, barrelLen, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    barrel.rotation.x = Math.PI / 2; // cylinder default axis Y -> rotate to point +Z
    barrel.position.set(0, 0.22, barrelLen * 0.2);
    
    barrel.scale.set(0.6, 0.4, 0.6);
    turret.add(barrel);
    turret.position.set(0, -0.8, 0.5);
    turret.scale.set(0.37, 0.85, 0.85);
    turret.userData = { recoil: { t: 0, dur: 0, amt: 0 } }; // recoil state

    obj.add(turret);

    obj.userData = {
      turret,
      radius: CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE,
      health: CONFIG.PLAYER_HEALTH,
      isEnemy: false,
      lastShotTime: -999,
      shootCooldown: CONFIG.PLAYER_COOLDOWN,
      dead: false
    };

    // snap to water and compute radius
    setShipAboveWater(obj, water.position.y, 0.02);

    // sway setup
    setupShipSway(obj);

    // healthbar
    attachHealthBarToShip(obj);

    // add to scene
    scene.add(obj);

    if (onLoad) onLoad(obj);
  }, undefined, (err) => console.error('OBJ load error', err));
}

// =================== Spawning player & enemies with safe placement ===================
let gameOver = false;
function spawnPlayer() {
  createShipOBJ('src/models/ship.obj', 0x9a4d00, (playerObj) => {
    state.player = playerObj;
    playerObj.userData.isEnemy = false;
    playerObj.userData.health = CONFIG.PLAYER_HEALTH;
    playerObj.userData.shootCooldown = CONFIG.PLAYER_COOLDOWN;
    playerObj.position.set(0, playerObj.position.y, 0);
    updateShipHealthBar(playerObj);
  });
}
function findSafeSpawn(x, z, minDistance = 120, maxAttempts = 12) {
  let candidate = new THREE.Vector2(x, z);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let ok = true;
    if (state.player) {
      const pr = state.player.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      if (Math.hypot(candidate.x - state.player.position.x, candidate.y - state.player.position.z) < (minDistance + pr)) ok = false;
    }
    for (let e of state.enemies) {
      if (!e) continue;
      const er = e.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      if (Math.hypot(candidate.x - e.position.x, candidate.y - e.position.z) < (minDistance + er)) { ok = false; break; }
    }
    if (ok) return candidate;
    const a = Math.random() * Math.PI * 2; const r = minDistance + attempt * 4 + Math.random() * 8;
    candidate.x += Math.cos(a) * r; candidate.y += Math.sin(a) * r;
  }
  return candidate;
}
function spawnEnemyAt(x, z) {
  const safe = findSafeSpawn(x, z, 12);
  createShipOBJ('src/models/ship.obj', 0x003366, (en) => {
    en.userData.isEnemy = true;
    en.userData.health = CONFIG.ENEMY_HEALTH;
    en.userData.shootCooldown = THREE.MathUtils.randFloat(CONFIG.ENEMY_COOLDOWN_MIN, CONFIG.ENEMY_COOLDOWN_MAX);
    en.userData.lastShotTime = -999;
    en.position.x = safe.x; en.position.z = safe.y;
    state.enemies.push(en); updateShipHealthBar(en);
  });
}
spawnPlayer();
for (let i = 0; i < 4; i++) spawnEnemyAt((i+1)*-24, (i-1)*18);

// =================== CANNONBALLS + firing with muzzle flash, recoil, shell eject ===================
function spawnCannonballFromShip(ownerShip, opts = {}) {
  if (!ownerShip || ownerShip.userData.dead) return null;
  const turret = ownerShip.userData.turret;
  // world pos + quaternion of turret
  const origin = new THREE.Vector3(); turret.getWorldPosition(origin);
  const worldQ = new THREE.Quaternion(); turret.getWorldQuaternion(worldQ);
  const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQ).normalize();
  const barrelLen = 1.6 + (SHIP_MODEL_SCALE * 0.12);
  const spawnPos = origin.clone().add(dir.clone().multiplyScalar(barrelLen));
  // create ball
  const geo = new THREE.SphereGeometry(CONFIG.BALL_RADIUS, 8, 8);
  const mat = new THREE.MeshStandardMaterial({ color: opts.color ?? 0x222222, metalness: 0.2, roughness: 0.5 });
  const ball = new THREE.Mesh(geo, mat);
  ball.position.copy(spawnPos);
  ball.userData = {
    velocity: dir.clone().multiplyScalar(opts.speed ?? CONFIG.BALL_SPEED),
    owner: opts.owner ?? (ownerShip.userData.isEnemy ? 'enemy' : 'player'),
    ownerShipRef: ownerShip,
    damage: opts.damage ?? CONFIG.BALL_DAMAGE,
    life: 0
  };
  scene.add(ball); state.cannonballs.push(ball);

  // muzzle flash sprite (short-lived)
  const mfMat = new THREE.SpriteMaterial({ map: splashTexture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const flash = new THREE.Sprite(mfMat);
  flash.position.copy(spawnPos);
  flash.scale.set(MUZZLE_FLASH_SCALE, MUZZLE_FLASH_SCALE, 1);
  flash.userData = { life: 0, maxLife: MUZZLE_FLASH_DURATION };
  scene.add(flash); state.particles.push(flash);

  // recoil: set turret recoil state (we'll apply over time)
  turret.userData.recoil = { t: 0, dur: RECOIL_DURATION, amt: RECOIL_AMOUNT };

  // shell ejection: spawn small debris using turret origin but offset to side
  spawnShellEject(origin.clone().add(new THREE.Vector3(0.2, 0.1, -0.2)), dir);

  // smoke trail behind ball
  spawnSmokeTrail(spawnPos.clone(), dir.clone().multiplyScalar(-0.5), 0.9, 0.9 * SHIP_MODEL_SCALE);

  // camera shake
  state.cameraShake.t = 0; state.cameraShake.intensity = CAMERA_SHAKE_INTENSITY;
  return ball;
}

let lastPlayerShot = -999;
function tryPlayerShoot() {
  if (!state.player || gameOver) return;
  const elapsed = clock.getElapsedTime();
  if (elapsed - lastPlayerShot < state.player.userData.shootCooldown) return;
  spawnCannonballFromShip(state.player, { owner: 'player', color: 0x111111 });
  lastPlayerShot = elapsed;
}

// =================== Update particle/debris arrays ===================
function updateParticles(delta) {
  // sprites: both splash and smoke are in state.particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.userData.life += delta;
    const t = p.userData.life / p.userData.maxLife;
    if (p.isSprite) {
      // motion update if vel exists
      if (p.userData.vel) p.position.addScaledVector(p.userData.vel, delta);
      // rotate for variety
      if (p.userData.rotSpeed) p.material.rotation += p.userData.rotSpeed * delta;
      // scale & fade
      if (p.userData.startScale !== undefined && p.userData.endScale !== undefined) {
        const s = THREE.MathUtils.lerp(p.userData.startScale, p.userData.endScale, t);
        p.scale.set(s, s, 1);
      }
      p.material.opacity = Math.max(0, 1 - t);
    } else {
      // legacy meshes in particles array (rare)
      if (p.userData.vel) { p.position.addScaledVector(p.userData.vel, delta); p.userData.vel.y -= 9.8 * delta * 0.6; }
      if (!p.material.transparent) p.material.transparent = true;
      p.material.opacity = Math.max(0, 1 - t);
    }
    if (p.userData.life >= p.userData.maxLife) { if (p.parent) p.parent.remove(p); state.particles.splice(i, 1); }
  }

  // debris: shell casings + small bits
  for (let i = state.debris.length - 1; i >= 0; i--) {
    const d = state.debris[i];
    d.userData.life += delta;
    d.position.addScaledVector(d.userData.vel, delta);
    d.userData.vel.y -= 9.8 * delta * 0.8;
    if (!d.material.transparent) d.material.transparent = true;
    d.material.opacity = Math.max(0, 1 - (d.userData.life / d.userData.maxLife));
    if (d.userData.life >= d.userData.maxLife) { if (d.parent) d.parent.remove(d); state.debris.splice(i, 1); }
  }
}

// =================== Update cannonballs & handle collisions ===================
function updateCannonballs(delta) {
  for (let i = state.cannonballs.length - 1; i >= 0; i--) {
    const b = state.cannonballs[i];
    b.userData.life += delta;
    b.position.addScaledVector(b.userData.velocity, delta);

    if (b.userData.life > 6 || b.position.length() > 3000) { if (b.parent) b.parent.remove(b); state.cannonballs.splice(i, 1); continue; }

    // hit player (if fired by enemy)
    if (b.userData.owner !== 'player' && state.player && !state.player.userData.dead) {
      const pr = state.player.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      const rsum = (pr + CONFIG.BALL_RADIUS);
      if (b.position.distanceToSquared(state.player.position) <= rsum * rsum) {
        state.player.userData.health -= b.userData.damage;
        spawnSplashParticleBurst(b.position.clone(), 3, 1.6);
        spawnDebris(b.position, 5);
        if (b.parent) b.parent.remove(b); state.cannonballs.splice(i, 1);
        if (state.player.userData.health <= 0) handleShipDeath(state.player);
        continue;
      }
    }

    // hit enemies
    let hitEnemy = null;
    for (let j = state.enemies.length - 1; j >= 0; j--) {
      const en = state.enemies[j];
      if (!en || en.userData.dead) continue;
      if (b.userData.owner === 'enemy' && b.userData.ownerShipRef === en) continue;
      const er = en.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      const rsum = er + CONFIG.BALL_RADIUS;
      if (b.position.distanceToSquared(en.position) <= rsum * rsum) { hitEnemy = en; break; }
    }
    if (hitEnemy) {
      hitEnemy.userData.health -= b.userData.damage;
      spawnSplashParticleBurst(b.position.clone(), 4, 1.3);
      spawnDebris(b.position, 6);
      if (b.parent) b.parent.remove(b); state.cannonballs.splice(i, 1);
      if (hitEnemy.userData.health <= 0) { state.kills++; state.score += 250; handleShipDeath(hitEnemy); } else { state.score += 10; }
      continue;
    }

    // water
    if (b.position.y <= 0.2) {
      spawnSplashParticleBurst(b.position.clone(), 5, 1.8);
      if (b.parent) b.parent.remove(b); state.cannonballs.splice(i, 1);
      continue;
    }

    // spawn a small smoke trail occasionally
    if (Math.random() < 0.02) spawnSmokeTrail(b.position.clone(), b.userData.velocity.clone().normalize().multiplyScalar(-1), 0.6, 0.6);
  }
}

// =================== Enemy AI (pursue & separate) ===================
function updateEnemies(delta, elapsed) {
  if (!state.player) return;
  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const en = state.enemies[i]; if (!en || en.userData.dead) continue;

    const toPlayer = new THREE.Vector3(state.player.position.x - en.position.x, 0, state.player.position.z - en.position.z);
    const dist = toPlayer.length();

    const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
    let dA = targetAngle - en.rotation.y; dA = Math.atan2(Math.sin(dA), Math.cos(dA));
    en.rotation.y += THREE.MathUtils.clamp(dA, -CONFIG.ENEMY_TURN_SPEED * delta, CONFIG.ENEMY_TURN_SPEED * delta);

    // turret aim relative to ship
    const turret = en.userData.turret;
    if (turret) {
      const dx = state.player.position.x - en.position.x; const dz = state.player.position.z - en.position.z;
      turret.rotation.y = Math.atan2(dx, dz) - en.rotation.y;
      // apply turret recoil (if any)
      applyTurretRecoil(turret, delta);
    }

    // movement + avoid others
    if (dist > 12) {
      const forward = new THREE.Vector3(0,0,1).applyQuaternion(en.quaternion);
      const avoid = new THREE.Vector3();
      for (let j = 0; j < state.enemies.length; j++) {
        if (i === j) continue;
        const other = state.enemies[j]; if (!other || other.userData.dead) continue;
        const dv = new THREE.Vector3().subVectors(en.position, other.position); const d = dv.length();
        if (d < 6 && d > 0.001) avoid.add(dv.normalize().multiplyScalar((6 - d) * 0.3));
      }
      en.position.addScaledVector(forward, CONFIG.ENEMY_MOVE_SPEED * delta);
      en.position.addScaledVector(avoid, delta);
    } else {
      en.position.x += Math.sin(elapsed * 0.5 + i) * 0.02;
      en.position.z += Math.cos(elapsed * 0.4 + i) * 0.02;
    }

    // apply sway (so enemies bob)
    applyShipSway(en);

    // firing logic
    if (dist <= CONFIG.ENEMY_SHOOT_RANGE) {
      if (elapsed - en.userData.lastShotTime >= en.userData.shootCooldown) {
        spawnCannonballFromShip(en, { owner: 'enemy', color: 0xaa2222, speed: CONFIG.BALL_SPEED * 0.98, damage: CONFIG.BALL_DAMAGE });
        en.userData.lastShotTime = elapsed;
        en.userData.shootCooldown = THREE.MathUtils.randFloat(CONFIG.ENEMY_COOLDOWN_MIN, CONFIG.ENEMY_COOLDOWN_MAX);
      }
    }

    updateShipHealthBar(en);
  }
}

// =================== Turret recoil apply (moves turret forward/back) ===================
function applyTurretRecoil(turret, delta) {
  const r = turret.userData.recoil;
  if (!r || r.dur <= 0) return;
  if (r.t < r.dur) {
    r.t += delta;
    const p = r.t / r.dur;
    // quick backward then ease out
    const amt = r.amt * (1 - (p)); // simple linear decay
    // apply along local -Z (move turret backward along its local forward)
    turret.position.z = (0.5) - amt; // default turret.position.z is ~0.5 in our loader; adjust if different
  } else {
    // reset
    turret.position.z = 0.5;
    turret.userData.recoil = { t:0, dur:0, amt:0 };
  }
}

// =================== Separation: only move enemies (player fixed) ===================
function maintainShipSeparation(minExtra = 2.0) {
  // enemies vs player -> move only enemies away
  if (state.player) {
    const player = state.player;
    for (let en of state.enemies) {
      if (!en || en.userData.dead) continue;
      const dx = en.position.x - player.position.x; const dz = en.position.z - player.position.z;
      const dist = Math.hypot(dx, dz);
      const rE = en.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      const rP = player.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      const desired = rE + rP + minExtra;
      if (dist < desired && dist > 0.001) {
        const overlap = desired - dist; const nx = dx / dist, nz = dz / dist;
        en.position.x += nx * overlap; en.position.z += nz * overlap;
      }
    }
  }
  // enemies vs enemies -> move both
  for (let i = 0; i < state.enemies.length; i++) {
    for (let j = i + 1; j < state.enemies.length; j++) {
      const A = state.enemies[i], B = state.enemies[j];
      if (!A || !B || A.userData.dead || B.userData.dead) continue;
      const dx = A.position.x - B.position.x, dz = A.position.z - B.position.z;
      let dist = Math.hypot(dx, dz);
      if (dist === 0) { const n = 0.01 + Math.random()*0.1; A.position.x += n; A.position.z += n; dist = Math.hypot(A.position.x - B.position.x, A.position.z - B.position.z); }
      const rA = A.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      const rB = B.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      const desired = rA + rB + minExtra;
      if (dist < desired) {
        const overlap = (desired - dist) / 2;
        const nx = dx / dist, nz = dz / dist;
        A.position.x += nx * overlap; A.position.z += nz * overlap;
        B.position.x -= nx * overlap; B.position.z -= nz * overlap;
      }
    }
  }
}

// =================== Death & sinking (same as before) ===================
function handleShipDeath(ship) {
  if (!ship || ship.userData.dead) return;
  ship.userData.dead = true;
  if (ship.userData.isEnemy) {
    const idx = state.enemies.indexOf(ship); if (idx !== -1) state.enemies.splice(idx, 1);
    spawnSplashParticleBurst(ship.position.clone(), 6, 2.4); spawnDebris(ship.position, 16);
    state.score += 150;
    state.sinking.push({ mesh: ship, timer: 0, duration: 3.0 });
  } else {
    spawnSplashParticleBurst(ship.position.clone(), 10, 3.2); spawnDebris(ship.position, 30);
    state.sinking.push({ mesh: ship, timer: 0, duration: 4.0 }); gameOver = true; showGameOverUI();
  }
}
function updateSinking(delta) {
  for (let i = state.sinking.length - 1; i >= 0; i--) {
    const s = state.sinking[i]; s.timer += delta; const t = s.timer / s.duration;
    s.mesh.position.y -= 0.6 * delta; s.mesh.rotation.z += 0.6 * delta; s.mesh.rotation.x += 0.25 * delta;
    s.mesh.traverse((c) => { if (c.isMesh && c.material) { if (!c.material.transparent) c.material.transparent = true; c.material.opacity = Math.max(0, 1 - t); } });
    if (s.timer >= s.duration) { if (s.mesh.parent) s.mesh.parent.remove(s.mesh); if (s.mesh.userData._hp3D) s.mesh.remove(s.mesh.userData._hp3D); state.sinking.splice(i, 1); }
  }
}

// =================== HUD / restart ===================
const hud = document.createElement('div');
hud.style.position='fixed'; hud.style.right='14px'; hud.style.top='14px';
hud.style.color='white'; hud.style.fontFamily='Arial, sans-serif'; hud.style.zIndex='2000'; hud.style.textAlign='right';
hud.innerHTML = `<div id="hud-score" style="font-size:18px;margin-bottom:8px">Score: 0</div><div id="hud-enemies" style="font-size:15px;margin-bottom:8px">Enemies: 0</div><div id="hud-kills" style="font-size:15px;margin-bottom:12px">Kills: 0</div>`;
document.body.appendChild(hud);
const restartBtn = document.createElement('button'); restartBtn.innerText='Restart';
Object.assign(restartBtn.style,{position:'fixed',left:'14px',top:'14px',zIndex:'2000',padding:'8px 12px',fontSize:'14px'});
restartBtn.addEventListener('click', restartGame); document.body.appendChild(restartBtn);
function updateHUD(){ document.getElementById('hud-score').innerText=`Score: ${state.score}`; document.getElementById('hud-enemies').innerText=`Enemies: ${state.enemies.length}`; document.getElementById('hud-kills').innerText=`Kills: ${state.kills}`; }
function showGameOverUI(){ let go = document.getElementById('game-over-screen'); if (!go) { go = document.createElement('div'); go.id='game-over-screen'; Object.assign(go.style,{position:'fixed',left:'0',top:'0',width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.6)',color:'#fff',fontSize:'36px',zIndex:'10000'}); go.innerHTML=`<div>GAME OVER<br/><small style="font-size:16px">Press Restart</small></div>`; document.body.appendChild(go); } else go.style.display='flex'; }
function clearWorld(){ state.enemies.forEach(e=>{ if (e.parent) e.parent.remove(e); if (e.userData._hp3D) e.remove(e.userData._hp3D); }); state.enemies=[]; state.cannonballs.forEach(b=>{ if (b.parent) b.parent.remove(b); }); state.cannonballs=[]; state.particles.forEach(p=>{ if (p.parent) p.parent.remove(p); }); state.particles=[]; state.debris.forEach(d=>{ if (d.parent) d.parent.remove(d); }); state.debris=[]; state.sinking.forEach(s=>{ if (s.mesh && s.mesh.parent) s.mesh.parent.remove(s.mesh); }); state.sinking=[]; if (state.player && state.player.parent) { if (state.player.userData._hp3D) state.player.remove(state.player.userData._hp3D); state.player.parent.remove(state.player); } state.player=null; state.score=0; state.kills=0; gameOver=false; }
function restartGame(){ clearWorld(); spawnPlayer(); for (let i=0;i<4;i++) spawnEnemyAt((i+1)*-24,(i-1)*18); const go=document.getElementById('game-over-screen'); if (go) go.style.display='none'; }

// =================== TURRET AIM & PLAYER CONTROLS ===================
function updatePlayerTurretAim() {
  if (!state.player) return;
  state.ray.setFromCamera(state.mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0,1,0), 0);
  const intersect = new THREE.Vector3(); state.ray.ray.intersectPlane(plane, intersect);
  const turret = state.player.userData.turret;
  if (turret) {
    const dx = intersect.x - state.player.position.x; const dz = intersect.z - state.player.position.z;
    turret.rotation.y = Math.atan2(dx, dz) - state.player.rotation.y;
  }
}

const PLAYER_SPEED = 28; const PLAYER_TURN = 3.2;
function updatePlayerControls(delta, elapsed) {
  if (!state.player || gameOver) return;
  const keys = state.keys;
  if (keys['s'] || keys['arrowup']) { state.player.position.x -= Math.sin(state.player.rotation.y) * PLAYER_SPEED * delta; state.player.position.z -= Math.cos(state.player.rotation.y) * PLAYER_SPEED * delta; }
  if (keys['w'] || keys['arrowdown']) { state.player.position.x += Math.sin(state.player.rotation.y) * PLAYER_SPEED * delta; state.player.position.z += Math.cos(state.player.rotation.y) * PLAYER_SPEED * delta; }
  if (keys['a'] || keys['arrowleft']) state.player.rotation.y += PLAYER_TURN * delta;
  if (keys['d'] || keys['arrowright']) state.player.rotation.y -= PLAYER_TURN * delta;

  // apply sway
  applyShipSway(state.player);

  // apply turret recoil if any
  applyTurretRecoil(state.player.userData.turret, delta);

  updateShipHealthBar(state.player);
}

// =================== CAMERA: mouse-X yaw control + lock-on ===================
function getMouseNormalizedX() {
  // Defensive: if mouseRawX is not set, use center (0)
  const raw = state.mouseRawX || window.innerWidth / 2;
  const nx = (raw / window.innerWidth) * 2 - 1; return THREE.MathUtils.clamp(nx, -1, 1);
}
function updateCameraFollow(delta) {
  if (!state.player) return;
  // normalized mouse x [-1..1]
  const nx = getMouseNormalizedX();
  const yawOffset = nx * CAMERA_YAW_MAX; // user's left-right movement translates to camera yaw offset

  // base camera position in player's local space (behind and up)
  const baseLocal = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
  // rotate baseLocal around Y by yawOffset to let the mouse control camera yaw relative to ship
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), yawOffset);
  baseLocal.applyQuaternion(rot);

  // world position
  const worldOffset = baseLocal.applyQuaternion(state.player.quaternion);
  const desiredPos = new THREE.Vector3().addVectors(state.player.position, worldOffset);

  // If locked on to a target, adjust camera to be between player and target and look at the target
  if (state.lockOn && state.lockTarget && !state.lockTarget.userData.dead) {
    // compute mid point between player and target, but keep offset behind player to avoid being inside target
    const mid = new THREE.Vector3().addVectors(state.player.position, state.lockTarget.position).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(state.lockTarget.position, state.player.position).setY(0).normalize();
    const behind = dir.clone().multiplyScalar(-6); // back off a bit behind player
    const lockedDesired = mid.clone().add(new THREE.Vector3(0, CAMERA_HEIGHT*0.6, 0)).add(behind);
    // smoother/ tighter mixing for lock-on
    camera.position.lerp(lockedDesired, LOCKON_SMOOTH);
    camera.lookAt(state.lockTarget.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
  } else {
    // standard follow: lerp camera position and fix pitch
    camera.position.lerp(desiredPos, CAMERA_LERP);
    // camera should look slightly above the ship's position
    const lookAt = state.player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    camera.lookAt(lookAt);
    // apply fixed pitch by tilting around camera's local X: (we approximate by ensuring lookAt pitch roughly equals CAMERA_PITCH)
    // (The lookAt above and camera position by default sets the pitch; we keep it.)
  }

  // camera shake: additive, decays over time
  if (state.cameraShake.t < CAMERA_SHAKE_DURATION) {
    state.cameraShake.t += delta;
    const p = 1 - (state.cameraShake.t / CAMERA_SHAKE_DURATION);
    const shake = state.cameraShake.intensity * p;
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    camera.position.z += (Math.random() - 0.5) * shake;
  }
}

// toggle lock-on: choose nearest enemy in front of player (simple choose nearest)
function toggleLockOn() {
  state.lockOn = !state.lockOn;
  if (state.lockOn) {
    if (state.enemies.length === 0) { state.lockOn = false; state.lockTarget = null; return; }
    // pick enemy closest to player (could instead pick closest to crosshair)
    let best = null; let bestD = Infinity;
    for (let e of state.enemies) {
      if (!e || e.userData.dead) continue;
      const d = e.position.distanceToSquared(state.player.position);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) state.lockTarget = best;
  } else {
    state.lockTarget = null;
  }
}

// =================== MAIN LOOP ===================
function animate() {
  const delta = Math.max(0.001, Math.min(0.05, clock.getDelta()));
  const elapsed = clock.getElapsedTime();
  requestAnimationFrame(animate);

  // shader updates
  water.update(elapsed);
  ground.update(elapsed);

  // controls & game logic
  updatePlayerControls(delta, elapsed);
  updatePlayerTurretAim();
  updateEnemies(delta, elapsed);
  updateCannonballs(delta);
  updateParticles(delta);
  updateSinking(delta);

  // maintain separation (move only enemies)
  maintainShipSeparation(50);

  // camera follow with mouse-X yaw + lock-on
  updateCameraFollow(delta);

  // apply sway/recoil/etc to player turret & healthbar updates
  if (state.player) {
    applyTurretRecoil(state.player.userData.turret, delta);
    applyShipSway(state.player);
    updateShipHealthBar(state.player);
  }
  for (let e of state.enemies) { if (e) { updateShipHealthBar(e); } }

  // render
  updateHUD();
  composer.render(delta);
}
animate();

// optional tweak UI hook
setupUI?.({ water, ground });

// =================== Utility helper functions used earlier ===================
function spawnDebris(position, count = 6) {
  for (let i = 0; i < count; i++) {
    const g = new THREE.SphereGeometry(0.06, 6, 6);
    const m = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const s = new THREE.Mesh(g, m);
    s.position.copy(position);
    s.userData = { vel: new THREE.Vector3((Math.random()-0.5)*5, Math.random()*5+1, (Math.random()-0.5)*5), life:0, maxLife:0.8 + Math.random()*0.8 };
    scene.add(s); state.particles.push(s);
  }
}
