// src/main.js
// Main game entry point - orchestrates all modules

import { clock, water, ground, composer, setupResizeHandler } from './core/renderer';
import { state } from './core/state';
import { setupInputHandlers } from './systems/input';
import { updateParticles } from './systems/particles';
import { updateShipHealthBar } from './systems/healthbar';
import { updateCannonballs, updateSinking } from './systems/combat';
import { updateCameraFollow } from './systems/camera';
import { updateHUD } from './systems/hud';
import { spawnPlayer } from './entities/player';
import { updatePlayerControls, updatePlayerTurretAim } from './entities/player';
import { spawnEnemyAt, updateEnemies } from './entities/enemy';
import { maintainShipSeparation, applyTurretRecoil, applyShipSway } from './entities/ship';
import { setupUI } from './ui';
import { networkManager } from './core/network';

// =================== NETWORK INITIALIZATION ===================
let multiplayerEnabled = false;
let playerInputRotation = 0;
let playerInputAcceleration = 0;

async function initializeMultiplayer() {
  try {
    // Get server URL from environment or default
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

    console.log('🔌 Connecting to multiplayer server...');
    await networkManager.connect(serverUrl);

    // Generate username
    const username = 'Player_' + Math.random().toString(36).substring(2, 9);
    await networkManager.authenticate(username);

    // Join default match
    await networkManager.joinMatch('match_default');

    multiplayerEnabled = true;
    console.log('✅ Multiplayer enabled!');

    // Setup network event handlers
    networkManager.onWorldUpdate = handleWorldUpdate;
    networkManager.onShipHit = handleShipHit;
    networkManager.onShipSunk = handleShipSunk;
    networkManager.onProjectileSpawned = handleProjectileSpawned;

  } catch (error) {
    console.warn('⚠️ Multiplayer initialization failed, running in single-player mode');
    console.warn(error);
    multiplayerEnabled = false;
  }
}

function handleWorldUpdate(data) {
  // Update state with remote ships and projectiles
  if (!state.remoteShips) state.remoteShips = new Map();

  data.ships.forEach(shipData => {
    if (shipData.id !== networkManager.shipId) {
      state.remoteShips.set(shipData.id, shipData);
    }
  });

  // Update projectiles count
  state.projectileCount = data.projectiles.length;
}

function handleShipHit(data) {
  console.log(`💥 ${data.shooterUsername} hit for ${data.damage} damage`);
}

function handleShipSunk(data) {
  console.log(`💀 ${data.sunkByUsername} sunk a ship!`);
}

function handleProjectileSpawned(data) {
  // Visual effect for projectile spawn can be added here
}

// =================== INITIALIZATION ===================
// Initialize multiplayer (non-blocking)
initializeMultiplayer();

// Setup event handlers
setupResizeHandler();
setupInputHandlers();

// Spawn player and initial enemies
spawnPlayer();
for (let i = 0; i < 4; i++) {
  // Move enemies further away to prevent initial overlap and lag
  const angle = (i / 4) * Math.PI * 2;
  const dist = 200 + i * 80; // Increased base distance and increment
  spawnEnemyAt(Math.cos(angle) * dist, Math.sin(angle) * dist);
}

// =================== MAIN GAME LOOP ===================
function animate() {
  const delta = Math.max(0.001, Math.min(0.05, clock.getDelta()));
  const elapsed = clock.getElapsedTime();
  requestAnimationFrame(animate);

  // Shader updates
  const shipPos = state.player ? state.player.position : null;
  water.update(elapsed, shipPos);
  ground.update(elapsed);

  // Send player input to server if multiplayer enabled
  if (multiplayerEnabled && networkManager.isReady()) {
    if (state.player) {
      networkManager.updateShipInput(
        state.player.rotation.z,
        playerInputAcceleration
      );
    }
  }

  // Controls & game logic
  updatePlayerControls(delta, elapsed);
  updatePlayerTurretAim();
  updateEnemies(delta, elapsed);
  updateCannonballs(delta);
  updateParticles(delta);
  updateSinking(delta);

  // Maintain separation (move only enemies)
  maintainShipSeparation(50);

  // Camera follow with mouse-X yaw + lock-on
  updateCameraFollow(delta);

  // Apply sway/recoil/etc to player turret & healthbar updates
  if (state.player) {
    applyTurretRecoil(state.player.userData.turret, delta);
    applyShipSway(state.player);
    updateShipHealthBar(state.player);
  }
  for (let e of state.enemies) {
    if (e) updateShipHealthBar(e);
  }

  // FPS tracking
  state._frames = (state._frames || 0) + 1;
  state._lastFpsTime = state._lastFpsTime || 0;
  if (elapsed - state._lastFpsTime >= 1.0) {
    const fpsEl = document.getElementById('fps-counter');
    if (fpsEl) {
      if (multiplayerEnabled) {
        const netStatus = networkManager.getStatus();
        fpsEl.innerText = `FPS: ${state._frames} | 🔌 ${netStatus.remoteShipsCount} ships`;
      } else {
        fpsEl.innerText = `FPS: ${state._frames}`;
      }
    }
    state._frames = 0;
    state._lastFpsTime = elapsed;
  }

  // Render
  updateHUD();
  composer.render(delta);
}

// Start the game loop
animate();

// Optional tweak UI hook
setupUI?.({ water, ground });
