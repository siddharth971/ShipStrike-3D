// src/core/textures.js
// Texture and sprite helper functions

import * as THREE from 'three';

// =================== PARTICLE & SPRITE HELPERS ===================
export function makeSplashTexture(size = 256, inner = '#e41818ff', outer = '#ff66ebff') {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.5, outer);
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearMipMapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.encoding = THREE.sRGBEncoding;
  return t;
}

// Smoke texture for trails/muzzle
export function makeSmokeTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grd.addColorStop(0, 'rgba(228, 0, 0, 0.9)');
  grd.addColorStop(0.5, 'rgba(255, 12, 12, 0.6)');
  grd.addColorStop(1, 'rgba(235, 40, 40, 0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

// Pre-created textures
export const splashTexture = makeSplashTexture(256);
export const smokeTexture = makeSmokeTexture();
