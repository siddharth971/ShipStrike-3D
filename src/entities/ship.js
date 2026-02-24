// src/entities/ship.js
// Ship creation, sway, and utilities

import * as THREE from 'three';
import { state } from '../core/state';
import { scene, loader, water, clock } from '../core/renderer';
import { CONFIG, SHIP_MODEL_SCALE, SWAY } from '../core/config';
import { attachHealthBarToShip } from '../systems/healthbar';
import { spawnSplashAtShip, spawnWake } from '../systems/particles';

// =================== CORE: place ship above water & radius ===================
export function setShipAboveWater(obj, waterY = 0, clearance = 0.02) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const bottomWorldY = box.min.y;
  const dy = (waterY + clearance) - bottomWorldY;
  obj.position.y += dy;
  obj.updateMatrixWorld(true);
  obj.userData.baseFloatY = obj.position.y;

  // radius computed from horizontal box size
  const size = new THREE.Vector3();
  box.getSize(size);
  const radiusFromModel = Math.max(size.x, size.z) * 0.5;
  obj.userData.radius = (radiusFromModel && radiusFromModel > 0.01)
    ? radiusFromModel
    : (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
}

// =================== SWAY + SPLASH (per-ship) ===================
export function setupShipSway(obj) {
  const amp = SWAY.baseAmplitude * (0.75 + Math.random() * 0.6);
  const freq = SWAY.baseFreq * (0.8 + Math.random() * 0.6);
  const phase = Math.random() * Math.PI * 2;
  obj.userData.sway = { amp, freq, phase, rollAmp: SWAY.rollAmp, pitchAmp: SWAY.pitchAmp };
  obj.userData._prevSwayOffset = 0;
  obj.userData._lastSplashTime = -999;
  obj.userData._prevPos = obj.position.clone();
}

export function applyShipSway(obj) {
  if (!obj?.userData?.sway) return;
  const s = obj.userData.sway;
  const t = clock.getElapsedTime();
  const base = (obj.userData.baseFloatY !== undefined) ? obj.userData.baseFloatY : obj.position.y;
  const offset = Math.sin(t * s.freq + s.phase) * s.amp;
  obj.position.y = base + offset;
  const roll = Math.cos(t * s.freq + s.phase) * s.rollAmp;
  const pitch = Math.sin(t * s.freq + s.phase) * s.pitchAmp;
  obj.rotation.x = pitch;
  obj.rotation.z = roll;

  // spawn splash when ship dips below threshold
  const threshold = -s.amp * SWAY.splashThresholdFactor;
  const prev = obj.userData._prevSwayOffset ?? 0;
  const now = offset;
  const elapsed = clock.getElapsedTime();
  if (prev > threshold && now <= threshold) {
    if (elapsed - (obj.userData._lastSplashTime || -999) > SWAY.splashCooldown) {
      spawnSplashAtShip(obj);
      obj.userData._lastSplashTime = elapsed;
    }
  }
  obj.userData._prevSwayOffset = offset;

  // Wake effect if moving
  if (obj.userData._prevPos) {
    const dx = obj.position.x - obj.userData._prevPos.x;
    const dz = obj.position.z - obj.userData._prevPos.z;
    if (Math.hypot(dx, dz) > 0.05 && Math.random() < 0.25) {
      // Spawn at rear of ship
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(obj.quaternion);
      const rear = obj.position.clone().add(forward.multiplyScalar(-15.0));
      spawnWake(rear, 4.0);
    }
  }
  obj.userData._prevPos = obj.position.clone();
}

// =================== SHIP LOADER (adds turret with muzzle) ===================
let cachedShipBase = null;
const barrelLen = 2.6 * (0.9 + SHIP_MODEL_SCALE * 0.05);
const SHARED_BARREL_GEO = new THREE.CylinderGeometry(0.14, 0.14, barrelLen, 12);
SHARED_BARREL_GEO.rotateX(Math.PI / 2); // cylinder default axis Y -> rotate to point +Z
const SHARED_BARREL_MAT = new THREE.MeshStandardMaterial({ color: 0x111111 });

// Cache materials by color to avoid creating too many and allow batching
const shipMaterials = {};

export function createShipOBJ(objUrl, color = 0x8b4513, onLoad) {
  const initShip = (baseObj) => {
    const obj = baseObj.clone();

    if (!shipMaterials[color]) {
      shipMaterials[color] = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.1,
        roughness: 0.6,
        depthWrite: true,
        depthTest: true,
        transparent: true // Enable from the start to avoid shader recompile when sinking
      });
    }

    obj.traverse((c) => {
      if (c.isMesh) {
        c.material = shipMaterials[color];
        c.castShadow = true;
        c.receiveShadow = true;
        c.renderOrder = 0;
        c.frustumCulled = true; // explicitly ensure distant meshes are culled out safely
      }
    });

    obj.scale.set(SHIP_MODEL_SCALE, SHIP_MODEL_SCALE, SHIP_MODEL_SCALE);
    obj.renderOrder = 0;

    // turret: group with barrel pointing local +Z
    const turret = new THREE.Group();
    const barrel = new THREE.Mesh(SHARED_BARREL_GEO, SHARED_BARREL_MAT);
    // Already rotated in geometry
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
  };

  if (cachedShipBase) {
    initShip(cachedShipBase);
  } else {
    loader.load(objUrl, (obj) => {
      cachedShipBase = obj;
      initShip(cachedShipBase);
    }, undefined, (err) => console.error('OBJ load error', err));
  }
}

// =================== Turret recoil apply (moves turret forward/back) ===================
export function applyTurretRecoil(turret, delta) {
  if (!turret) return;
  const r = turret.userData.recoil;
  if (!r || r.dur <= 0) return;

  if (r.t < r.dur) {
    r.t += delta;
    const p = r.t / r.dur;
    // quick backward then ease out
    const amt = r.amt * (1 - p); // simple linear decay
    // apply along local -Z (move turret backward along its local forward)
    turret.position.z = (0.5) - amt; // default turret.position.z is ~0.5 in our loader
  } else {
    // reset
    turret.position.z = 0.5;
    turret.userData.recoil = { t: 0, dur: 0, amt: 0 };
  }
}

// =================== Separation: only move enemies (player fixed) ===================
export function maintainShipSeparation(minExtra = 10.0) {
  const SHIP_RAD = CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE;

  // 1. Ships vs Island
  if (state.island && state.island.userData.radius) {
    const isPos = state.island.position;
    const ir = state.island.userData.radius;

    // Player vs Island
    if (state.player) {
      const dx = state.player.position.x - isPos.x;
      const dz = state.player.position.z - isPos.z;
      const dist = Math.hypot(dx, dz);
      const pr = state.player.userData.radius || SHIP_RAD;
      const desired = ir + pr;
      if (dist < desired && dist > 0.001) {
        const overlap = desired - dist;
        state.player.position.x += (dx / dist) * overlap;
        state.player.position.z += (dz / dist) * overlap;
      }
    }

    // Enemies vs Island
    for (let en of state.enemies) {
      if (!en || en.userData.dead) continue;
      const dx = en.position.x - isPos.x;
      const dz = en.position.z - isPos.z;
      const dist = Math.hypot(dx, dz);
      const er = en.userData.radius || SHIP_RAD;
      const desired = ir + er;
      if (dist < desired && dist > 0.001) {
        const overlap = desired - dist;
        en.position.x += (dx / dist) * overlap;
        en.position.z += (dz / dist) * overlap;
      }
    }
  }

  // 2. enemies vs player -> move only enemies away
  if (state.player) {
    const player = state.player;
    for (let en of state.enemies) {
      if (!en || en.userData.dead) continue;
      const dx = en.position.x - player.position.x;
      const dz = en.position.z - player.position.z;
      const dist = Math.hypot(dx, dz);
      const rE = en.userData.radius || SHIP_RAD;
      const rP = player.userData.radius || SHIP_RAD;
      const desired = rE + rP + minExtra;
      if (dist < desired && dist > 0.001) {
        const overlap = desired - dist;
        const nx = dx / dist, nz = dz / dist;
        en.position.x += nx * overlap;
        en.position.z += nz * overlap;
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
      if (dist === 0) {
        const n = 0.01 + Math.random() * 0.1;
        A.position.x += n;
        A.position.z += n;
        dist = Math.hypot(A.position.x - B.position.x, A.position.z - B.position.z);
      }
      const rA = A.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      const rB = B.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      const desired = rA + rB + minExtra;
      if (dist < desired) {
        const overlap = (desired - dist) / 2;
        const nx = dx / dist, nz = dz / dist;
        A.position.x += nx * overlap;
        A.position.z += nz * overlap;
        B.position.x -= nx * overlap;
        B.position.z -= nz * overlap;
      }
    }
  }
}
