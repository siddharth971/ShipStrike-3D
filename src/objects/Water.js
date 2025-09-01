import * as THREE from 'three';
import waterVertexShader from '../shaders/water.vert?raw';
import waterFragmentShader from '../shaders/water.frag?raw';

export class Water extends THREE.Mesh {
  constructor(options = {}) {
    super();

    const width = options.width || 200;   // default width
    const height = options.height || 200; // default height
    const resolution = options.resolution || 512;

    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.8 },
        uEnvironmentMap: { value: options.environmentMap },
        uWavesAmplitude: { value: 0.025 },
        uWavesFrequency: { value: 1.07 },
        uWavesPersistence: { value: 0.3 },
        uWavesLacunarity: { value: 2.18 },
        uWavesIterations: { value: 8 },
        uWavesSpeed: { value: 1.4 },
        uTroughColor: { value: new THREE.Color('#09C3DB') },
        uSurfaceColor: { value: new THREE.Color('#01497C') },
        uPeakColor: { value: new THREE.Color('#B3E5FC') },


        uPeakThreshold: { value: 1.08 },
        uPeakTransition: { value: 0.05 },
        uTroughThreshold: { value: -0.01 },
        uTroughTransition: { value: 0.15 },
        uFresnelScale: { value: 0.0 },
        uFresnelPower: { value: 0.5 }
      },
      transparent: true,
      depthTest: true,
      side: THREE.DoubleSide
    });



    this.geometry = new THREE.PlaneGeometry(width, height, resolution, resolution);
    this.rotation.x = Math.PI * 0.5;
    this.position.y = 0;
  }

  update(time) {
    this.material.uniforms.uTime.value = time;
  }
}



