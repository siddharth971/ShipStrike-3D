// src/entities/player.js
// Player controls and turret aiming

import * as THREE from 'three';
import { state, gameOver } from '../core/state';
import { camera } from '../core/renderer';
import { CONFIG, PLAYER_SPEED, PLAYER_TURN } from '../core/config';
import { createShipOBJ, applyShipSway, applyTurretRecoil } from './ship';
import { updateShipHealthBar } from '../systems/healthbar';

export function spawnPlayer() {
  createShipOBJ('src/models/ship.obj', 0x9a4d00, (playerObj) => {
    state.player = playerObj;
    playerObj.userData.isEnemy = false;
    playerObj.userData.health = CONFIG.PLAYER_HEALTH;
    playerObj.userData.shootCooldown = CONFIG.PLAYER_COOLDOWN;
    // Start at origin, but elevated by loader
    playerObj.position.set(0, playerObj.position.y, 0);
    updateShipHealthBar(playerObj);
  });
}

export function updatePlayerTurretAim() {
  if (!state.player) return;
  state.ray.setFromCamera(state.mouse, camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersect = new THREE.Vector3();
  state.ray.ray.intersectPlane(plane, intersect);
  const turret = state.player.userData.turret;
  if (turret) {
    const dx = intersect.x - state.player.position.x;
    const dz = intersect.z - state.player.position.z;
    // Point turret toward mouse
    turret.rotation.y = Math.atan2(dx, dz) - state.player.rotation.y;
  }
}

export function updatePlayerControls(delta, elapsed) {
  if (!state.player || gameOver) return;
  const keys = state.keys;
  const p = state.player.userData;

  p.velocity = p.velocity || 0;
  p.angularVelocity = p.angularVelocity || 0;

  const accel = 40;
  const decel = 20;
  const maxSpeed = PLAYER_SPEED;

  const turnAccel = 2.0;
  const turnDecel = 1.0;
  const maxTurn = PLAYER_TURN;

  let moving = false;
  let turning = false;

  // Forward / Backward
  if (keys['w'] || keys['arrowup']) {
    p.velocity += accel * delta;
    moving = true;
  } else if (keys['s'] || keys['arrowdown']) {
    p.velocity -= accel * delta;
    moving = true;
  }

  if (!moving) {
    if (p.velocity > 0) p.velocity = Math.max(0, p.velocity - decel * delta);
    else if (p.velocity < 0) p.velocity = Math.min(0, p.velocity + decel * delta);
  }

  p.velocity = THREE.MathUtils.clamp(p.velocity, -maxSpeed * 0.5, maxSpeed);

  // Apply velocity
  state.player.position.x += Math.sin(state.player.rotation.y) * p.velocity * delta;
  state.player.position.z += Math.cos(state.player.rotation.y) * p.velocity * delta;

  // Rotating (Yaw)
  if (keys['a'] || keys['arrowleft']) {
    p.angularVelocity += turnAccel * delta;
    turning = true;
  } else if (keys['d'] || keys['arrowright']) {
    p.angularVelocity -= turnAccel * delta;
    turning = true;
  }

  if (!turning) {
    if (p.angularVelocity > 0) p.angularVelocity = Math.max(0, p.angularVelocity - turnDecel * delta);
    else if (p.angularVelocity < 0) p.angularVelocity = Math.min(0, p.angularVelocity + turnDecel * delta);
  }

  p.angularVelocity = THREE.MathUtils.clamp(p.angularVelocity, -maxTurn, maxTurn);

  state.player.rotation.y += p.angularVelocity * delta;

  applyShipSway(state.player);
  applyTurretRecoil(state.player.userData.turret, delta);
  updateShipHealthBar(state.player);
}
