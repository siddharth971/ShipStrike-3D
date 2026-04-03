// src/systems/camera.js
// Camera follow, lock-on, FREE CAMERA, and FIRST-PERSON (Captain) mode

import * as THREE from 'three';
import { state } from '../core/state';
import { camera } from '../core/renderer';
import {
  CAMERA_HEIGHT, CAMERA_DISTANCE, CAMERA_YAW_MAX,
  CAMERA_LERP, LOCKON_SMOOTH, CAMERA_SHAKE_DURATION,
  SHIP_MODEL_SCALE
} from '../core/config';

// Camera mode types
export const CameraMode = {
  THIRD_PERSON: 'third_person',
  FIRST_PERSON: 'first_person',  // Captain's view
  FREE: 'free'
};

// Camera state
export const cameraState = {
  mode: CameraMode.FIRST_PERSON,  // Default to first-person captain view

  // First-person settings (captain's bridge view)
  firstPerson: {
    height: 4.5 * SHIP_MODEL_SCALE,     // Height on deck
    forward: 2.0 * SHIP_MODEL_SCALE,    // Position toward front of ship
    lookAhead: 50,                       // How far ahead to look
    headBob: 0.15,                       // Subtle head bob with waves
    mouseLookX: 0,                       // Mouse look horizontal
    mouseLookY: 0,                       // Mouse look vertical
    maxLookAngle: Math.PI * 0.4          // Max look angle
  },

  // Free camera settings
  free: {
    enabled: false,
    position: new THREE.Vector3(0, 50, 100),
    target: new THREE.Vector3(0, 0, 0),
    spherical: new THREE.Spherical(100, Math.PI / 3, 0),
    isDragging: false,
    lastMouse: { x: 0, y: 0 },
    moveSpeed: 100,
    rotateSpeed: 0.005,
    zoomSpeed: 10,
    dampingFactor: 0.1
  }
};

// For backwards compatibility
export const freeCam = cameraState.free;

// Cycle through camera modes
export function cycleCameraMode() {
  if (cameraState.mode === CameraMode.FIRST_PERSON) {
    cameraState.mode = CameraMode.THIRD_PERSON;
    cameraState.free.enabled = false;
    console.log('📷 Camera: Third Person (Behind Ship)');
  } else if (cameraState.mode === CameraMode.THIRD_PERSON) {
    cameraState.mode = CameraMode.FREE;
    cameraState.free.enabled = true;
    initFreeCameraFromCurrent();
    console.log('📷 Camera: Free Camera (WASD/Arrows + Mouse)');
  } else {
    cameraState.mode = CameraMode.FIRST_PERSON;
    cameraState.free.enabled = false;
    console.log('📷 Camera: First Person (Captain\'s View)');
  }
}

// Set specific camera mode
export function setCameraMode(mode) {
  cameraState.mode = mode;
  cameraState.free.enabled = (mode === CameraMode.FREE);
  if (mode === CameraMode.FREE) {
    initFreeCameraFromCurrent();
  }
}

function initFreeCameraFromCurrent() {
  cameraState.free.position.copy(camera.position);
  const forward = new THREE.Vector3(0, 0, -1);
  forward.applyQuaternion(camera.quaternion);
  cameraState.free.target.copy(camera.position).add(forward.multiplyScalar(50));
  const offset = new THREE.Vector3().subVectors(camera.position, cameraState.free.target);
  cameraState.free.spherical.setFromVector3(offset);
}

// Initialize camera controls
export function initFreeCameraControls() {
  const canvas = document.querySelector('canvas');
  if (!canvas) return;

  // Mouse down - start drag (for free camera) or look (for first person)
  canvas.addEventListener('mousedown', (e) => {
    if (cameraState.mode === CameraMode.FREE) {
      if (e.button === 0 || e.button === 2) {
        cameraState.free.isDragging = true;
        cameraState.free.lastMouse.x = e.clientX;
        cameraState.free.lastMouse.y = e.clientY;
      }
    }
  });

  // Mouse up
  window.addEventListener('mouseup', () => {
    cameraState.free.isDragging = false;
  });

  // Mouse move
  window.addEventListener('mousemove', (e) => {
    if (cameraState.mode === CameraMode.FREE && cameraState.free.isDragging) {
      const deltaX = e.clientX - cameraState.free.lastMouse.x;
      const deltaY = e.clientY - cameraState.free.lastMouse.y;

      cameraState.free.spherical.theta -= deltaX * cameraState.free.rotateSpeed;
      cameraState.free.spherical.phi += deltaY * cameraState.free.rotateSpeed;
      cameraState.free.spherical.phi = THREE.MathUtils.clamp(
        cameraState.free.spherical.phi, 0.1, Math.PI - 0.1
      );

      cameraState.free.lastMouse.x = e.clientX;
      cameraState.free.lastMouse.y = e.clientY;
    }

    // First person mouse look
    if (cameraState.mode === CameraMode.FIRST_PERSON) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;

      cameraState.firstPerson.mouseLookX = nx * cameraState.firstPerson.maxLookAngle;
      cameraState.firstPerson.mouseLookY = -ny * cameraState.firstPerson.maxLookAngle * 0.3;
    }
  });

  // Mouse wheel - zoom (free camera only)
  canvas.addEventListener('wheel', (e) => {
    if (cameraState.mode === CameraMode.FREE) {
      e.preventDefault();
      cameraState.free.spherical.radius += e.deltaY * 0.1;
      cameraState.free.spherical.radius = THREE.MathUtils.clamp(
        cameraState.free.spherical.radius, 5, 500
      );
    }
  }, { passive: false });

  // Prevent context menu
  canvas.addEventListener('contextmenu', (e) => {
    if (cameraState.mode === CameraMode.FREE) e.preventDefault();
  });
}

// Toggle free camera (legacy function)
export function toggleFreeCamera() {
  cycleCameraMode();
}

function getMouseNormalizedX() {
  const raw = state.mouseRawX || window.innerWidth / 2;
  const nx = (raw / window.innerWidth) * 2 - 1;
  return THREE.MathUtils.clamp(nx, -1, 1);
}

// Update first person camera (captain's view)
function updateFirstPersonCamera(delta) {
  if (!state.player) return;

  const ship = state.player;
  const fp = cameraState.firstPerson;

  // Position camera on ship's deck
  const shipUp = new THREE.Vector3(0, 1, 0);
  const shipForward = new THREE.Vector3(0, 0, 1);
  shipForward.applyQuaternion(ship.quaternion);

  // Camera position: on the ship, elevated, slightly forward
  const camPos = ship.position.clone();
  camPos.y += fp.height;
  camPos.add(shipForward.clone().multiplyScalar(fp.forward));

  // Add subtle head bob based on ship movement
  const time = performance.now() * 0.001;
  camPos.y += Math.sin(time * 1.5) * fp.headBob;

  // Smooth camera position
  camera.position.lerp(camPos, 0.15);

  // Look direction: forward from ship + mouse look
  const lookDir = shipForward.clone();

  // Apply mouse look rotation
  const shipRight = new THREE.Vector3(1, 0, 0);
  shipRight.applyQuaternion(ship.quaternion);

  // Horizontal mouse look (yaw)
  lookDir.applyAxisAngle(shipUp, fp.mouseLookX);

  // Vertical mouse look (pitch) - limited
  lookDir.applyAxisAngle(shipRight, fp.mouseLookY);

  // Calculate look target
  const lookTarget = camera.position.clone().add(lookDir.multiplyScalar(fp.lookAhead));

  // Smooth look at
  const currentLook = new THREE.Vector3();
  camera.getWorldDirection(currentLook);
  const currentTarget = camera.position.clone().add(currentLook.multiplyScalar(fp.lookAhead));
  currentTarget.lerp(lookTarget, 0.1);

  camera.lookAt(currentTarget);
}

// Update free camera
function updateFreeCameraMovement(delta) {
  if (cameraState.mode !== CameraMode.FREE) return;

  const speed = cameraState.free.moveSpeed * delta;

  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();

  const right = new THREE.Vector3();
  right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

  const up = new THREE.Vector3(0, 1, 0);

  if (state.keys['w'] || state.keys['arrowup']) {
    cameraState.free.target.add(forward.clone().multiplyScalar(speed));
  }
  if (state.keys['s'] || state.keys['arrowdown']) {
    cameraState.free.target.add(forward.clone().multiplyScalar(-speed));
  }
  if (state.keys['a'] || state.keys['arrowleft']) {
    cameraState.free.target.add(right.clone().multiplyScalar(-speed));
  }
  if (state.keys['d'] || state.keys['arrowright']) {
    cameraState.free.target.add(right.clone().multiplyScalar(speed));
  }
  if (state.keys['e'] || state.keys[' ']) {
    cameraState.free.target.add(up.clone().multiplyScalar(speed));
  }
  if (state.keys['q'] || state.keys['shift']) {
    cameraState.free.target.add(up.clone().multiplyScalar(-speed));
  }

  const offset = new THREE.Vector3().setFromSpherical(cameraState.free.spherical);
  const desiredPosition = cameraState.free.target.clone().add(offset);

  camera.position.lerp(desiredPosition, cameraState.free.dampingFactor * 5);
  camera.lookAt(cameraState.free.target);
}

// Update third person camera (behind ship)
function updateThirdPersonCamera(delta) {
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
}

// Main camera update function
export function updateCameraFollow(delta) {
  // Update based on current mode
  switch (cameraState.mode) {
    case CameraMode.FIRST_PERSON:
      updateFirstPersonCamera(delta);
      break;
    case CameraMode.THIRD_PERSON:
      updateThirdPersonCamera(delta);
      break;
    case CameraMode.FREE:
      updateFreeCameraMovement(delta);
      break;
  }

  // Apply camera shake (all modes)
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
  // Only works in third person
  if (cameraState.mode !== CameraMode.THIRD_PERSON) return;

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
