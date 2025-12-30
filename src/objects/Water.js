import * as THREE from 'three';
import waterVertexShader from '../shaders/water.vert?raw';
import waterFragmentShader from '../shaders/water.frag?raw';

// --- Simulation Shaders ---
const simVertex = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const simUpdateFrag = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec2 uDelta;
  varying vec2 vUv;
  void main() {
    vec4 info = texture2D(uTexture, vUv);
    vec2 dx = vec2(uDelta.x, 0.0);
    vec2 dy = vec2(0.0, uDelta.y);
    float average = (
      texture2D(uTexture, vUv - dx).r +
      texture2D(uTexture, vUv + dx).r +
      texture2D(uTexture, vUv - dy).r +
      texture2D(uTexture, vUv + dy).r
    ) * 0.25;
    info.g += (average - info.r) * 2.0;
    info.g *= 0.985; // damping
    info.r += info.g;
    gl_FragColor = info;
  }
`;

const simDropFrag = `
  precision highp float;
  uniform sampler2D uTexture;
  uniform vec2 uCenter;
  uniform float uRadius;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    vec4 info = texture2D(uTexture, vUv);
    float d = distance(vUv, uCenter);
    if (d < uRadius) {
      float drop = uStrength * 0.5 * (1.0 + cos(3.14159 * d / uRadius));
      info.r += drop;
    }
    gl_FragColor = info;
  }
`;

class WaterSimulation {
  constructor(renderer, res = 256) {
    this.renderer = renderer;
    this.res = res;
    this.resInv = 1.0 / res;

    const type = THREE.FloatType;
    this.rtA = new THREE.WebGLRenderTarget(res, res, { type, depthBuffer: false, stencilBuffer: false });
    this.rtB = new THREE.WebGLRenderTarget(res, res, { type, depthBuffer: false, stencilBuffer: false });
    this.currentRT = this.rtA;

    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    this.scene.add(this.mesh);

    this.updateMat = new THREE.ShaderMaterial({
      uniforms: { uTexture: { value: null }, uDelta: { value: new THREE.Vector2(this.resInv, this.resInv) } },
      vertexShader: simVertex,
      fragmentShader: simUpdateFrag
    });

    this.dropMat = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uCenter: { value: new THREE.Vector2() },
        uRadius: { value: 0 },
        uStrength: { value: 0 }
      },
      vertexShader: simVertex,
      fragmentShader: simDropFrag
    });
  }

  step() {
    this.mesh.material = this.updateMat;
    this.render();
  }

  addDrop(x, y, radius, strength) {
    this.mesh.material = this.dropMat;
    this.dropMat.uniforms.uCenter.value.set(x, y);
    this.dropMat.uniforms.uRadius.value = radius;
    this.dropMat.uniforms.uStrength.value = strength;
    this.render();
  }

  render() {
    const oldRT = this.currentRT;
    const newRT = this.currentRT === this.rtA ? this.rtB : this.rtA;

    this.mesh.material.uniforms.uTexture.value = oldRT.texture;
    this.renderer.setRenderTarget(newRT);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(null);

    this.currentRT = newRT;
  }

  get texture() { return this.currentRT.texture; }
}

export class Water extends THREE.Mesh {
  constructor(options = {}) {
    const width = options.width || 2000;
    const height = options.height || 2000;
    const resolution = options.resolution || 120;

    const geometry = new THREE.PlaneGeometry(width, height, resolution, resolution);
    super(geometry);

    this.isWater = true;
    const scope = this;

    // -- Reflection setup --
    const textureWidth = options.reflectionResolution || 512;
    const textureHeight = options.reflectionResolution || 512;
    const clipBias = options.clipBias !== undefined ? options.clipBias : 0.0;
    const mirrorPlane = new THREE.Plane();
    const normal = new THREE.Vector3();
    const mirrorWorldPosition = new THREE.Vector3();
    const cameraWorldPosition = new THREE.Vector3();
    const rotationMatrix = new THREE.Matrix4();
    const lookAtPosition = new THREE.Vector3(0, 0, -1);
    const clipPlane = new THREE.Vector4();
    const view = new THREE.Vector3();
    const target = new THREE.Vector3();
    const q = new THREE.Vector4();
    const textureMatrix = new THREE.Matrix4();
    const mirrorCamera = new THREE.PerspectiveCamera();
    const renderTarget = new THREE.WebGLRenderTarget(textureWidth, textureHeight);

    this._frame = 0;

    // -- Simulation setup --
    if (options.renderer) {
      this.simulation = new WaterSimulation(options.renderer, options.simulationResolution || 128);
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.95 },
        uEnvironmentMap: { value: options.environmentMap },
        mirrorSampler: { value: renderTarget.texture },
        textureMatrix: { value: textureMatrix },
        eye: { value: new THREE.Vector3() },

        // Simulation
        uSimTexture: { value: this.simulation ? this.simulation.texture : null },
        uSimSize: { value: 300.0 },
        uSimCenter: { value: new THREE.Vector2(0, 0) },

        // Wave parameters
        uWavesAmplitude: { value: 0.5 },
        uWavesFrequency: { value: 0.2 },
        uWavesIterations: { value: 5 },
        uWavesSpeed: { value: 0.2 },
        uWavesPersistence: { value: 0.5 },
        uWavesLacunarity: { value: 2.0 },

        // Colors - Dark ocean theme
        uTroughColor: { value: new THREE.Color('#000d1a') },   // Deep dark navy
        uSurfaceColor: { value: new THREE.Color('#003d52') },  // Dark teal
        uPeakColor: { value: new THREE.Color('#1a7a99') },     // Muted cyan

        // Color thresholds
        uPeakThreshold: { value: 3 },
        uPeakTransition: { value: 1.2 },
        uTroughThreshold: { value: -0.2 },
        uTroughTransition: { value: 0.3 },

        // Fresnel
        uFresnelScale: { value: 0.0 },
        uFresnelPower: { value: 3.0 },
        uFresnelBias: { value: 0.1 },

        // Reflections
        sunDir: { value: new THREE.Vector3(30, 80, 50).normalize() },
        distortionScale: { value: 1.0 },
        uEnvMapIntensity: { value: 1.0 },
        uMirrorMix: { value: 0.5 },

        // Specular
        uSpecularIntensity: { value: 1.5 },
        uSpecularPower: { value: 256.0 },

        // SSS
        uSSSIntensity: { value: 0.3 },
        uSSSColor: { value: new THREE.Color('#0051ff') },
        uSSSPower: { value: 3.0 },

        // Caustics
        uCausticsEnabled: { value: 1.0 },
        uCausticsIntensity: { value: 1.4 },
        uCausticsScale: { value: 8.0 },
        uCausticsSpeed: { value: 0.3 },
        uCausticsColor: { value: new THREE.Color('#88ddff') },

        // Foam
        uFoamIntensity: { value: 0.5 },
        uFoamColor: { value: new THREE.Color('#1120f5') }
      },
      transparent: true,
      depthTest: true,
      side: THREE.FrontSide
    });

    this.rotation.x = -Math.PI * 0.5;
    this.position.y = 0;

    this.onBeforeRender = function (renderer, scene, camera) {
      this._frame++;
      if (this._frame % 2 !== 0) return;

      mirrorWorldPosition.setFromMatrixPosition(scope.matrixWorld);
      cameraWorldPosition.setFromMatrixPosition(camera.matrixWorld);
      rotationMatrix.extractRotation(scope.matrixWorld);

      normal.set(0, 0, 1);
      normal.applyMatrix4(rotationMatrix);
      view.subVectors(mirrorWorldPosition, cameraWorldPosition);

      if (view.dot(normal) > 0) return;

      view.reflect(normal).negate();
      view.add(mirrorWorldPosition);
      rotationMatrix.extractRotation(camera.matrixWorld);

      lookAtPosition.set(0, 0, -1);
      lookAtPosition.applyMatrix4(rotationMatrix);
      lookAtPosition.add(cameraWorldPosition);

      target.subVectors(mirrorWorldPosition, lookAtPosition);
      target.reflect(normal).negate();
      target.add(mirrorWorldPosition);

      mirrorCamera.position.copy(view);
      mirrorCamera.up.set(0, 1, 0);
      mirrorCamera.up.applyMatrix4(rotationMatrix);
      mirrorCamera.up.reflect(normal);
      mirrorCamera.lookAt(target);

      mirrorCamera.far = camera.far;
      mirrorCamera.updateMatrixWorld();
      mirrorCamera.projectionMatrix.copy(camera.projectionMatrix);

      textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
      textureMatrix.multiply(mirrorCamera.projectionMatrix);
      textureMatrix.multiply(mirrorCamera.matrixWorldInverse);

      mirrorPlane.setFromNormalAndCoplanarPoint(normal, mirrorWorldPosition);
      mirrorPlane.applyMatrix4(mirrorCamera.matrixWorldInverse);
      clipPlane.set(mirrorPlane.normal.x, mirrorPlane.normal.y, mirrorPlane.normal.z, mirrorPlane.constant);

      const pr = mirrorCamera.projectionMatrix;
      q.x = (Math.sign(clipPlane.x) + pr.elements[8]) / pr.elements[0];
      q.y = (Math.sign(clipPlane.y) + pr.elements[9]) / pr.elements[5];
      q.z = -1.0;
      q.w = (1.0 + pr.elements[10]) / pr.elements[14];

      clipPlane.multiplyScalar(2.0 / clipPlane.dot(q));
      pr.elements[2] = clipPlane.x;
      pr.elements[6] = clipPlane.y;
      pr.elements[10] = clipPlane.z + 1.0 - clipBias;
      pr.elements[14] = clipPlane.w;

      scope.material.uniforms.eye.value.setFromMatrixPosition(camera.matrixWorld);

      const currentRenderTarget = renderer.getRenderTarget();
      const currentXrEnabled = renderer.xr.enabled;
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;

      scope.visible = false;
      renderer.xr.enabled = false;
      renderer.shadowMap.autoUpdate = false;
      renderer.setRenderTarget(renderTarget);
      renderer.state.buffers.depth.setMask(true);
      if (renderer.autoClear === false) renderer.clear();
      renderer.render(scene, mirrorCamera);

      scope.visible = true;
      renderer.xr.enabled = currentXrEnabled;
      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
      renderer.setRenderTarget(currentRenderTarget);

      const viewport = camera.viewport;
      if (viewport !== undefined) renderer.state.viewport(viewport);
    };
  }

  update(time, shipPos) {
    this.material.uniforms.uTime.value = time;
    if (this.simulation) {
      this.simulation.step();

      if (shipPos) {
        const windowSize = this.material.uniforms.uSimSize.value;
        const center = this.material.uniforms.uSimCenter.value;

        center.lerp(new THREE.Vector2(shipPos.x, shipPos.z), 0.05);

        const ux = (shipPos.x - center.x) / windowSize + 0.5;
        const uy = (shipPos.z - center.y) / windowSize + 0.5;

        if (ux >= 0 && ux <= 1 && uy >= 0 && uy <= 1) {
          this.simulation.addDrop(ux, uy, 0.02, 0.05);
        }
      }

      this.material.uniforms.uSimTexture.value = this.simulation.texture;
    }
  }

  addRippleAt(worldX, worldZ, radius = 0.03, strength = 0.05) {
    if (!this.simulation) return;
    const windowSize = this.material.uniforms.uSimSize.value;
    const center = this.material.uniforms.uSimCenter.value;
    const ux = (worldX - center.x) / windowSize + 0.5;
    const uy = (worldZ - center.y) / windowSize + 0.5;
    if (ux >= 0 && ux <= 1 && uy >= 0 && uy <= 1) {
      this.simulation.addDrop(ux, uy, radius, strength);
    }
  }

  // Getter for uniforms to easily access from UI
  getUniforms() {
    return this.material.uniforms;
  }

  // Helper method to set uniform value
  setUniform(name, value) {
    if (this.material.uniforms[name]) {
      if (this.material.uniforms[name].value instanceof THREE.Color) {
        this.material.uniforms[name].value.set(value);
      } else {
        this.material.uniforms[name].value = value;
      }
    }
  }
}
