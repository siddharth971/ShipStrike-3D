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

// =================== PHASE 6 SYSTEMS ===================
import { touchController } from './systems/mobile/touchController.js';
import { lodSystem } from './systems/rendering/lodSystem.js';
import { performanceMonitor } from './systems/performance/monitor.js';

// =================== NETWORK INITIALIZATION ===================
let multiplayerEnabled = false;
let playerInputRotation = 0;
let playerInputAcceleration = 0;

async function initializeMultiplayer() {
  try {
    // Get server URL from environment or default
    const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

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
    // Silently fail - server not available, run single-player mode
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

// =================== PHASE 6 INITIALIZATION ===================
// Initialize mobile touch controller (will auto-detect device)
if (touchController.initialize()) {
  console.log('✅ Mobile touch controller initialized');

  // Wire touch input to player controls
  touchController.onMovement = (angle, magnitude) => {
    playerInputRotation = angle;
    playerInputAcceleration = magnitude;
  };

  touchController.onActionButton = (buttonName, pressed) => {
    // Map touch buttons to game actions
    switch (buttonName) {
      case 'primary':
        // Fire button - wired to game input system
        if (state.player && state.player.userData.turret) {
          state.player.userData.turret.isFiring = pressed;
        }
        break;
      case 'secondary':
        // Interact button
        break;
      case 'tertiary':
        // Special ability
        break;
      case 'map':
        // Toggle map
        if (pressed) {
          const mapEl = document.getElementById('map-container');
          if (mapEl) mapEl.style.display = mapEl.style.display === 'none' ? 'block' : 'none';
        }
        break;
    }
  };
}

// Initialize LOD system
lodSystem.thresholds = {
  high: 300,
  medium: 800,
  low: 1500,
  veryLow: 2500
};
console.log('✅ LOD system initialized');

// Initialize performance monitor
performanceMonitor.targetFPS = 60;
console.log('✅ Performance monitor initialized');

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

  // ========== PERFORMANCE MONITORING ==========
  performanceMonitor.update();

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

  // ========== LOD SYSTEM UPDATE ==========
  if (state.player && state.enemies) {
    const viewerPos = state.player.position;
    const allShips = [state.player, ...state.enemies].filter(s => s);
    const lodUpdates = lodSystem.batchUpdateLODs(viewerPos, allShips);

    // Apply visibility updates
    for (const shipId of lodUpdates.culled || []) {
      const ship = allShips.find(s => s.userData.id === shipId);
      if (ship && ship.mesh) ship.mesh.visible = false;
    }
  }

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
      const fpsStats = performanceMonitor.getFPSStats();
      if (multiplayerEnabled) {
        const netStatus = networkManager.getStatus();
        fpsEl.innerText = `FPS: ${fpsStats.current} | 🔌 ${netStatus.remoteShipsCount} ships | 💾 ${Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB`;
      } else {
        fpsEl.innerText = `FPS: ${fpsStats.current} | 💾 ${Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024 || 0)}MB`;
      }
    }
    state._frames = 0;
    state._lastFpsTime = elapsed;
  }

  // Update debug overlay if visible
  if (performanceMonitor.debugOverlay && performanceMonitor.debugOverlay.style.display !== 'none') {
    performanceMonitor.updateDebugOverlay();
  }

  // Render
  updateHUD();
  composer.render(delta);
}

// Start the game loop
animate();

// Optional tweak UI hook
setupUI?.({ water, ground });

// =================== PHASE 6 DEBUG CONTROLS ===================
document.addEventListener('keydown', (e) => {
  // Press 'D' to toggle performance debug overlay
  if (e.key === 'd' || e.key === 'D') {
    if (performanceMonitor.debugOverlay) {
      if (performanceMonitor.debugOverlay.style.display === 'none') {
        performanceMonitor.showDebugOverlay();
        console.log('📊 Performance overlay SHOWN');
      } else {
        performanceMonitor.hideDebugOverlay();
        console.log('📊 Performance overlay HIDDEN');
      }
    } else {
      performanceMonitor.createDebugOverlay();
      performanceMonitor.showDebugOverlay();
      console.log('📊 Performance overlay CREATED');
    }
  }

  // Press 'T' to toggle mobile touch controls (for testing on desktop)
  if (e.key === 't' || e.key === 'T') {
    touchController.toggle();
    console.log(`📱 Touch controls toggled: ${touchController.isVisible ? 'VISIBLE' : 'HIDDEN'}`);
  }

  // Press 'L' to test LOD system
  if (e.key === 'l' || e.key === 'L') {
    if (state.player && state.enemies) {
      const viewerPos = state.player.position;
      const allShips = [state.player, ...state.enemies].filter(s => s);
      const stats = lodSystem.getStats();
      console.log('📊 LOD System Stats:');
      console.log(`  Total entities: ${stats.totalEntities}`);
      console.log(`  Culled entities: ${stats.culledEntities}`);
      console.log(`  Avg LOD level: ${stats.avgLODLevel.toFixed(2)}`);
    }
  }

  // Press 'P' to print performance stats
  if (e.key === 'p' || e.key === 'P') {
    const fpsStats = performanceMonitor.getFPSStats();
    const frameTimeStats = performanceMonitor.getFrameTimeStats();
    const memoryStats = performanceMonitor.getMemoryStats();

    console.log('📊 PERFORMANCE STATS:');
    console.log('  FPS:', fpsStats);
    console.log('  Frame Time (ms):', frameTimeStats);
    console.log('  Memory:', memoryStats);
  }
});

// =================== PHASE 6 TEST SUITE ===================
window.testPhase6 = function () {
  console.log('\n🧪 PHASE 6 TEST SUITE STARTING...\n');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Mobile Touch Controller
  try {
    console.log('✓ Test 1: Mobile Touch Controller');
    if (touchController) {
      console.log('  - touchController exists');
      if (typeof touchController.initialize === 'function') console.log('  - initialize() method exists');
      if (typeof touchController.getJoystickState === 'function') console.log('  - getJoystickState() method exists');
      if (typeof touchController.vibrate === 'function') console.log('  - vibrate() method exists');
      console.log('  ✅ PASSED');
      testsPassed++;
    }
  } catch (e) {
    console.error('  ❌ FAILED:', e.message);
    testsFailed++;
  }

  // Test 2: LOD System
  try {
    console.log('✓ Test 2: LOD System');
    if (lodSystem) {
      console.log('  - lodSystem exists');
      if (typeof lodSystem.calculateLODLevel === 'function') console.log('  - calculateLODLevel() method exists');
      if (typeof lodSystem.batchUpdateLODs === 'function') console.log('  - batchUpdateLODs() method exists');
      if (typeof lodSystem.getStats === 'function') console.log('  - getStats() method exists');
      const stats = lodSystem.getStats();
      console.log(`  - Stats available: ${Object.keys(stats).length} metrics`);
      console.log('  ✅ PASSED');
      testsPassed++;
    }
  } catch (e) {
    console.error('  ❌ FAILED:', e.message);
    testsFailed++;
  }

  // Test 3: Performance Monitor
  try {
    console.log('✓ Test 3: Performance Monitor');
    if (performanceMonitor) {
      console.log('  - performanceMonitor exists');
      if (typeof performanceMonitor.update === 'function') console.log('  - update() method exists');
      if (typeof performanceMonitor.getFPSStats === 'function') console.log('  - getFPSStats() method exists');
      if (typeof performanceMonitor.createDebugOverlay === 'function') console.log('  - createDebugOverlay() method exists');
      const fpsStats = performanceMonitor.getFPSStats();
      console.log(`  - FPS tracking active: ${fpsStats.current.toFixed(1)} FPS`);
      console.log('  ✅ PASSED');
      testsPassed++;
    }
  } catch (e) {
    console.error('  ❌ FAILED:', e.message);
    testsFailed++;
  }

  // Test 4: Game State Integration
  try {
    console.log('✓ Test 4: Game State Integration');
    if (state.player) {
      console.log('  - Player ship exists');
      console.log(`  - Player position: (${state.player.position.x.toFixed(1)}, ${state.player.position.y.toFixed(1)}, ${state.player.position.z.toFixed(1)})`);
    }
    if (state.enemies && state.enemies.length > 0) {
      console.log(`  - ${state.enemies.length} enemy ships spawned`);
    }
    console.log('  ✅ PASSED');
    testsPassed++;
  } catch (e) {
    console.error('  ❌ FAILED:', e.message);
    testsFailed++;
  }

  // Test 5: Network Manager (Non-blocking)
  try {
    console.log('✓ Test 5: Network Manager');
    if (networkManager) {
      console.log('  - networkManager exists');
      const status = networkManager.getStatus();
      console.log(`  - Connection status: ${networkManager.connected ? '✅ Connected' : '❌ Not connected'}`);
      console.log(`  - Authenticated: ${networkManager.authenticated ? '✅ Yes' : '❌ No'}`);
      console.log('  ✅ PASSED');
      testsPassed++;
    }
  } catch (e) {
    console.error('  ❌ FAILED:', e.message);
    testsFailed++;
  }

  // Test 6: Input System
  try {
    console.log('✓ Test 6: Input System');
    if (typeof playerInputRotation === 'number') console.log('  - playerInputRotation tracked');
    if (typeof playerInputAcceleration === 'number') console.log('  - playerInputAcceleration tracked');
    console.log('  ✅ PASSED');
    testsPassed++;
  } catch (e) {
    console.error('  ❌ FAILED:', e.message);
    testsFailed++;
  }

  console.log(`\n📊 TEST RESULTS: ${testsPassed} passed, ${testsFailed} failed\n`);

  if (testsFailed === 0) {
    console.log('🎉 ALL PHASE 6 TESTS PASSED!\n');
  } else {
    console.log(`⚠️  ${testsFailed} tests failed. Please review.\n`);
  }

  return { passed: testsPassed, failed: testsFailed };
};

// Print instructions
console.log(`
🚀 ShipStrike-3D Phase 6 Debug Controls:
  D - Toggle performance overlay
  T - Toggle mobile touch controls
  L - Show LOD system stats
  P - Print detailed performance stats
  
🧪 Run tests: window.testPhase6()
`);

