// src/objects/Ground.js
import * as THREE from 'three';
import causticsVertexShader from '../shaders/caustics.vert?raw';
import causticsFragmentShader from '../shaders/caustics.frag?raw';

/**
 * Ground with caustics shader.
 *
 * Options:
 *  - width, height           : plane size in world units
 *  - segments                : subdivisions (for future displacement or higher quality)
 *  - texture                 : THREE.Texture for the pool floor
 *  - textureRepeat           : how many times the texture repeats across the plane (default 4)
 *  - receiveShadow           : whether the ground receives shadows (default true)
 */
export class Ground extends THREE.Mesh {
  constructor(options = {}) {
    super();

    // read options with sensible defaults
    const width = options.width ?? 200;
    const height = options.height ?? 200;
    const segments = options.segments ?? 32;         // 1 is fine for a simple lit plane; use 32+ for more detail
    const tex = options.texture ?? null;
    const textureRepeat = options.textureRepeat ?? 4;
    const receiveShadow = options.receiveShadow ?? true;

    // If a texture is provided, configure wrapping / encoding / filters for high quality
    if (tex) {
      // repeat texture over the plane so it doesn't stretch when the plane is large
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(textureRepeat, textureRepeat);

      // better sampling and color space
      tex.encoding = THREE.sRGBEncoding;
      tex.minFilter = THREE.LinearMipMapLinearFilter;
      tex.magFilter = THREE.LinearFilter;

      // anisotropy improves clarity at grazing angles (gpu dependent)
      if (rendererCapabilitiesHasAnisotropy()) {
        tex.anisotropy = Math.min(16, rendererCapabilitiesMaxAnisotropy());
      }
    }

    // shader uniforms: expose texture and caustics parameters. You already had these; we keep them.
    this.material = new THREE.ShaderMaterial({
      vertexShader: causticsVertexShader,
      fragmentShader: causticsFragmentShader,
      uniforms: {
        uTexture: { value: tex },
        uTime: { value: 0 },

        // caustics visual tuning - tweak these in UI or when creating the Ground instance
        uCausticsColor: { value: new THREE.Color(options.causticsColor ?? '#ffffff') },
        uCausticsIntensity: { value: (options.causticsIntensity ?? 0.25) },
        uCausticsScale: { value: (options.causticsScale ?? 20.0) }, // controls tiling of caustic pattern
        uCausticsSpeed: { value: (options.causticsSpeed ?? 1.0) },   // animation speed
        uCausticsThickness: { value: (options.causticsThickness ?? 0.4) },
        uCausticsOffset: { value: (options.causticsOffset ?? 0.75) },

        // helpful: expose uv scale so shader can multiply vUv by this if desired
        uUvScale: { value: new THREE.Vector2(textureRepeat, textureRepeat) }
      },

      // Material flags:
      // - keep ground opaque and write depth (default) for correct order with water
      transparent: false,
      depthTest: true,
      depthWrite: true,
      side: THREE.DoubleSide // usually top side only is enough; DoubleSide helps if you flip the plane
    });

    // Create geometry
    // Use moderate subdivisions by default (segments x segments). If you don't need vertex displacement,
    // you can keep segments = 1 to save memory/CPU, but many shaders and effects benefit from some subdivisions.
    this.geometry = new THREE.PlaneGeometry(width, height, segments, segments);

    // orient plane so +Y is up
    this.rotation.x = -Math.PI * 0.5;

    // small offset under the water plane (so water plane at y=0 looks like sits on top)
    this.position.y = options.positionY ?? -0.12;

    // receive shadows if requested
    this.receiveShadow = receiveShadow;

    // store useful refs for external code
    this.userData._options = { width, height, segments, textureRepeat };
  }

  /**
   * Safely update time uniform
   * @param {number} time seconds
   */
  update(time) {
    if (!this.material || !this.material.uniforms) return;
    this.material.uniforms.uTime.value = time;
  }
}

/* -------------------------
   Helper functions
   -------------------------
   We use small helpers to detect renderer capabilities. These rely on a global renderer variable,
   but your project may manage the renderer differently. If you don't have access to the renderer
   from this module, you can remove anisotropy logic above or pass anisotropy in options.
*/
function rendererCapabilitiesHasAnisotropy() {
  // try to access existing renderer (window scope used as fallback)
  const r = (typeof window !== 'undefined' && window.__APP_RENDERER) ? window.__APP_RENDERER : null;
  return !!(r && r.capabilities && r.capabilities.getMaxAnisotropy);
}
function rendererCapabilitiesMaxAnisotropy() {
  const r = (typeof window !== 'undefined' && window.__APP_RENDERER) ? window.__APP_RENDERER : null;
  return (r && r.capabilities) ? r.capabilities.getMaxAnisotropy() : 1;
}
