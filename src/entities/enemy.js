// src/entities/enemy.js
// Enemy AI and behavior

import * as THREE from 'three';
import { state } from '../core/state';
import { clock } from '../core/renderer';
import { CONFIG, SHIP_MODEL_SCALE } from '../core/config';
import { createShipOBJ, applyShipSway, applyTurretRecoil } from './ship';
import { updateShipHealthBar } from '../systems/healthbar';
import { spawnCannonballFromShip } from '../systems/combat';

// =================== Safe spawn finding ===================
export function findSafeSpawn(x, z, minDistance = 400, maxAttempts = 12) {
  let candidate = new THREE.Vector2(x, z);
  const shipRad = CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let ok = true;
    if (state.player) {
      const pr = state.player.userData.radius || shipRad;
      if (Math.hypot(candidate.x - state.player.position.x, candidate.y - state.player.position.z) < (minDistance + pr)) {
        ok = false;
      }
    }
    for (let e of state.enemies) {
      if (!e) continue;
      const er = e.userData.radius || shipRad;
      if (Math.hypot(candidate.x - e.position.x, candidate.y - e.position.z) < (minDistance + er)) {
        ok = false;
        break;
      }
    }
    if (ok) return candidate;
    const a = Math.random() * Math.PI * 2;
    const r = minDistance + attempt * 100 + Math.random() * 50;
    candidate.x += Math.cos(a) * r;
    candidate.y += Math.sin(a) * r;
  }
  return candidate;
}

// =================== Spawn enemy ===================
export function spawnEnemyAt(x, z) {
  // Increased safety distance for massive ships
  const safe = findSafeSpawn(x, z, 400);
  createShipOBJ('src/models/ship.obj', 0x003366, (en) => {
    en.userData.isEnemy = true;
    en.userData.health = CONFIG.ENEMY_HEALTH;
    en.userData.shootCooldown = THREE.MathUtils.randFloat(CONFIG.ENEMY_COOLDOWN_MIN, CONFIG.ENEMY_COOLDOWN_MAX);
    en.userData.lastShotTime = -999;
    en.position.x = safe.x;
    en.position.z = safe.y;
    state.enemies.push(en);
    updateShipHealthBar(en);
  });
}

// =================== Enemy AI (pursue & separate) ===================
export function updateEnemies(delta, elapsed) {
  if (!state.player) return;

  const shipRad = CONFIG.SHIP_RADIUS * SHIP_MODEL_SCALE;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const en = state.enemies[i];
    if (!en || en.userData.dead) continue;

    const toPlayer = new THREE.Vector3(
      state.player.position.x - en.position.x,
      0,
      state.player.position.z - en.position.z
    );
    const dist = toPlayer.length();

    const targetAngle = Math.atan2(toPlayer.x, toPlayer.z);
    let dA = targetAngle - en.rotation.y;
    dA = Math.atan2(Math.sin(dA), Math.cos(dA));
    en.rotation.y += THREE.MathUtils.clamp(dA, -CONFIG.ENEMY_TURN_SPEED * delta, CONFIG.ENEMY_TURN_SPEED * delta);

    // turret aim relative to ship
    const turret = en.userData.turret;
    if (turret) {
      const dx = state.player.position.x - en.position.x;
      const dz = state.player.position.z - en.position.z;
      turret.rotation.y = Math.atan2(dx, dz) - en.rotation.y;
      // apply turret recoil (if any)
      applyTurretRecoil(turret, delta);
    }

    // movement + avoid others
    // Increased distance checks for massive scale
    const avoidDist = shipRad * 2.5;

    if (dist > shipRad * 3) {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(en.quaternion);
      const avoid = new THREE.Vector3();
      for (let j = 0; j < state.enemies.length; j++) {
        if (i === j) continue;
        const other = state.enemies[j];
        if (!other || other.userData.dead) continue;
        const dv = new THREE.Vector3().subVectors(en.position, other.position);
        const d = dv.length();
        if (d < avoidDist && d > 0.001) {
          avoid.add(dv.normalize().multiplyScalar((avoidDist - d) * 0.5));
        }
      }
      en.position.addScaledVector(forward, CONFIG.ENEMY_MOVE_SPEED * delta);
      en.position.addScaledVector(avoid, delta);
    } else {
      // Idle bobbing
      en.position.x += Math.sin(elapsed * 0.5 + i) * 0.05;
      en.position.z += Math.cos(elapsed * 0.4 + i) * 0.05;
    }

    // apply sway (so enemies bob)
    applyShipSway(en);

    // firing logic
    if (dist <= CONFIG.ENEMY_SHOOT_RANGE) {
      if (elapsed - en.userData.lastShotTime >= en.userData.shootCooldown) {
        spawnCannonballFromShip(en, {
          owner: 'enemy',
          color: 0xaa2222,
          speed: CONFIG.BALL_SPEED * 0.98,
          damage: CONFIG.BALL_DAMAGE
        });
        en.userData.lastShotTime = elapsed;
        en.userData.shootCooldown = THREE.MathUtils.randFloat(CONFIG.ENEMY_COOLDOWN_MIN, CONFIG.ENEMY_COOLDOWN_MAX);
      }
    }

    updateShipHealthBar(en);
  }
}
