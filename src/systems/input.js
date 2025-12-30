// src/systems/input.js
// Input event handlers

import { state } from '../core/state';
import { LOCKON_KEY } from '../core/config';
import { tryPlayerShoot } from './combat';
import { toggleLockOn, cycleCameraMode, cameraState, CameraMode, initFreeCameraControls } from './camera';
import { gameOver } from '../core/state';

export function setupInputHandlers() {
  // Initialize camera mouse controls
  initFreeCameraControls();

  // Mouse movement
  window.addEventListener('mousemove', (ev) => {
    state.mouseRawX = ev.clientX;
    state.mouse.x = (ev.clientX / window.innerWidth) * 2 - 1;
    state.mouse.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  });

  // Mouse click (shoot) - works in first-person and third-person modes
  window.addEventListener('mousedown', (ev) => {
    if (cameraState.mode === CameraMode.FREE) return; // Don't shoot in free camera mode
    if (ev.button === 0 && state.player && !gameOver) tryPlayerShoot();
  });

  // Keyboard
  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    state.keys[key] = true;

    // Toggle lock-on (third person only)
    if (key === LOCKON_KEY) toggleLockOn();

    // Cycle camera mode with 'C' key (more intuitive for camera)
    if (key === 'c' || key === 'v') cycleCameraMode();
  });

  window.addEventListener('keyup', (e) => {
    state.keys[e.key.toLowerCase()] = false;
  });

  // Show controls hint
  showControlsHint();
}

function showControlsHint() {
  const hint = document.createElement('div');
  hint.id = 'controls-hint';
  hint.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 16px 20px;
      border-radius: 10px;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.8;
      z-index: 10000;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
      pointer-events: none;
    ">
      <div style="font-weight: bold; margin-bottom: 10px; color: #4db8e8; font-size: 15px;">🚢 Ship Controls</div>
      <div><kbd style="background:#444;padding:3px 8px;border-radius:4px;margin-right:8px;">W/S</kbd> Forward / Backward</div>
      <div><kbd style="background:#444;padding:3px 8px;border-radius:4px;margin-right:8px;">A/D</kbd> Turn Left / Right</div>
      <div><kbd style="background:#444;padding:3px 8px;border-radius:4px;margin-right:8px;">Mouse</kbd> Aim & Look Around</div>
      <div><kbd style="background:#444;padding:3px 8px;border-radius:4px;margin-right:8px;">Click</kbd> Fire Cannons</div>
      <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.2);">
        <div style="color: #88ccff;"><kbd style="background:#444;padding:3px 8px;border-radius:4px;margin-right:8px;">C</kbd> Cycle Camera View</div>
        <div style="color: #888; font-size: 11px; margin-top: 4px;">Captain's View → Third Person → Free Cam</div>
      </div>
      <div style="margin-top: 8px; color: #888;"><kbd style="background:#444;padding:3px 8px;border-radius:4px;margin-right:8px;">H</kbd> Toggle UI</div>
    </div>
  `;
  document.body.appendChild(hint);

  // Auto-hide after 10 seconds
  setTimeout(() => {
    hint.style.transition = 'opacity 1.5s';
    hint.style.opacity = '0';
    setTimeout(() => hint.remove(), 1500);
  }, 10000);
}
