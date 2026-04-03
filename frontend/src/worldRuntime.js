// frontend/src/worldRuntime.js
// Bridges the existing Three.js playable scene into the current GameClient lifecycle.

import { clock, composer, ground, renderer, setupResizeHandler, water } from './core/renderer.js';
import { CONFIG, PLAYER_SPEED } from './core/config.js';
import { state } from './core/state.js';
import { spawnEnemyAt, updateEnemies } from './entities/enemy.js';
import { spawnPlayer, updatePlayerControls, updatePlayerTurretAim } from './entities/player.js';
import { maintainShipSeparation } from './entities/ship.js';
import { CameraMode, setCameraMode, updateCameraFollow } from './systems/camera.js';
import { updateCannonballs, updateSinking } from './systems/combat.js';
import { clearWorld, updateHUD as updateLegacyHUD } from './systems/hud.js';
import { updateParticles } from './systems/particles.js';
import { performanceMonitor } from './systems/performance/monitor.js';
import { setupInputHandlers } from './systems/input.js';

let initialized = false;
let worldActive = false;

renderer.domElement.style.display = 'none';
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.inset = '0';
renderer.domElement.style.zIndex = '0';

function toggleElement(id, isVisible, displayMode = 'block') {
  const element = document.getElementById(id);
  if (!element) return;

  element.style.display = isVisible ? displayMode : 'none';
}

function updateOverlayVisibility(isVisible) {
  toggleElement('hud', isVisible, 'block');
  toggleElement('crosshair', isVisible, 'flex');
  toggleElement('fps-counter', isVisible, 'block');
  toggleElement('game-over-screen', false, 'flex');
}

updateOverlayVisibility(false);

function updateFPSCounter() {
  const fpsCounter = document.getElementById('fps-counter');
  if (!fpsCounter) return;

  fpsCounter.textContent = `FPS: ${performanceMonitor.fps}`;
}

function ensureInitialized() {
  if (initialized) return;

  window.__APP_RENDERER = renderer;
  renderer.domElement.id = 'world-canvas';

  setupResizeHandler();
  setupInputHandlers();
  updateOverlayVisibility(false);
  initialized = true;
}

function spawnInitialEnemies() {
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const distance = 180 + i * 80;
    spawnEnemyAt(Math.cos(angle) * distance, Math.sin(angle) * distance);
  }
}

function syncWorldToGameState(gameState) {
  if (!gameState || !state.player) return;

  const velocity = Number(state.player.userData.velocity) || 0;
  const throttle = Math.max(0, Math.min(100, (Math.abs(velocity) / PLAYER_SPEED) * 100));

  gameState.setShipState({
    id: gameState.ship.id,
    type: gameState.ship.type || 'Sloop',
    position: {
      x: state.player.position.x,
      y: state.player.position.y,
      z: state.player.position.z
    },
    rotation: {
      x: state.player.rotation.x,
      y: state.player.rotation.y,
      z: state.player.rotation.z
    },
    hp: state.player.userData.health ?? gameState.ship.hp,
    maxHP: CONFIG.PLAYER_HEALTH,
    throttle,
    ammoType: gameState.ship.ammoType || 'normal'
  });

  gameState.otherShips.clear();
  state.enemies.forEach((enemy, index) => {
    if (!enemy?.position || enemy.userData?.dead) return;

    gameState.otherShips.set(enemy.id || `enemy_${index}`, {
      id: enemy.id || `enemy_${index}`,
      position: {
        x: enemy.position.x,
        y: enemy.position.y,
        z: enemy.position.z
      }
    });
  });
}

export function startWorld(gameState) {
  ensureInitialized();

  clearWorld();
  setCameraMode(CameraMode.THIRD_PERSON);
  spawnPlayer();
  spawnInitialEnemies();
  clock.start();
  worldActive = true;
  renderer.domElement.style.display = 'block';
  updateOverlayVisibility(true);
  syncWorldToGameState(gameState);
}

export function stopWorld() {
  if (!initialized) return;

  clearWorld();
  worldActive = false;
  renderer.domElement.style.display = 'none';
  updateOverlayVisibility(false);
}

export function updateWorld(gameState) {
  if (!worldActive) return;

  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  if (state.player?.position) {
    water.update(elapsed, state.player.position);
  } else {
    water.update(elapsed);
  }

  ground.update(elapsed);
  updatePlayerControls(delta, elapsed);
  updatePlayerTurretAim();
  updateEnemies(delta, elapsed);
  updateCannonballs(delta);
  updateParticles(delta);
  updateSinking(delta);
  maintainShipSeparation();
  updateCameraFollow(delta);
  composer.render();

  performanceMonitor.update();
  updateFPSCounter();
  updateLegacyHUD();
  syncWorldToGameState(gameState);
}
