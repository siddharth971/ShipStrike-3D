// src/ui.js
import * as THREE from 'three';
import { Pane } from 'tweakpane';

export function setupUI({ waterResolution = { size: 512 }, water, ground }) {
  const pane = new Pane();

  // Create a plain settings object (only primitives / strings / booleans)
  const settings = {
    // geometry (primitives)
    waterWidth: water?.geometry?.parameters?.width ?? 400,
    waterHeight: water?.geometry?.parameters?.height ?? 400,
    resolution: waterResolution.size || 512,

    // shader uniforms (we copy primitive values)
    wavesAmplitude: (water?.material?.uniforms?.uWavesAmplitude?.value) ?? 0.025,
    wavesFrequency: (water?.material?.uniforms?.uWavesFrequency?.value) ?? 1.07,
    wavesSpeed: (water?.material?.uniforms?.uWavesSpeed?.value) ?? 0.4,

    // colors as hex strings (Tweakpane can bind strings)
    surfaceColor: water?.material?.uniforms?.uSurfaceColor?.value?.getStyle
      ? water.material.uniforms.uSurfaceColor.value.getStyle()
      : '#9bd8c0',
    troughColor: water?.material?.uniforms?.uTroughColor?.value?.getStyle
      ? water.material.uniforms.uTroughColor.value.getStyle()
      : '#186691',
    peakColor: water?.material?.uniforms?.uPeakColor?.value?.getStyle
      ? water.material.uniforms.uPeakColor.value.getStyle()
      : '#bbd8e0',
  };

  // Number inputs (safe — bound to settings object)
  const folder = pane.addFolder({ title: 'Water' });
  folder.addInput(settings, 'wavesAmplitude', { min: 0, max: 0.6, step: 0.001 })
    .on('change', (ev) => {
      if (water?.material?.uniforms?.uWavesAmplitude) water.material.uniforms.uWavesAmplitude.value = ev.value;
    });

  folder.addInput(settings, 'wavesFrequency', { min: 0, max: 10, step: 0.01 })
    .on('change', (ev) => {
      if (water?.material?.uniforms?.uWavesFrequency) water.material.uniforms.uWavesFrequency.value = ev.value;
    });

  folder.addInput(settings, 'wavesSpeed', { min: 0, max: 4, step: 0.01 })
    .on('change', (ev) => {
      if (water?.material?.uniforms?.uWavesSpeed) water.material.uniforms.uWavesSpeed.value = ev.value;
    });

  // Color inputs (strings) -> update THREE.Color
  folder.addInput(settings, 'surfaceColor')
    .on('change', (ev) => {
      if (water?.material?.uniforms?.uSurfaceColor) water.material.uniforms.uSurfaceColor.value.set(ev.value);
    });

  folder.addInput(settings, 'troughColor')
    .on('change', (ev) => {
      if (water?.material?.uniforms?.uTroughColor) water.material.uniforms.uTroughColor.value.set(ev.value);
    });

  folder.addInput(settings, 'peakColor')
    .on('change', (ev) => {
      if (water?.material?.uniforms?.uPeakColor) water.material.uniforms.uPeakColor.value.set(ev.value);
    });

  // Geometry (width/height/resolution)
  const geomFolder = pane.addFolder({ title: 'Geometry' });
  geomFolder.addInput(settings, 'waterWidth', { min: 50, max: 2000, step: 1 })
    .on('change', (ev) => {
      // Recreate the plane geometry with the new width/height
      const w = ev.value;
      const h = settings.waterHeight;
      const seg = Math.max(4, Math.floor(settings.resolution / 2));
      if (water && water.geometry) {
        water.geometry.dispose();
        water.geometry = new THREE.PlaneGeometry(w, h, seg, seg);
        water.geometry.rotateX(-Math.PI / 2); // ensure same orientation if needed
      }
    });

  geomFolder.addInput(settings, 'waterHeight', { min: 50, max: 2000, step: 1 })
    .on('change', (ev) => {
      const w = settings.waterWidth;
      const h = ev.value;
      const seg = Math.max(4, Math.floor(settings.resolution / 2));
      if (water && water.geometry) {
        water.geometry.dispose();
        water.geometry = new THREE.PlaneGeometry(w, h, seg, seg);
        water.geometry.rotateX(-Math.PI / 2);
      }
    });

  geomFolder.addInput(settings, 'resolution', { min: 8, max: 1024, step: 8 })
    .on('change', (ev) => {
      settings.resolution = ev.value;
      // Recreate geometry with higher resolution (be mindful of perf)
      const seg = Math.max(4, Math.floor(ev.value));
      const w = settings.waterWidth;
      const h = settings.waterHeight;
      if (water && water.geometry) {
        water.geometry.dispose();
        water.geometry = new THREE.PlaneGeometry(w, h, seg, seg);
        water.geometry.rotateX(-Math.PI / 2);
      }
    });

  return pane;
}
