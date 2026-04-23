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
import { GameModeManager } from './systems/gamemode/modemanager.js';
import { updateParticles } from './systems/particles.js';
import { performanceMonitor } from './systems/performance/monitor.js';
import { setupInputHandlers } from './systems/input.js';
import { setupUI } from './ui.js';

let initialized = false;
let worldActive = false;
let waterDebugPane = null;
const modeManager = new GameModeManager();
let sessionContext = {
  mode: 'teamflags',
  shipCode: '',
  playerName: 'Captain'
};

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
  toggleElement('mode-briefing', isVisible, 'block');
}

function ensureWaterDebugPane() {
  if (waterDebugPane) return waterDebugPane;

  waterDebugPane = setupUI({ water, ground });
  waterDebugPane.hidden = true;
  return waterDebugPane;
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

function getModeConfig(mode) {
  if (mode === 'trading') {
    return {
      label: 'Trader Mode',
      description: 'Longer lanes, lighter enemy pressure, and route-minded pacing.',
      enemyCount: 2
    };
  }

  return {
    label: 'Team Flags',
    description: 'Fleet skirmish pressure with more enemy contacts and faster combat.',
    enemyCount: 6
  };
}

function getModeOverview() {
  const activeMode = modeManager.getCurrentMode();
  if (activeMode?.getGameOverview) return activeMode.getGameOverview();
  if (activeMode?.getMatchOverview) return activeMode.getMatchOverview();
  return null;
}

function ensureModeBriefing() {
  let briefing = document.getElementById('mode-briefing');
  if (briefing) return briefing;

  briefing = document.createElement('div');
  briefing.id = 'mode-briefing';
  briefing.className = 'mode-briefing';
  document.body.appendChild(briefing);
  return briefing;
}

function updateModeBriefing() {
  const briefing = ensureModeBriefing();
  const modeConfig = getModeConfig(sessionContext.mode);
  const overview = getModeOverview();
  const objective = sessionContext.mode === 'trading'
    ? `Ports in session: ${overview?.ports?.length ?? 0}. Profit goal: ${overview?.profitGoal ?? 0}.`
    : `Score to win: ${overview?.scoreToWin ?? 3}. Red ${overview?.redTeam?.score ?? 0} - Blue ${overview?.blueTeam?.score ?? 0}.`;
  const crewLine = sessionContext.shipCode
    ? `Crew code reserved: ${sessionContext.shipCode}. Shared-ship join is still not server-backed.`
    : 'Solo launch active. Shared-ship join is still not server-backed.';

  briefing.innerHTML = `
    <div class="mode-briefing-kicker">${modeConfig.label}</div>
    <div class="mode-briefing-title">${sessionContext.playerName}</div>
    <div class="mode-briefing-copy">${modeConfig.description}</div>
    <div class="mode-briefing-meta">${objective}</div>
    <div class="mode-briefing-meta">${crewLine}</div>
  `;
}

function configureMode(gameState) {
  const playerId = gameState?.playerId || 'local-player';
  modeManager.setMode(sessionContext.mode, 'local-session');
  const activeMode = modeManager.getCurrentMode();

  if (!activeMode) {
    updateModeBriefing();
    return;
  }

  if (sessionContext.mode === 'trading') {
    activeMode.startMatch?.();
    activeMode.dockAtPort?.(playerId, 'port_center');
  } else {
    activeMode.assignPlayerToTeam?.(playerId);
    activeMode.startMatch?.();
  }

  updateModeBriefing();
}

function spawnInitialEnemies(mode) {
  const { enemyCount } = getModeConfig(mode);

  for (let i = 0; i < enemyCount; i++) {
    const angle = (i / enemyCount) * Math.PI * 2;
    const distance = mode === 'trading' ? 320 + i * 120 : 180 + i * 70;
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

export function startWorld(gameState, options = {}) {
  sessionContext = {
    mode: options.mode === 'trading' ? 'trading' : 'teamflags',
    shipCode: String(options.shipCode || ''),
    playerName: String(options.playerName || gameState?.playerName || 'Captain')
  };

  ensureInitialized();

  clearWorld();
  configureMode(gameState);
  setCameraMode(CameraMode.THIRD_PERSON);
  spawnPlayer();
  spawnInitialEnemies(sessionContext.mode);
  clock.start();
  worldActive = true;
  renderer.domElement.style.display = 'block';
  ensureWaterDebugPane().hidden = false;
  updateOverlayVisibility(true);
  updateModeBriefing();
  syncWorldToGameState(gameState);
}

export function stopWorld() {
  if (!initialized) return;

  clearWorld();
  modeManager.clear();
  worldActive = false;
  renderer.domElement.style.display = 'none';
  if (waterDebugPane) waterDebugPane.hidden = true;
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
  updateModeBriefing();
  syncWorldToGameState(gameState);
}
