// src/systems/hud.js
// HUD and game over UI

import * as THREE from 'three';
import { state, setGameOver, gameOver } from '../core/state';
import { spawnPlayer } from '../entities/player';
import { spawnEnemyAt } from '../entities/enemy';
import { camera } from '../core/renderer';
import { CONFIG } from '../core/config';

// =================== HUD / restart ===================

const restartBtn = document.getElementById('restart-btn');
if (restartBtn) {
  restartBtn.addEventListener('click', restartGame);
}

const goRestartBtn = document.getElementById('go-restart-btn');
if (goRestartBtn) {
  goRestartBtn.addEventListener('click', restartGame);
}

export function updateHUD() {
  const scoreEl = document.getElementById('hud-score');
  const enemiesEl = document.getElementById('hud-enemies');
  const killsEl = document.getElementById('hud-kills');
  const healthBarEl = document.getElementById('hud-health-bar');
  const lockonIndicator = document.getElementById('lockon-indicator');

  if (scoreEl) scoreEl.innerText = `Score: ${state.score}`;
  if (enemiesEl) enemiesEl.innerText = `Enemies: ${state.enemies.length}`;
  if (killsEl) killsEl.innerText = `Kills: ${state.kills}`;

  if (healthBarEl && state.player) {
    const pct = Math.max(0, state.player.userData.health / CONFIG.PLAYER_HEALTH) * 100;
    healthBarEl.style.width = `${pct}%`;
    if (pct < 33) healthBarEl.style.background = '#ff4433';
    else if (pct < 66) healthBarEl.style.background = '#ffb84d';
    else healthBarEl.style.background = '#29a329';
  }

  if (lockonIndicator) {
    if (state.lockOn && state.lockTarget && !state.lockTarget.userData.dead) {
      const pos = state.lockTarget.position.clone();
      pos.y += 15; // slightly above ship center
      pos.project(camera);
      // check if behind camera
      if (pos.z > 1) {
        lockonIndicator.style.display = 'none';
      } else {
        const x = (pos.x * .5 + .5) * window.innerWidth;
        const y = (pos.y * -.5 + .5) * window.innerHeight;
        lockonIndicator.style.display = 'block';
        lockonIndicator.style.left = `${x}px`;
        lockonIndicator.style.top = `${y}px`;
      }
    } else {
      lockonIndicator.style.display = 'none';
    }
  }
}

export function showGameOverUI() {
  const go = document.getElementById('game-over-screen');
  const goScore = document.getElementById('go-score');
  const goKills = document.getElementById('go-kills');
  const goHighscore = document.getElementById('go-highscore');

  let highscore = parseInt(localStorage.getItem('ship3d_highscore')) || 0;
  if (state.score > highscore) {
    highscore = state.score;
    localStorage.setItem('ship3d_highscore', highscore);
  }

  if (goScore) goScore.innerText = `Final Score: ${state.score}`;
  if (goKills) goKills.innerText = `Ships Destroyed: ${state.kills}`;
  if (goHighscore) goHighscore.innerText = `High Score: ${highscore}`;

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
  state.waveTimer = 0;
  state.waveCount = 1;
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
