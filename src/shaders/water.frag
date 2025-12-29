precision highp float;

uniform float uOpacity;

uniform vec3 uTroughColor;
uniform vec3 uSurfaceColor;
uniform vec3 uPeakColor;

uniform float uPeakThreshold;
uniform float uPeakTransition;
uniform float uTroughThreshold;
uniform float uTroughTransition;

uniform float uFresnelScale;
uniform float uFresnelPower;

uniform samplerCube uEnvironmentMap;
uniform sampler2D mirrorSampler;
uniform float distortionScale;
uniform vec3 eye;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec4 vMirrorCoord;

void main() {
  vec3 viewDirection = normalize(vWorldPosition - eye);
  
  // Real-time reflection with distortion
  vec3 worldToEye = eye - vWorldPosition;
  float dist = length(worldToEye);
  vec2 distortion = vNormal.xz * distortionScale * (0.001 + 1.0 / dist);
  vec3 reflectionSample = texture2D(mirrorSampler, vMirrorCoord.xy / vMirrorCoord.w + distortion).rgb;

  // Virtual sun for specular highlights
  vec3 sunDir = normalize(vec3(30.0, 80.0, 50.0));
  
  // Static Sky reflection (env map) for horizon
  vec3 reflectedDirection = reflect(viewDirection, vNormal);
  reflectedDirection.x = -reflectedDirection.x;
  vec4 skyReflection = textureCube(uEnvironmentMap, reflectedDirection);

  // Fresnel effect
  float fresnel = uFresnelScale * pow(1.0 - clamp(dot(-viewDirection, vNormal), 0.0, 1.0), uFresnelPower);

  // Specular (sparkle) - Sharper for "original" sea look
  vec3 halfVec = normalize(sunDir - viewDirection);
  float spec = pow(max(dot(vNormal, halfVec), 0.0), 256.0) * 1.5;

  // Color logic
  float elevation = vWorldPosition.y;

  // Smoother transition factors
  float peakFactor = smoothstep(uPeakThreshold - uPeakTransition, uPeakThreshold + uPeakTransition, elevation);
  float troughFactor = smoothstep(uTroughThreshold - uTroughTransition, uTroughThreshold + uTroughTransition, elevation);

  vec3 baseColor = mix(uTroughColor, uSurfaceColor, troughFactor);
  baseColor = mix(baseColor, uPeakColor, peakFactor);

  // Final composite: mix real-time reflection and sky reflection subtly
  vec3 reflectionFinal = mix(skyReflection.rgb, reflectionSample, 0.55); 
  // Tint reflection with a bit of sea color to avoid grey look
  reflectionFinal = mix(reflectionFinal, uSurfaceColor, 0.15);

  // High transparency for crystal look
  vec3 finalColor = mix(baseColor, reflectionFinal, fresnel * 0.4);
  finalColor += spec * vec3(1.0, 1.0, 0.95); // White sunlight sparkle

  gl_FragColor = vec4(finalColor, uOpacity);
}
