// src/systems/healthbar.js
// 3D health bar utilities

import * as THREE from 'three';
import { camera } from '../core/renderer';
import { CONFIG } from '../core/config';

// Shared geometries and background material
const barWidth = 1.8, barHeight = 0.18, gap = 0.03;
const SHARED_HB_BG_GEO = new THREE.PlaneGeometry(barWidth, barHeight);
const SHARED_HB_BG_MAT = new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.4, transparent: true });
const SHARED_HB_FG_GEO = new THREE.PlaneGeometry(barWidth - gap * 2, barHeight - gap * 2);

// 3D health bar helpers
export function create3DHealthBar() {
  const group = new THREE.Group();

  const bg = new THREE.Mesh(SHARED_HB_BG_GEO, SHARED_HB_BG_MAT);

  const fgMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true });
  const fg = new THREE.Mesh(SHARED_HB_FG_GEO, fgMat);

  const fgContainer = new THREE.Group();
  fgContainer.add(fg);
  group.add(bg);
  group.add(fgContainer);
  group.userData = { fg, fgContainer, width: barWidth, height: barHeight };
  return group;
}

export function attachHealthBarToShip(ship) {
  const bar = create3DHealthBar();
  bar.position.set(0, 4.5, 0); // Above the masts
  ship.add(bar);
  ship.userData._hp3D = bar;
  updateShipHealthBar(ship);
}

export function updateShipHealthBar(ship) {
  if (!ship?.userData?._hp3D) return;

  const bar = ship.userData._hp3D;
  const fg = bar.userData.fg;
  const max = ship.userData.isEnemy ? CONFIG.ENEMY_HEALTH : CONFIG.PLAYER_HEALTH;
  const pct = Math.max(0, Math.min(1, (ship.userData.health || 0) / max));

  fg.scale.x = pct;
  const full = bar.userData.width - 0.08;
  fg.position.x = -full / 2 + (full * pct) / 2;

  if (pct < 0.33) fg.material.color.set(0xff4433);
  else if (pct < 0.66) fg.material.color.set(0xffb84d);
  else fg.material.color.set(0x29a329);

  bar.quaternion.copy(camera.quaternion);
}
