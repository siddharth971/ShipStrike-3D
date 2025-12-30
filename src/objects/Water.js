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

    const type = THREE.FloatType; // Assume float support
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
    const resolution = 120; // Lower vertex count significantly for performance

    const geometry = new THREE.PlaneGeometry(width, height, resolution, resolution);
    super(geometry);

    this.isWater = true;
    const scope = this;

    // -- Reflection setup --
    const textureWidth = 512; // Optimized reflection resolution
    const textureHeight = 512;
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
      this.simulation = new WaterSimulation(options.renderer, 128); // Lower GPGPU load
    }

    this.material = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.7 },
        uEnvironmentMap: { value: options.environmentMap },
        mirrorSampler: { value: renderTarget.texture },
        textureMatrix: { value: textureMatrix },
        eye: { value: new THREE.Vector3() },

        // Simulation integration
        uSimTexture: { value: this.simulation ? this.simulation.texture : null },
        uSimSize: { value: 300.0 }, // Size in world units of simulation window
        uSimCenter: { value: new THREE.Vector2(0, 0) },

        uWavesAmplitude: { value: 0 },
        uWavesFrequency: { value: 0.95 },
        uWavesIterations: { value: 4 }, // Fewer iterations for much better FPS
        uWavesSpeed: { value: 0.3 },
        uTroughColor: { value: new THREE.Color('#001a33') },
        uSurfaceColor: { value: new THREE.Color('#006994') },
        uPeakColor: { value: new THREE.Color('#4db8e8') },

        uPeakThreshold: { value: 0.92 },
        uPeakTransition: { value: 0.15 },
        uTroughThreshold: { value: -0.4 },
        uTroughTransition: { value: 0.6 },
        uFresnelScale: { value: 1.2 },
        uFresnelPower: { value: 4.0 },
        sunDir: { value: new THREE.Vector3(30, 80, 50).normalize() },
        distortionScale: { value: 4.5 }
      },
      transparent: true,
      depthTest: true,
      side: THREE.FrontSide
    });

    this.rotation.x = -Math.PI * 0.5;
    this.position.y = 0;

    this.onBeforeRender = function (renderer, scene, camera) {
      this._frame++;
      if (this._frame % 2 !== 0) return; // Only update reflection every 2nd frame

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

      // Interaction: always add a drop at ship if provided
      if (shipPos) {
        // Map world pos to 0..1 simulation UV
        // We use a window of uSimSize centered at uSimCenter
        const windowSize = this.material.uniforms.uSimSize.value;
        const center = this.material.uniforms.uSimCenter.value;

        // Update simulation window to follow ship a bit lazily or just keep it centered
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
}
