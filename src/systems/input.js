// src/systems/input.js
// Input event handlers

import { state } from '../core/state';
import { LOCKON_KEY } from '../core/config';
import { tryPlayerShoot } from './combat';
import { toggleLockOn } from './camera';
import { gameOver } from '../core/state';

export function setupInputHandlers() {
  // Mouse movement
  window.addEventListener('mousemove', (ev) => {
    state.mouseRawX = ev.clientX;
    state.mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  });

  // Mouse click (shoot)
  window.addEventListener('mousedown', (ev) => {
    if (ev.button === 0 && state.player && !gameOver) tryPlayerShoot();
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    state.keys[e.key.toLowerCase()] = true;
    if (e.key.toLowerCase() === LOCKON_KEY) toggleLockOn();
  });
  window.addEventListener('keyup', (e) => state.keys[e.key.toLowerCase()] = false);
}
