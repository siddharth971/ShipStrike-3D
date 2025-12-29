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
    turret.rotation.y = Math.atan2(dx, dz) - state.player.rotation.y;
  }
}

export function updatePlayerControls(delta, elapsed) {
  if (!state.player || gameOver) return;
  const keys = state.keys;
  if (keys['s'] || keys['arrowup']) {
    state.player.position.x -= Math.sin(state.player.rotation.y) * PLAYER_SPEED * delta;
    state.player.position.z -= Math.cos(state.player.rotation.y) * PLAYER_SPEED * delta;
  }
  if (keys['w'] || keys['arrowdown']) {
    state.player.position.x += Math.sin(state.player.rotation.y) * PLAYER_SPEED * delta;
    state.player.position.z += Math.cos(state.player.rotation.y) * PLAYER_SPEED * delta;
  }
  if (keys['a'] || keys['arrowleft']) state.player.rotation.y += PLAYER_TURN * delta;
  if (keys['d'] || keys['arrowright']) state.player.rotation.y -= PLAYER_TURN * delta;
  applyShipSway(state.player);
  applyTurretRecoil(state.player.userData.turret, delta);
  updateShipHealthBar(state.player);
}
