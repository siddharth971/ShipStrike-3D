// src/systems/camera.js
// Camera follow and lock-on system

import * as THREE from 'three';
import { state } from '../core/state';
import { camera } from '../core/renderer';
import {
  CAMERA_HEIGHT, CAMERA_DISTANCE, CAMERA_YAW_MAX,
  CAMERA_LERP, LOCKON_SMOOTH, CAMERA_SHAKE_DURATION
} from '../core/config';

function getMouseNormalizedX() {
  const raw = state.mouseRawX || window.innerWidth / 2;
  const nx = (raw / window.innerWidth) * 2 - 1;
  return THREE.MathUtils.clamp(nx, -1, 1);
}

export function updateCameraFollow(delta) {
  if (!state.player) return;
  const nx = getMouseNormalizedX();
  const yawOffset = nx * CAMERA_YAW_MAX;
  const baseLocal = new THREE.Vector3(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
  const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawOffset);
  baseLocal.applyQuaternion(rot);
  const worldOffset = baseLocal.applyQuaternion(state.player.quaternion);
  const desiredPos = new THREE.Vector3().addVectors(state.player.position, worldOffset);

  if (state.lockOn && state.lockTarget && !state.lockTarget.userData.dead) {
    const mid = new THREE.Vector3().addVectors(state.player.position, state.lockTarget.position).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(state.lockTarget.position, state.player.position).setY(0).normalize();
    const behind = dir.clone().multiplyScalar(-6);
    const lockedDesired = mid.clone().add(new THREE.Vector3(0, CAMERA_HEIGHT * 0.6, 0)).add(behind);
    camera.position.lerp(lockedDesired, LOCKON_SMOOTH);
    camera.lookAt(state.lockTarget.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
  } else {
    camera.position.lerp(desiredPos, CAMERA_LERP);
    const lookAt = state.player.position.clone().add(new THREE.Vector3(0, 1.2, 0));
    camera.lookAt(lookAt);
  }

  if (state.cameraShake.t < CAMERA_SHAKE_DURATION) {
    state.cameraShake.t += delta;
    const p = 1 - (state.cameraShake.t / CAMERA_SHAKE_DURATION);
    const shake = state.cameraShake.intensity * p;
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    camera.position.z += (Math.random() - 0.5) * shake;
  }
}

export function toggleLockOn() {
  state.lockOn = !state.lockOn;
  if (state.lockOn) {
    if (state.enemies.length === 0) { state.lockOn = false; state.lockTarget = null; return; }
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
