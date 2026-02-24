// src/systems/particles.js
// Particle and debris systems

import * as THREE from 'three';
import { state } from '../core/state';
import { scene, water } from '../core/renderer';
import { splashTexture, smokeTexture } from '../core/textures';
import { SHELL_EJECT_SPEED } from '../core/config';

export const particlePools = {
  splash: [],
  shell: [],
  smoke: [],
  debris: [],
  flash: []
};

const SHARED_SPLASH_MAT = new THREE.SpriteMaterial({
  map: splashTexture,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});

const SHARED_SHELL_GEO = new THREE.BoxGeometry(0.06, 0.03, 0.02);
const SHARED_SHELL_MAT = new THREE.MeshStandardMaterial({ color: 0x996633 });

const SHARED_SMOKE_MAT = new THREE.SpriteMaterial({
  map: smokeTexture,
  transparent: true,
  depthWrite: false
});

const SHARED_DEBRIS_GEO = new THREE.SphereGeometry(0.06, 6, 6);
const SHARED_DEBRIS_MAT = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

// Animated sprite splash (multiple particles)
export function spawnSplashAtShip(ship) {
  const pos = new THREE.Vector3(ship.position.x, water.position.y + 0.02, ship.position.z);
  spawnSplashParticleBurst(pos, 6, 1.6 * (0.9 + Math.random() * 0.4));
}

export function spawnSplashParticleBurst(position, count = 5, scale = 1.8) {
  for (let i = 0; i < count; i++) {
    let sp = particlePools.splash.pop();
    if (!sp) {
      sp = new THREE.Sprite(SHARED_SPLASH_MAT);
      scene.add(sp);
    }
    sp.visible = true;
    sp.material.opacity = 1;

    sp.position.copy(position).add(new THREE.Vector3(
      (Math.random() - 0.5) * 1.4,
      0.02,
      (Math.random() - 0.5) * 1.4
    ));
    const s = scale * (0.6 + Math.random() * 1.2);
    sp.scale.set(s, s, 1);
    // per-particle motion and life
    sp.userData = {
      type: 'splash',
      life: 0,
      maxLife: 0.45 + Math.random() * 0.6,
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 2.4,
        1.2 + Math.random() * 1.6,
        (Math.random() - 0.5) * 2.4
      ),
      rotSpeed: (Math.random() - 0.5) * 6,
      startScale: s,
      endScale: s * 2.2
    };
    state.particles.push(sp);
  }
}

// ---------------- Foam wake trails ----------------
export function spawnWake(position, spread = 4.0) {
  let sp = particlePools.splash.pop();
  if (!sp) {
    sp = new THREE.Sprite(SHARED_SPLASH_MAT);
    scene.add(sp);
  }
  sp.visible = true;
  sp.material.opacity = 0.5;

  sp.position.copy(position).add(new THREE.Vector3(
    (Math.random() - 0.5) * spread,
    0.05,
    (Math.random() - 0.5) * spread
  ));

  const scale = 6.0 + Math.random() * 3.0; // Large foam patches
  sp.scale.set(scale, scale, 1);

  sp.userData = {
    type: 'splash',
    life: 0,
    maxLife: 4.0 + Math.random() * 2.0, // Lasts a while
    vel: new THREE.Vector3(0, 0, 0),    // Static on water
    rotSpeed: (Math.random() - 0.5) * 0.2,
    startScale: scale,
    endScale: scale * 1.8
  };
  state.particles.push(sp);
}

// ---------------- shell debris & smoke ----------------
export function spawnShellEject(position, direction) {
  // small capsule/box that flies off to the side
  let s = particlePools.shell.pop();
  if (!s) {
    s = new THREE.Mesh(SHARED_SHELL_GEO, SHARED_SHELL_MAT);
    scene.add(s);
  }
  s.visible = true;
  s.material.opacity = 1;
  s.position.copy(position);

  // random sidewards and upwards
  const ejectDir = new THREE.Vector3(
    (Math.random() * 0.6 + 0.6) * (Math.random() < 0.5 ? -1 : 1),
    0.6 + Math.random() * 0.6,
    0.2 + Math.random() * 0.6
  );

  // rotate ejectDir by ship quaternion to have it relative to ship orientation
  if (direction) {
    // pick perpendicular axis to direction in XZ plane
    const perp = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
    ejectDir.copy(
      perp.multiplyScalar((Math.random() * 0.5 + 0.8) * (Math.random() < 0.5 ? -1 : 1))
    ).add(new THREE.Vector3(0, 0.6 + Math.random() * 0.6, 0.2));
  }

  s.userData = {
    type: 'shell',
    vel: ejectDir.multiplyScalar(SHELL_EJECT_SPEED * (0.7 + Math.random() * 0.6)),
    life: 0,
    maxLife: 1.2 + Math.random() * 0.8
  };
  state.debris.push(s);
}

export function spawnSmokeTrail(position, direction, life = 1.0, scale = 1.0) {
  let sp = particlePools.smoke.pop();
  if (!sp) {
    sp = new THREE.Sprite(SHARED_SMOKE_MAT);
    scene.add(sp);
  }
  sp.visible = true;
  sp.material.opacity = 1;
  sp.position.copy(position);
  sp.scale.set(scale, scale, 1);
  sp.userData = {
    type: 'smoke',
    vel: direction.clone()
      .multiplyScalar(6 * (0.6 + Math.random() * 0.8))
      .add(new THREE.Vector3(
        (Math.random() - 0.5) * 1,
        Math.random() * 0.3,
        (Math.random() - 0.5) * 1
      )),
    life: 0,
    maxLife: life
  };
  state.particles.push(sp);
}

// Spawn debris on impact
export function spawnDebris(position, count = 6) {
  for (let i = 0; i < count; i++) {
    let s = particlePools.debris.pop();
    if (!s) {
      s = new THREE.Mesh(SHARED_DEBRIS_GEO, SHARED_DEBRIS_MAT);
      scene.add(s);
    }
    s.visible = true;
    s.material.opacity = 1;
    s.position.copy(position);
    s.userData = {
      type: 'debris',
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 5 + 1,
        (Math.random() - 0.5) * 5
      ),
      life: 0,
      maxLife: 0.8 + Math.random() * 0.8
    };
    state.particles.push(s);
  }
}

// =================== Update particle/debris arrays ===================
export function updateParticles(delta) {
  // sprites: both splash and smoke are in state.particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.userData.life += delta;
    const t = p.userData.life / p.userData.maxLife;

    if (p.isSprite) {
      // motion update if vel exists
      if (p.userData.vel) p.position.addScaledVector(p.userData.vel, delta);
      // rotate for variety
      if (p.userData.rotSpeed) p.material.rotation += p.userData.rotSpeed * delta;
      // scale & fade
      if (p.userData.startScale !== undefined && p.userData.endScale !== undefined) {
        const s = THREE.MathUtils.lerp(p.userData.startScale, p.userData.endScale, t);
        p.scale.set(s, s, 1);
      }
      p.material.opacity = Math.max(0, 1 - t);
    } else {
      // legacy meshes in particles array (rare)
      if (p.userData.vel) {
        p.position.addScaledVector(p.userData.vel, delta);
        p.userData.vel.y -= 9.8 * delta * 0.6;
      }
      if (!p.material.transparent) p.material.transparent = true;
      p.material.opacity = Math.max(0, 1 - t);
    }

    if (p.userData.life >= p.userData.maxLife) {
      p.visible = false;
      state.particles.splice(i, 1);
      if (p.userData.type && particlePools[p.userData.type]) {
        particlePools[p.userData.type].push(p);
      } else {
        if (p.parent) p.parent.remove(p);
      }
    }
  }

  // debris: shell casings + small bits
  for (let i = state.debris.length - 1; i >= 0; i--) {
    const d = state.debris[i];
    d.userData.life += delta;
    d.position.addScaledVector(d.userData.vel, delta);
    d.userData.vel.y -= 9.8 * delta * 0.8;
    d.material.opacity = Math.max(0, 1 - (d.userData.life / d.userData.maxLife));

    if (d.userData.life >= d.userData.maxLife) {
      d.visible = false;
      state.debris.splice(i, 1);
      if (d.userData.type && particlePools[d.userData.type]) {
        particlePools[d.userData.type].push(d);
      } else {
        if (d.parent) d.parent.remove(d);
      }
    }
  }
}
