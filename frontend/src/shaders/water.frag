precision highp float;

uniform float uTime;
uniform float uOpacity;

// Wave colors
uniform vec3 uTroughColor;
uniform vec3 uSurfaceColor;
uniform vec3 uPeakColor;

// Color thresholds
uniform float uPeakThreshold;
uniform float uPeakTransition;
uniform float uTroughThreshold;
uniform float uTroughTransition;

// Fresnel
uniform float uFresnelScale;
uniform float uFresnelPower;
uniform float uFresnelBias;

// Reflections
uniform samplerCube uEnvironmentMap;
uniform sampler2D mirrorSampler;
uniform float distortionScale;
uniform vec3 eye;
uniform float uEnvMapIntensity;
uniform float uMirrorMix;

// Caustics
uniform float uCausticsEnabled;
uniform float uCausticsIntensity;
uniform float uCausticsScale;
uniform float uCausticsSpeed;
uniform vec3 uCausticsColor;

// Foam
uniform float uFoamIntensity;
uniform vec3 uFoamColor;

// Sun
uniform vec3 sunDir;
uniform float uSpecularIntensity;
uniform float uSpecularPower;

// SSS (Subsurface Scattering approximation)
uniform float uSSSIntensity;
uniform vec3 uSSSColor;
uniform float uSSSPower;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec4 vMirrorCoord;
varying float vElevation;
varying float vFoamFactor;

// ============================================
// Noise Functions for Caustics
// ============================================

vec4 permute(vec4 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

vec4 taylorInvSqrt(vec4 r) {
  return 1.79284291400159 - 0.85373472095314 * r;
}

float snoise3D(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ============================================
// Caustics Pattern
// ============================================

float getCaustics(vec2 uv, float time) {
  float caustics = 0.0;
  
  // Layer 1: Primary caustic pattern
  vec2 p1 = uv * uCausticsScale;
  caustics += 0.5 - abs(snoise3D(vec3(p1, time * uCausticsSpeed)));
  
  // Layer 2: Secondary pattern (rotated and offset for complexity)
  vec2 p2 = uv * uCausticsScale * 2.0;
  mat2 rot = mat2(cos(0.7), sin(0.7), -sin(0.7), cos(0.7));
  p2 = rot * p2;
  caustics += (0.5 - abs(snoise3D(vec3(p2, -time * uCausticsSpeed * 0.8)))) * 0.75;
  
  // Normalize and shape with optimized thresholds
  caustics = caustics / 1.75;
  caustics = smoothstep(0.25, 0.8, caustics);
  
  return caustics;
}

// ============================================
// Main Fragment Shader
// ============================================

void main() {
  vec3 viewDirection = normalize(vWorldPosition - eye);
  vec3 normal = normalize(vNormal);
  
  // ========== FRESNEL EFFECT ==========
  float fresnel = uFresnelBias + uFresnelScale * pow(1.0 - clamp(dot(-viewDirection, normal), 0.0, 1.0), uFresnelPower);
  fresnel = clamp(fresnel, 0.0, 1.0);
  
  // ========== REFLECTIONS ==========
  // Real-time mirror reflection with distortion
  vec3 worldToEye = eye - vWorldPosition;
  float dist = length(worldToEye);
  vec2 distortion = normal.xz * distortionScale * (0.001 + 1.0 / dist);
  vec3 mirrorReflection = texture2D(mirrorSampler, vMirrorCoord.xy / vMirrorCoord.w + distortion).rgb;
  
  // Environment map reflection
  vec3 reflectedDir = reflect(viewDirection, normal);
  reflectedDir.x = -reflectedDir.x;
  vec3 envReflection = textureCube(uEnvironmentMap, reflectedDir).rgb * uEnvMapIntensity;
  
  // Mix reflections
  vec3 reflection = mix(envReflection, mirrorReflection, uMirrorMix);
  
  // ========== SPECULAR HIGHLIGHTS ==========
  vec3 sunDirection = normalize(sunDir);
  vec3 halfVec = normalize(sunDirection - viewDirection);
  float spec = pow(max(dot(normal, halfVec), 0.0), uSpecularPower) * uSpecularIntensity;
  vec3 specular = spec * vec3(1.0, 0.98, 0.9); // Warm sunlight color
  
  // ========== SUBSURFACE SCATTERING ==========
  float sss = pow(max(dot(viewDirection, -sunDirection), 0.0), uSSSPower) * uSSSIntensity;
  // Boost SSS in wave peaks
  sss *= (1.0 + smoothstep(0.0, 0.5, vElevation) * 2.0);
  vec3 subsurface = sss * uSSSColor;
  
  // ========== WAVE HEIGHT COLORING ==========
  float elevation = vElevation;
  
  float peakFactor = smoothstep(uPeakThreshold - uPeakTransition, uPeakThreshold + uPeakTransition, elevation);
  float troughFactor = smoothstep(uTroughThreshold - uTroughTransition, uTroughThreshold + uTroughTransition, elevation);
  
  vec3 baseColor = mix(uTroughColor, uSurfaceColor, troughFactor);
  baseColor = mix(baseColor, uPeakColor, peakFactor);
  
  // ========== CAUSTICS ==========
  vec3 causticsContribution = vec3(0.0);
  if(uCausticsEnabled > 0.5) {
    vec2 causticsUV = vWorldPosition.xz * 0.01;
    float caustics = getCaustics(causticsUV, uTime);
    causticsContribution = caustics * uCausticsIntensity * uCausticsColor;
    
    // Caustics are more visible in lighter/shallow areas
    causticsContribution *= (1.0 - fresnel * 0.5);
  }
  
  // ========== FOAM ==========
  vec3 foamContribution = vec3(0.0);
  if(vFoamFactor > 0.0 && uFoamIntensity > 0.0) {
    // Add noise-based foam pattern
    float foamNoise = snoise3D(vec3(vWorldPosition.xz * 0.5, uTime * 0.3));
    foamNoise = smoothstep(0.3, 0.7, foamNoise);
    float foam = vFoamFactor * foamNoise * uFoamIntensity;
    foamContribution = foam * uFoamColor;
  }
  
  // ========== FINAL COMPOSITION ==========
  // Base color mixed with reflection based on fresnel
  vec3 finalColor = mix(baseColor, reflection, fresnel * 0.6);
  
  // Add effects
  finalColor += specular;
  finalColor += subsurface;
  finalColor += causticsContribution;
  finalColor += foamContribution;
  
  // Subtle color tinting of reflection
  finalColor = mix(finalColor, finalColor * uSurfaceColor * 2.0, 0.05);
  
  // Tone mapping for HDR-like appearance
  finalColor = finalColor / (finalColor + vec3(1.0));
  
  // Gamma correction
  finalColor = pow(finalColor, vec3(1.0 / 2.2));
  
  gl_FragColor = vec4(finalColor, uOpacity);
}
