// src/systems/healthbar.js
// 3D health bar utilities

import * as THREE from 'three';
import { camera } from '../core/renderer';
import { CONFIG } from '../core/config';

// 3D health bar helpers
export function create3DHealthBar() {
  const width = 1.8, height = 0.18, gap = 0.03; // Much smaller
  const group = new THREE.Group();

  const bg = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.4, transparent: true })
  );

  const fg = new THREE.Mesh(
    new THREE.PlaneGeometry(width - gap * 2, height - gap * 2),
    new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true })
  );

  const fgContainer = new THREE.Group();
  fgContainer.add(fg);
  group.add(bg);
  group.add(fgContainer);
  group.userData = { fg, fgContainer, width, height };
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
