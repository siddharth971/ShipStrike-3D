// src/core/renderer.js
// Scene, camera, renderer, and post-processing setup

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

import { Water } from '../objects/Water';
import { Ground } from '../objects/Ground';
import { WATER_SIZE, CAMERA_FOV, TONE_EXPOSURE, BLOOM_STRENGTH } from './config';

// --- Minimal CSS so canvas fills screen ---
const style = document.createElement('style');
style.innerText = `html,body{margin:0;height:100%;overflow:hidden;background:#000}canvas{display:block}`;
document.head.appendChild(style);

// --- Clock ---
export const clock = new THREE.Clock();

// --- Renderer ---
export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = TONE_EXPOSURE;
document.body.appendChild(renderer.domElement);

// --- Scene ---
export const scene = new THREE.Scene();

// --- Camera ---
export const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(0, 7, 30);

// --- Lighting ---
const hemi = new THREE.HemisphereLight(0xbfeaf5, 0x404040, 1.0);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(30, 80, 50);
scene.add(dir);

// --- HDR environment ---
export const environmentMap = new RGBELoader();
environmentMap.load('src/objects/sky.hdr', (tex) => {
  tex.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = tex;
  scene.environment = tex;
});

// --- Water & Ground ---
const poolTexture = new THREE.TextureLoader().load('/threejs-water-shader/ocean_floor.png');
export const water = new Water({ environmentMap, resolution: 512, width: WATER_SIZE, height: WATER_SIZE });
water.material.transparent = true;
water.material.depthTest = true;
water.material.depthWrite = false;
water.renderOrder = 100;
water.position.y = 0;
scene.add(water);

export const ground = new Ground({ texture: poolTexture, width: WATER_SIZE, height: WATER_SIZE });
ground.position.y = -0.12;
scene.add(ground);

// --- Island loader ---
export const gltfLoader = new GLTFLoader();
gltfLoader.load('src/models/island.glb',
  (gltf) => {
    const island = gltf.scene;
    island.scale.set(1, 1, 1);
    island.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(island);
    console.log('island bbox', box.min, box.max);

    const waterY = water.position ? water.position.y : 0;
    const clearance = 0.02;
    const translation = (waterY + clearance) - box.min.y;

    island.position.y += translation;
    island.position.x = 100;
    island.position.y = 85;
    console.log(island.position.y);
    island.position.z = -10;

    if (Math.abs(translation) > 500) {
      console.warn('Large island translation:', translation, 'bbox:', box);
      island.position.set(50, 0.5, -100);
    }

    scene.add(island);
  },
  (xhr) => { /* progress */ },
  (err) => { console.error('island load error', err); }
);

// --- Postprocessing (bloom) ---
export const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  BLOOM_STRENGTH, 0.2, 0.85
);
bloomPass.threshold = 0.9;
bloomPass.radius = 0.18;
composer.addPass(bloomPass);

// --- OBJ Loader ---
export const loader = new OBJLoader();

// --- Resize handler ---
export function setupResizeHandler() {
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });
}
