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

// =================== INITIALIZATION ===================
// Setup event handlers
setupResizeHandler();
setupInputHandlers();

// Spawn player and initial enemies
spawnPlayer();
for (let i = 0; i < 4; i++) {
  spawnEnemyAt((i + 1) * -24, (i - 1) * 18);
}

// =================== MAIN GAME LOOP ===================
function animate() {
  const delta = Math.max(0.001, Math.min(0.05, clock.getDelta()));
  const elapsed = clock.getElapsedTime();
  requestAnimationFrame(animate);

  // Shader updates
  water.update(elapsed);
  ground.update(elapsed);

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

  // Render
  updateHUD();
  composer.render(delta);
}

// Start the game loop
animate();

// Optional tweak UI hook
setupUI?.({ water, ground });
