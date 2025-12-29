// src/systems/hud.js
// HUD and game over UI

import { state, setGameOver, gameOver } from '../core/state';
import { spawnPlayer } from '../entities/player';
import { spawnEnemyAt } from '../entities/enemy';

// =================== HUD / restart ===================
const hud = document.createElement('div');
hud.style.position = 'fixed';
hud.style.right = '14px';
hud.style.top = '14px';
hud.style.color = 'white';
hud.style.fontFamily = 'Arial, sans-serif';
hud.style.zIndex = '2000';
hud.style.textAlign = 'right';
hud.innerHTML = `
  <div id="hud-score" style="font-size:18px;margin-bottom:8px">Score: 0</div>
  <div id="hud-enemies" style="font-size:15px;margin-bottom:8px">Enemies: 0</div>
  <div id="hud-kills" style="font-size:15px;margin-bottom:12px">Kills: 0</div>
`;
document.body.appendChild(hud);

const restartBtn = document.createElement('button');
restartBtn.innerText = 'Restart';
Object.assign(restartBtn.style, {
  position: 'fixed', left: '14px', top: '14px',
  zIndex: '2000', padding: '8px 12px', fontSize: '14px'
});
restartBtn.addEventListener('click', restartGame);
document.body.appendChild(restartBtn);

export function updateHUD() {
  document.getElementById('hud-score').innerText = `Score: ${state.score}`;
  document.getElementById('hud-enemies').innerText = `Enemies: ${state.enemies.length}`;
  document.getElementById('hud-kills').innerText = `Kills: ${state.kills}`;
}

export function showGameOverUI() {
  let go = document.getElementById('game-over-screen');
  if (!go) {
    go = document.createElement('div');
    go.id = 'game-over-screen';
    Object.assign(go.style, {
      position: 'fixed', left: '0', top: '0', width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '36px', zIndex: '10000'
    });
    go.innerHTML = `<div>GAME OVER<br/><small style="font-size:16px">Press Restart</small></div>`;
    document.body.appendChild(go);
  } else {
    go.style.display = 'flex';
  }
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
