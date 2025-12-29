// src/systems/combat.js
// Cannonball, firing, and damage systems

import * as THREE from 'three';
import { state, gameOver, setGameOver } from '../core/state';
import { scene, clock } from '../core/renderer';
import {
  CONFIG,
  SHIP_MODEL_SCALE,
  MUZZLE_FLASH_DURATION,
  MUZZLE_FLASH_SCALE,
  RECOIL_AMOUNT,
  RECOIL_DURATION,
  CAMERA_SHAKE_INTENSITY
} from '../core/config';
import { splashTexture } from '../core/textures';
import { spawnSplashParticleBurst, spawnShellEject, spawnSmokeTrail, spawnDebris } from './particles';
import { showGameOverUI } from './hud';

// =================== CANNONBALLS + firing with muzzle flash, recoil, shell eject ===================
export function spawnCannonballFromShip(ownerShip, opts = {}) {
  if (!ownerShip || ownerShip.userData.dead) return null;

  const turret = ownerShip.userData.turret;
  // world pos + quaternion of turret
  const origin = new THREE.Vector3();
  turret.getWorldPosition(origin);
  const worldQ = new THREE.Quaternion();
  turret.getWorldQuaternion(worldQ);
  const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(worldQ).normalize();
  const barrelLen = 1.6 + (SHIP_MODEL_SCALE * 0.12);
  const spawnPos = origin.clone().add(dir.clone().multiplyScalar(barrelLen));

  // create ball
  const geo = new THREE.SphereGeometry(CONFIG.BALL_RADIUS, 8, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: opts.color ?? 0x222222,
    metalness: 0.2,
    roughness: 0.5
  });
  const ball = new THREE.Mesh(geo, mat);
  ball.position.copy(spawnPos);
  ball.userData = {
    velocity: dir.clone().multiplyScalar(opts.speed ?? CONFIG.BALL_SPEED),
    owner: opts.owner ?? (ownerShip.userData.isEnemy ? 'enemy' : 'player'),
    ownerShipRef: ownerShip,
    damage: opts.damage ?? CONFIG.BALL_DAMAGE,
    life: 0
  };
  scene.add(ball);
  state.cannonballs.push(ball);

  // muzzle flash sprite (short-lived)
  const mfMat = new THREE.SpriteMaterial({
    map: splashTexture,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const flash = new THREE.Sprite(mfMat);
  flash.position.copy(spawnPos);
  flash.scale.set(MUZZLE_FLASH_SCALE, MUZZLE_FLASH_SCALE, 1);
  flash.userData = { life: 0, maxLife: MUZZLE_FLASH_DURATION };
  scene.add(flash);
  state.particles.push(flash);

  // recoil: set turret recoil state (we'll apply over time)
  turret.userData.recoil = { t: 0, dur: RECOIL_DURATION, amt: RECOIL_AMOUNT };

  // shell ejection: spawn small debris using turret origin but offset to side
  spawnShellEject(origin.clone().add(new THREE.Vector3(0.2, 0.1, -0.2)), dir);

  // smoke trail behind ball
  spawnSmokeTrail(spawnPos.clone(), dir.clone().multiplyScalar(-0.5), 0.9, 0.9 * SHIP_MODEL_SCALE);

  // camera shake
  state.cameraShake.t = 0;
  state.cameraShake.intensity = CAMERA_SHAKE_INTENSITY;

  return ball;
}

let lastPlayerShot = -999;

export function tryPlayerShoot() {
  if (!state.player || gameOver) return;
  const elapsed = clock.getElapsedTime();
  if (elapsed - lastPlayerShot < state.player.userData.shootCooldown) return;
  spawnCannonballFromShip(state.player, { owner: 'player', color: 0x111111 });
  lastPlayerShot = elapsed;
}

// =================== Update cannonballs & handle collisions ===================
export function updateCannonballs(delta) {
  for (let i = state.cannonballs.length - 1; i >= 0; i--) {
    const b = state.cannonballs[i];
    b.userData.life += delta;
    b.position.addScaledVector(b.userData.velocity, delta);

    if (b.userData.life > 6 || b.position.length() > 3000) {
      if (b.parent) b.parent.remove(b);
      state.cannonballs.splice(i, 1);
      continue;
    }

    // hit player (if fired by enemy)
    if (b.userData.owner !== 'player' && state.player && !state.player.userData.dead) {
      const pr = state.player.userData.radius || (CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE);
      const rsum = (pr + CONFIG.BALL_RADIUS);
      if (b.position.distanceToSquared(state.player.position) <= rsum * rsum) {
        state.player.userData.health -= b.userData.damage;
        spawnSplashParticleBurst(b.position.clone(), 3, 1.6);
        spawnDebris(b.position, 5);
        if (b.parent) b.parent.remove(b);
        state.cannonballs.splice(i, 1);
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
      if (b.position.distanceToSquared(en.position) <= rsum * rsum) {
        hitEnemy = en;
        break;
      }
    }
    if (hitEnemy) {
      hitEnemy.userData.health -= b.userData.damage;
      spawnSplashParticleBurst(b.position.clone(), 4, 1.3);
      spawnDebris(b.position, 6);
      if (b.parent) b.parent.remove(b);
      state.cannonballs.splice(i, 1);
      if (hitEnemy.userData.health <= 0) {
        state.kills++;
        state.score += 250;
        handleShipDeath(hitEnemy);
      } else {
        state.score += 10;
      }
      continue;
    }

    // water
    if (b.position.y <= 0.2) {
      spawnSplashParticleBurst(b.position.clone(), 5, 1.8);
      if (b.parent) b.parent.remove(b);
      state.cannonballs.splice(i, 1);
      continue;
    }

    // spawn a small smoke trail occasionally
    if (Math.random() < 0.02) {
      spawnSmokeTrail(b.position.clone(), b.userData.velocity.clone().normalize().multiplyScalar(-1), 0.6, 0.6);
    }
  }
}

// =================== Death & sinking ===================
export function handleShipDeath(ship) {
  if (!ship || ship.userData.dead) return;
  ship.userData.dead = true;

  if (ship.userData.isEnemy) {
    const idx = state.enemies.indexOf(ship);
    if (idx !== -1) state.enemies.splice(idx, 1);
    spawnSplashParticleBurst(ship.position.clone(), 6, 2.4);
    spawnDebris(ship.position, 16);
    state.score += 150;
    state.sinking.push({ mesh: ship, timer: 0, duration: 3.0 });
  } else {
    spawnSplashParticleBurst(ship.position.clone(), 10, 3.2);
    spawnDebris(ship.position, 30);
    state.sinking.push({ mesh: ship, timer: 0, duration: 4.0 });
    setGameOver(true);
    showGameOverUI();
  }
}

export function updateSinking(delta) {
  for (let i = state.sinking.length - 1; i >= 0; i--) {
    const s = state.sinking[i];
    s.timer += delta;
    const t = s.timer / s.duration;
    s.mesh.position.y -= 0.6 * delta;
    s.mesh.rotation.z += 0.6 * delta;
    s.mesh.rotation.x += 0.25 * delta;
    s.mesh.traverse((c) => {
      if (c.isMesh && c.material) {
        if (!c.material.transparent) c.material.transparent = true;
        c.material.opacity = Math.max(0, 1 - t);
      }
    });
    if (s.timer >= s.duration) {
      if (s.mesh.parent) s.mesh.parent.remove(s.mesh);
      if (s.mesh.userData._hp3D) s.mesh.remove(s.mesh.userData._hp3D);
      state.sinking.splice(i, 1);
    }
  }
}
