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
import { state } from './state';
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
renderer.toneMappingExposure = 1.1; // Brighten for vibrant tropical look
document.body.appendChild(renderer.domElement);

// --- Scene ---
export const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2('#aed6f1', 0.0005); // Lighter, prettier fog

// --- Camera ---
export const camera = new THREE.PerspectiveCamera(CAMERA_FOV, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(0, 10, 35);

// --- Lighting ---
const hemi = new THREE.HemisphereLight(0xffffff, 0x005b96, 0.8); // Less intense ground reflection
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 1.6);
dir.position.set(100, 200, 100);
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
export const water = new Water({
  renderer,
  environmentMap,
  resolution: 512,
  width: WATER_SIZE,
  height: WATER_SIZE
});
water.material.transparent = true;
water.material.depthTest = true;
water.material.depthWrite = false;
water.renderOrder = 100;
water.position.y = 0;
scene.add(water);

export const ground = new Ground({
  texture: poolTexture,
  width: WATER_SIZE,
  height: WATER_SIZE,
  causticsIntensity: 0.35,
  causticsScale: 20.0
});
ground.position.y = -15.0; // Deeper for better tropical gradient
scene.add(ground);

// --- Island loader ---
export const gltfLoader = new GLTFLoader();
let islandLoaded = false;

export function loadIsland() {
  if (islandLoaded) return;
  islandLoaded = true;

  gltfLoader.load('src/models/island.glb',
    (gltf) => {
      const island = gltf.scene;
      island.scale.set(0.6, 0.6, 0.6); // A bit larger again
      island.updateMatrixWorld(true);

      const box = new THREE.Box3().setFromObject(island);
      const size = new THREE.Vector3();
      box.getSize(size);
      console.log('Island size:', size);

      // Store in state for collision detection
      state.island = island;
      // Use the average of width/depth for a simple radial collision,
      // but scaled down slightly since the model might have thin edges.
      state.island.userData.radius = Math.max(size.x, size.z) * 0.45;

      const waterY = water.position ? water.position.y : 0;
      const clearance = 0.05;
      const translation = (waterY + clearance) - box.min.y;

      island.position.y += translation;
      island.position.x = 600;
      island.position.z = -600;

      if (Math.abs(translation) > 500) {
        island.position.set(600, 0.5, -600);
      }

      scene.add(island);
      console.log('Island added to scene. Radius:', state.island.userData.radius);
    },
    undefined,
    (err) => {
      console.error('island load error', err);
      islandLoaded = false;
    }
  );
}

loadIsland();

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
