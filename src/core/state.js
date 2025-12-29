// src/core/state.js
// Game state management

import * as THREE from 'three';

// --- State & helpers ---
export const state = {
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

// Game over flag
export let gameOver = false;

export function setGameOver(value) {
  gameOver = value;
}
