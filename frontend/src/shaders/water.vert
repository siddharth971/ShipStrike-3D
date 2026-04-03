precision highp float;

uniform float uTime;
uniform float uWavesAmplitude;
uniform float uWavesSpeed;
uniform float uWavesFrequency;
uniform float uWavesPersistence;
uniform float uWavesLacunarity;
uniform int uWavesIterations;
uniform mat4 textureMatrix;

uniform sampler2D uSimTexture;
uniform float uSimSize;
uniform vec2 uSimCenter;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec4 vMirrorCoord;
varying float vElevation;
varying float vFoamFactor;

// ============================================
// Simplex 2D Noise by Ian McEwan, Stefan Gustavson
// https://github.com/stegu/webgl-noise
// ============================================

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// ============================================
// Fractal Brownian Motion (FBM) with directional variation
// ============================================

float fbm(vec2 p, float time) {
  float value = 0.0;
  float amplitude = 1.0;
  float frequency = uWavesFrequency;
  float maxValue = 0.0;
  
  // Rotation matrix for domain warping
  mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
  
  for(int i = 0; i < 8; i++) {
    if(i >= uWavesIterations) break;
    
    // Add directional wave component
    vec2 dir1 = vec2(1.0, 0.3);
    vec2 dir2 = vec2(-0.5, 0.8);
    
    float wave1 = snoise(p * frequency + dir1 * time * uWavesSpeed);
    float wave2 = snoise(p * frequency * 1.2 + dir2 * time * uWavesSpeed * 0.8);
    
    // Billow noise for sharper wave crests
    wave1 = 1.0 - abs(wave1);
    wave1 = pow(wave1, 1.6);
    
    wave2 = 1.0 - abs(wave2);
    wave2 = pow(wave2, 1.4);
    
    value += amplitude * (wave1 * 0.6 + wave2 * 0.4);
    maxValue += amplitude;
    
    // Apply domain warping rotation
    p = rot * p;
    
    amplitude *= uWavesPersistence;
    frequency *= uWavesLacunarity;
  }
  
  return value / maxValue;
}

// Helper function to calculate elevation at any point
float getElevation(float x, float z) {
  vec2 pos = vec2(x, z);
  float elevation = 0.0;
  
  // 1. Simulation Ripples (Interactive)
  vec2 simUv = (pos - uSimCenter) / uSimSize + 0.5;
  if(simUv.x >= 0.0 && simUv.x <= 1.0 && simUv.y >= 0.0 && simUv.y <= 1.0) {
    elevation += texture2D(uSimTexture, simUv).r * 5.0;
  }
  
  // 2. Procedural Waves using Fractal Brownian Motion
  elevation += fbm(pos * 0.01, uTime) * uWavesAmplitude;
  
  return elevation;
}

void main() {
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  
  float elevation = getElevation(modelPosition.x, modelPosition.z);
  modelPosition.y += elevation;
  
  // Calculate normal using central differences (more accurate)
  float eps = 0.5;
  float elevL = getElevation(modelPosition.x - eps, modelPosition.z);
  float elevR = getElevation(modelPosition.x + eps, modelPosition.z);
  float elevD = getElevation(modelPosition.x, modelPosition.z - eps);
  float elevU = getElevation(modelPosition.x, modelPosition.z + eps);
  
  vec3 tangent = normalize(vec3(2.0 * eps, elevR - elevL, 0.0));
  vec3 bitangent = normalize(vec3(0.0, elevU - elevD, 2.0 * eps));
  vec3 objectNormal = normalize(cross(tangent, bitangent));
  
  // Calculate foam factor based on wave curvature
  float curvature = abs(elevL + elevR - 2.0 * elevation) + abs(elevD + elevU - 2.0 * elevation);
  vFoamFactor = smoothstep(0.1, 0.5, curvature * 10.0);
  
  vNormal = normalize(normalMatrix * objectNormal);
  vWorldPosition = modelPosition.xyz;
  vMirrorCoord = textureMatrix * modelPosition;
  vElevation = elevation;
  
  gl_Position = projectionMatrix * viewMatrix * modelPosition;
}