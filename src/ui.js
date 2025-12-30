// src/ui.js
import * as THREE from 'three';
import { Pane } from 'tweakpane';

const STORAGE_KEY = 'water_settings_v1';

export function setupUI({ water, ground }) {
  // Use a fixed container but allow it to be scrollable if needed
  const pane = new Pane({
    title: '🌊 Ocean Settings',
    expanded: true,
  });

  const savedSettings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

  const settings = {
    surfaceColor: savedSettings.surfaceColor || water?.material?.uniforms?.uSurfaceColor?.value?.getStyle?.() || '#006994',
    troughColor: savedSettings.troughColor || water?.material?.uniforms?.uTroughColor?.value?.getStyle?.() || '#001a33',
    peakColor: savedSettings.peakColor || water?.material?.uniforms?.uPeakColor?.value?.getStyle?.() || '#4db8e8',
    opacity: savedSettings.opacity ?? water?.material?.uniforms?.uOpacity?.value ?? 0.7,
    wavesAmplitude: savedSettings.wavesAmplitude ?? water?.material?.uniforms?.uWavesAmplitude?.value ?? 0,
    wavesFrequency: savedSettings.wavesFrequency ?? water?.material?.uniforms?.uWavesFrequency?.value ?? 0.95,
    wavesSpeed: savedSettings.wavesSpeed ?? water?.material?.uniforms?.uWavesSpeed?.value ?? 0.3,
    distortionScale: savedSettings.distortionScale ?? water?.material?.uniforms?.distortionScale?.value ?? 4.5,
    fresnelPower: savedSettings.fresnelPower ?? water?.material?.uniforms?.uFresnelPower?.value ?? 4.0,
  };

  // Apply saved settings immediately
  Object.keys(settings).forEach(key => {
    updateWaterUniforms(key, settings[key], water);
  });

  // Tweakpane bindings
  pane.addBinding(settings, 'opacity', { min: 0, max: 1, step: 0.01 }).on('change', ev => {
    if (water?.material?.uniforms?.uOpacity) water.material.uniforms.uOpacity.value = ev.value;
  });

  const colorFolder = pane.addFolder({ title: 'Colors', expanded: false });
  colorFolder.addBinding(settings, 'surfaceColor', { label: 'Surface' }).on('change', ev => {
    if (water?.material?.uniforms?.uSurfaceColor) water.material.uniforms.uSurfaceColor.value.set(ev.value);
  });
  colorFolder.addBinding(settings, 'troughColor', { label: 'Trough' }).on('change', ev => {
    if (water?.material?.uniforms?.uTroughColor) water.material.uniforms.uTroughColor.value.set(ev.value);
  });
  colorFolder.addBinding(settings, 'peakColor', { label: 'Peak' }).on('change', ev => {
    if (water?.material?.uniforms?.uPeakColor) water.material.uniforms.uPeakColor.value.set(ev.value);
  });

  const physFolder = pane.addFolder({ title: 'Physics', expanded: true });
  physFolder.addBinding(settings, 'wavesAmplitude', { label: 'Wave H', min: 0, max: 1.0, step: 0.01 }).on('change', ev => {
    if (water?.material?.uniforms?.uWavesAmplitude) water.material.uniforms.uWavesAmplitude.value = ev.value;
  });
  physFolder.addBinding(settings, 'wavesFrequency', { label: 'Wave F', min: 0, max: 5.0, step: 0.01 }).on('change', ev => {
    if (water?.material?.uniforms?.uWavesFrequency) water.material.uniforms.uWavesFrequency.value = ev.value;
  });
  physFolder.addBinding(settings, 'wavesSpeed', { label: 'Speed', min: 0, max: 2.0, step: 0.01 }).on('change', ev => {
    if (water?.material?.uniforms?.uWavesSpeed) water.material.uniforms.uWavesSpeed.value = ev.value;
  });
  physFolder.addBinding(settings, 'distortionScale', { label: 'Reflect', min: 0, max: 20.0, step: 0.1 }).on('change', ev => {
    if (water?.material?.uniforms?.distortionScale) water.material.uniforms.distortionScale.value = ev.value;
  });
  physFolder.addBinding(settings, 'fresnelPower', { label: 'Fresnel', min: 0.1, max: 10.0, step: 0.1 }).on('change', ev => {
    if (water?.material?.uniforms?.uFresnelPower) water.material.uniforms.uFresnelPower.value = ev.value;
  });

  pane.addSeparator();

  // Explicitly add Buttons at the bottom
  pane.addButton({ title: 'Save Permanently' }).on('click', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    alert('✅ Settings saved permanently!');
  });

  pane.addButton({ title: 'Reset to Defaults' }).on('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // UI Styling
  const el = pane.element;
  el.style.position = 'fixed';
  el.style.top = '20px';
  el.style.right = '20px';
  el.style.zIndex = '100000';
  el.style.width = '280px';
  el.style.maxHeight = '90vh';
  el.style.overflowY = 'auto';

  window.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() === 'h') pane.hidden = !pane.hidden;
  });

  return pane;
}

function updateWaterUniforms(key, value, water) {
  if (!water?.material?.uniforms) return;
  const u = water.material.uniforms;
  if (key === 'surfaceColor') u.uSurfaceColor?.value.set(value);
  else if (key === 'troughColor') u.uTroughColor?.value.set(value);
  else if (key === 'peakColor') u.uPeakColor?.value.set(value);
  else if (key === 'opacity') u.uOpacity && (u.uOpacity.value = value);
  else if (key === 'wavesAmplitude') u.uWavesAmplitude && (u.uWavesAmplitude.value = value);
  else if (key === 'wavesFrequency') u.uWavesFrequency && (u.uWavesFrequency.value = value);
  else if (key === 'wavesSpeed') u.uWavesSpeed && (u.uWavesSpeed.value = value);
  else if (key === 'distortionScale') u.distortionScale && (u.distortionScale.value = value);
  else if (key === 'fresnelPower') u.uFresnelPower && (u.uFresnelPower.value = value);
}
