// src/systems/hud.js
// HUD and game over UI

import { state, setGameOver, gameOver } from '../core/state';
import { spawnPlayer } from '../entities/player';
import { spawnEnemyAt } from '../entities/enemy';

// =================== HUD / restart ===================

const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
  restartBtn.addEventListener('click', restartGame);
}

export function updateHUD() {
  const scoreEl = document.getElementById('hud-score');
  const enemiesEl = document.getElementById('hud-enemies');
  const killsEl = document.getElementById('hud-kills');

  if (scoreEl) scoreEl.innerText = `Score: ${state.score}`;
  if (enemiesEl) enemiesEl.innerText = `Enemies: ${state.enemies.length}`;
  if (killsEl) killsEl.innerText = `Kills: ${state.kills}`;
}

export function showGameOverUI() {
  const go = document.getElementById('game-over-screen');
  if (go) go.style.display = 'flex';
}

export function clearWorld() {
  state.enemies.forEach(e => { if (e.parent) e.parent.remove(e); if (e.userData._hp3D) e.remove(e.userData._hp3D); });
  state.enemies = [];
  state.cannonballs.forEach(b => { if (b.parent) b.parent.remove(b); });
  state.cannonballs = [];
  state.particles.forEach(p => { if (p.parent) p.parent.remove(p); });
  state.particles = [];
  state.debris.forEach(d => { if (d.parent) d.parent.remove(d); });
  state.debris = [];
  state.sinking.forEach(s => { if (s.mesh && s.mesh.parent) s.mesh.parent.remove(s.mesh); });
  state.sinking = [];
  if (state.player && state.player.parent) {
    if (state.player.userData._hp3D) state.player.remove(state.player.userData._hp3D);
    state.player.parent.remove(state.player);
  }
  state.player = null;
  state.score = 0;
  state.kills = 0;
  setGameOver(false);
}

export function restartGame() {
  clearWorld();
  spawnPlayer();
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const dist = 120 + i * 40;
    spawnEnemyAt(Math.cos(angle) * dist, Math.sin(angle) * dist);
  }
  const go = document.getElementById('game-over-screen');
  if (go) go.style.display = 'none';
}
