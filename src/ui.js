// src/ui.js
import * as THREE from 'three';
import { Pane } from 'tweakpane';
import { freeCam, toggleFreeCamera, cameraState, CameraMode, cycleCameraMode } from './systems/camera';

const STORAGE_KEY = 'water_settings_v2';

export function setupUI({ water, ground }) {
  const pane = new Pane({
    title: '🌊 Water Shader Demo',
    expanded: true,
  });

  const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

  // Default settings with fallbacks
  const settings = {
    // Opacity
    opacity: savedSettings.opacity ?? water?.material?.uniforms?.uOpacity?.value ?? 0.85,

    // Colors - Dark ocean theme
    surfaceColor: savedSettings.surfaceColor || water?.material?.uniforms?.uSurfaceColor?.value?.getStyle?.() || '#003d52',
    troughColor: savedSettings.troughColor || water?.material?.uniforms?.uTroughColor?.value?.getStyle?.() || '#000d1a',
    peakColor: savedSettings.peakColor || water?.material?.uniforms?.uPeakColor?.value?.getStyle?.() || '#1a7a99',

    // Wave Physics
    wavesAmplitude: savedSettings.wavesAmplitude ?? water?.material?.uniforms?.uWavesAmplitude?.value ?? 0.5,
    wavesFrequency: savedSettings.wavesFrequency ?? water?.material?.uniforms?.uWavesFrequency?.value ?? 0.8,
    wavesSpeed: savedSettings.wavesSpeed ?? water?.material?.uniforms?.uWavesSpeed?.value ?? 0.4,
    wavesIterations: savedSettings.wavesIterations ?? water?.material?.uniforms?.uWavesIterations?.value ?? 5,
    wavesPersistence: savedSettings.wavesPersistence ?? water?.material?.uniforms?.uWavesPersistence?.value ?? 0.5,
    wavesLacunarity: savedSettings.wavesLacunarity ?? water?.material?.uniforms?.uWavesLacunarity?.value ?? 2.0,

    // Fresnel
    fresnelScale: savedSettings.fresnelScale ?? water?.material?.uniforms?.uFresnelScale?.value ?? 1.0,
    fresnelPower: savedSettings.fresnelPower ?? water?.material?.uniforms?.uFresnelPower?.value ?? 3.0,
    fresnelBias: savedSettings.fresnelBias ?? water?.material?.uniforms?.uFresnelBias?.value ?? 0.1,

    // Reflections
    distortionScale: savedSettings.distortionScale ?? water?.material?.uniforms?.distortionScale?.value ?? 4.0,
    envMapIntensity: savedSettings.envMapIntensity ?? water?.material?.uniforms?.uEnvMapIntensity?.value ?? 1.0,
    mirrorMix: savedSettings.mirrorMix ?? water?.material?.uniforms?.uMirrorMix?.value ?? 0.5,

    // Specular
    specularIntensity: savedSettings.specularIntensity ?? water?.material?.uniforms?.uSpecularIntensity?.value ?? 1.5,
    specularPower: savedSettings.specularPower ?? water?.material?.uniforms?.uSpecularPower?.value ?? 256.0,

    // SSS
    sssIntensity: savedSettings.sssIntensity ?? water?.material?.uniforms?.uSSSIntensity?.value ?? 0.3,
    sssColor: savedSettings.sssColor || water?.material?.uniforms?.uSSSColor?.value?.getStyle?.() || '#00ccaa',
    sssPower: savedSettings.sssPower ?? water?.material?.uniforms?.uSSSPower?.value ?? 3.0,

    // Caustics
    causticsEnabled: savedSettings.causticsEnabled ?? (water?.material?.uniforms?.uCausticsEnabled?.value > 0.5),
    causticsIntensity: savedSettings.causticsIntensity ?? water?.material?.uniforms?.uCausticsIntensity?.value ?? 0.4,
    causticsScale: savedSettings.causticsScale ?? water?.material?.uniforms?.uCausticsScale?.value ?? 8.0,
    causticsSpeed: savedSettings.causticsSpeed ?? water?.material?.uniforms?.uCausticsSpeed?.value ?? 0.3,
    causticsColor: savedSettings.causticsColor || water?.material?.uniforms?.uCausticsColor?.value?.getStyle?.() || '#88ddff',

    // Foam
    foamIntensity: savedSettings.foamIntensity ?? water?.material?.uniforms?.uFoamIntensity?.value ?? 0.5,
    foamColor: savedSettings.foamColor || water?.material?.uniforms?.uFoamColor?.value?.getStyle?.() || '#ffffff',
  };

  // Apply saved settings immediately
  applyAllSettings(settings, water);

  // ========== WAVE PHYSICS ==========
  const wavesFolder = pane.addFolder({ title: '🌊 Wave Animation (Fractal Noise)', expanded: true });

  wavesFolder.addBinding(settings, 'wavesAmplitude', { label: 'Amplitude', min: 0, max: 2.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uWavesAmplitude', ev.value);
  });

  wavesFolder.addBinding(settings, 'wavesFrequency', { label: 'Frequency', min: 0.1, max: 3.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uWavesFrequency', ev.value);
  });

  wavesFolder.addBinding(settings, 'wavesSpeed', { label: 'Speed', min: 0, max: 2.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uWavesSpeed', ev.value);
  });

  wavesFolder.addBinding(settings, 'wavesIterations', { label: 'Octaves', min: 1, max: 8, step: 1 }).on('change', ev => {
    water?.setUniform('uWavesIterations', ev.value);
  });

  wavesFolder.addBinding(settings, 'wavesPersistence', { label: 'Persistence', min: 0.1, max: 1.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uWavesPersistence', ev.value);
  });

  wavesFolder.addBinding(settings, 'wavesLacunarity', { label: 'Lacunarity', min: 1.0, max: 4.0, step: 0.1 }).on('change', ev => {
    water?.setUniform('uWavesLacunarity', ev.value);
  });

  // ========== COLORS ==========
  const colorFolder = pane.addFolder({ title: '🎨 Dynamic Coloring', expanded: false });

  colorFolder.addBinding(settings, 'surfaceColor', { label: 'Surface' }).on('change', ev => {
    water?.setUniform('uSurfaceColor', ev.value);
  });

  colorFolder.addBinding(settings, 'troughColor', { label: 'Trough (Deep)' }).on('change', ev => {
    water?.setUniform('uTroughColor', ev.value);
  });

  colorFolder.addBinding(settings, 'peakColor', { label: 'Peak (Crest)' }).on('change', ev => {
    water?.setUniform('uPeakColor', ev.value);
  });

  colorFolder.addBinding(settings, 'opacity', { label: 'Opacity', min: 0, max: 1, step: 0.01 }).on('change', ev => {
    water?.setUniform('uOpacity', ev.value);
  });

  // ========== FRESNEL ==========
  const fresnelFolder = pane.addFolder({ title: '✨ Fresnel Reflection', expanded: false });

  fresnelFolder.addBinding(settings, 'fresnelScale', { label: 'Scale', min: 0, max: 3.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uFresnelScale', ev.value);
  });

  fresnelFolder.addBinding(settings, 'fresnelPower', { label: 'Power', min: 0.5, max: 10.0, step: 0.1 }).on('change', ev => {
    water?.setUniform('uFresnelPower', ev.value);
  });

  fresnelFolder.addBinding(settings, 'fresnelBias', { label: 'Bias', min: 0, max: 0.5, step: 0.01 }).on('change', ev => {
    water?.setUniform('uFresnelBias', ev.value);
  });

  // ========== REFLECTIONS ==========
  const reflectFolder = pane.addFolder({ title: '🪞 Environment Reflections', expanded: false });

  reflectFolder.addBinding(settings, 'distortionScale', { label: 'Distortion', min: 0, max: 20.0, step: 0.1 }).on('change', ev => {
    water?.setUniform('distortionScale', ev.value);
  });

  reflectFolder.addBinding(settings, 'envMapIntensity', { label: 'Env Intensity', min: 0, max: 2.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uEnvMapIntensity', ev.value);
  });

  reflectFolder.addBinding(settings, 'mirrorMix', { label: 'Mirror Mix', min: 0, max: 1.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uMirrorMix', ev.value);
  });

  reflectFolder.addBinding(settings, 'specularIntensity', { label: 'Specular', min: 0, max: 5.0, step: 0.1 }).on('change', ev => {
    water?.setUniform('uSpecularIntensity', ev.value);
  });

  reflectFolder.addBinding(settings, 'specularPower', { label: 'Sharpness', min: 16, max: 512, step: 8 }).on('change', ev => {
    water?.setUniform('uSpecularPower', ev.value);
  });

  // ========== CAUSTICS ==========
  const causticsFolder = pane.addFolder({ title: '💎 Caustics Effect', expanded: true });

  causticsFolder.addBinding(settings, 'causticsEnabled', { label: 'Enabled' }).on('change', ev => {
    water?.setUniform('uCausticsEnabled', ev.value ? 1.0 : 0.0);
  });

  causticsFolder.addBinding(settings, 'causticsIntensity', { label: 'Intensity', min: 0, max: 2.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uCausticsIntensity', ev.value);
  });

  causticsFolder.addBinding(settings, 'causticsScale', { label: 'Scale', min: 1, max: 20, step: 0.5 }).on('change', ev => {
    water?.setUniform('uCausticsScale', ev.value);
  });

  causticsFolder.addBinding(settings, 'causticsSpeed', { label: 'Speed', min: 0, max: 1.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uCausticsSpeed', ev.value);
  });

  causticsFolder.addBinding(settings, 'causticsColor', { label: 'Color' }).on('change', ev => {
    water?.setUniform('uCausticsColor', ev.value);
  });

  // ========== SSS (Subsurface Scattering) ==========
  const sssFolder = pane.addFolder({ title: '🌅 Subsurface Scattering', expanded: false });

  sssFolder.addBinding(settings, 'sssIntensity', { label: 'Intensity', min: 0, max: 1.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uSSSIntensity', ev.value);
  });

  sssFolder.addBinding(settings, 'sssColor', { label: 'Color' }).on('change', ev => {
    water?.setUniform('uSSSColor', ev.value);
  });

  sssFolder.addBinding(settings, 'sssPower', { label: 'Power', min: 1, max: 10, step: 0.5 }).on('change', ev => {
    water?.setUniform('uSSSPower', ev.value);
  });

  // ========== FOAM ==========
  const foamFolder = pane.addFolder({ title: '🫧 Foam', expanded: false });

  foamFolder.addBinding(settings, 'foamIntensity', { label: 'Intensity', min: 0, max: 2.0, step: 0.01 }).on('change', ev => {
    water?.setUniform('uFoamIntensity', ev.value);
  });

  foamFolder.addBinding(settings, 'foamColor', { label: 'Color' }).on('change', ev => {
    water?.setUniform('uFoamColor', ev.value);
  });

  // ========== CAMERA CONTROLS ==========
  const cameraFolder = pane.addFolder({ title: '📷 Camera Controls', expanded: true });

  cameraFolder.addButton({ title: '🔄 Cycle Camera (C key)' }).on('click', () => {
    cycleCameraMode();
  });

  cameraFolder.addBinding({ speed: cameraState.free.moveSpeed }, 'speed', {
    label: 'Free Cam Speed', min: 10, max: 300, step: 10
  }).on('change', ev => {
    cameraState.free.moveSpeed = ev.value;
  });

  cameraFolder.addBlade({
    view: 'text',
    label: 'Modes',
    value: 'Captain → Third Person → Free',
    parse: () => '',
    disabled: true
  });

  // ========== ACTIONS ==========
  pane.addBlade({ view: 'separator' });

  pane.addButton({ title: '💾 Save Settings' }).on('click', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    showNotification('✅ Settings saved!');
  });

  pane.addButton({ title: '🔄 Reset to Defaults' }).on('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  pane.addButton({ title: '📋 Export JSON' }).on('click', () => {
    const json = JSON.stringify(settings, null, 2);
    navigator.clipboard.writeText(json);
    showNotification('📋 Copied to clipboard!');
  });

  // UI Styling
  const el = pane.element;
  el.style.position = 'fixed';
  el.style.top = '20px';
  el.style.right = '20px';
  el.style.zIndex = '100000';
  el.style.width = '320px';
  el.style.maxHeight = '90vh';
  el.style.overflowY = 'auto';

  // Toggle visibility with 'H' key
  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h') pane.hidden = !pane.hidden;
  });

  return pane;
}

function applyAllSettings(settings, water) {
  if (!water?.material?.uniforms) return;

  // Apply all settings
  water.setUniform('uOpacity', settings.opacity);
  water.setUniform('uSurfaceColor', settings.surfaceColor);
  water.setUniform('uTroughColor', settings.troughColor);
  water.setUniform('uPeakColor', settings.peakColor);
  water.setUniform('uWavesAmplitude', settings.wavesAmplitude);
  water.setUniform('uWavesFrequency', settings.wavesFrequency);
  water.setUniform('uWavesSpeed', settings.wavesSpeed);
  water.setUniform('uWavesIterations', settings.wavesIterations);
  water.setUniform('uWavesPersistence', settings.wavesPersistence);
  water.setUniform('uWavesLacunarity', settings.wavesLacunarity);
  water.setUniform('uFresnelScale', settings.fresnelScale);
  water.setUniform('uFresnelPower', settings.fresnelPower);
  water.setUniform('uFresnelBias', settings.fresnelBias);
  water.setUniform('distortionScale', settings.distortionScale);
  water.setUniform('uEnvMapIntensity', settings.envMapIntensity);
  water.setUniform('uMirrorMix', settings.mirrorMix);
  water.setUniform('uSpecularIntensity', settings.specularIntensity);
  water.setUniform('uSpecularPower', settings.specularPower);
  water.setUniform('uSSSIntensity', settings.sssIntensity);
  water.setUniform('uSSSColor', settings.sssColor);
  water.setUniform('uSSSPower', settings.sssPower);
  water.setUniform('uCausticsEnabled', settings.causticsEnabled ? 1.0 : 0.0);
  water.setUniform('uCausticsIntensity', settings.causticsIntensity);
  water.setUniform('uCausticsScale', settings.causticsScale);
  water.setUniform('uCausticsSpeed', settings.causticsSpeed);
  water.setUniform('uCausticsColor', settings.causticsColor);
  water.setUniform('uFoamIntensity', settings.foamIntensity);
  water.setUniform('uFoamColor', settings.foamColor);
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 16px 32px;
    border-radius: 8px;
    font-family: system-ui, sans-serif;
    font-size: 16px;
    z-index: 200000;
    animation: fadeInOut 1.5s ease;
  `;

  // Add animation style if not exists
  if (!document.getElementById('notification-style')) {
    const style = document.createElement('style');
    style.id = 'notification-style';
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
        20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 1500);
}
