import { FABRIC_COLORS } from './noise';

/*
 * DEPLOYMENT STREAM — forward-moving streak lines in a controlled corridor.
 * Travel is scroll-driven (uTravel) plus continuous flow (uTime): scrolling
 * back reverses the corridor exactly.
 */

export const streamVertex = /* glsl */ `
  attribute float aT;      // 0 = head, 1 = tail of a streak
  attribute float aBase;   // segment base offset along the corridor
  attribute float aSeed;
  uniform float uTime;
  uniform float uTravel;
  uniform float uSpeed;
  uniform float uStretch;  // scroll-velocity trail lengthening, clamped
  varying float vT;
  varying float vSeed;
  varying float vDepth;

  void main() {
    vT = aT;
    vSeed = aSeed;
    vec3 p = position;
    float corridor = 46.0;
    float len = (0.9 + aSeed * 1.6) * (1.0 + uStretch);
    // Both endpoints wrap by the same amount — no cross-corridor artifacts.
    float head = mod(aBase + uTravel + uTime * (2.0 + uSpeed * 9.0) * (0.5 + aSeed), corridor);
    p.z = 6.0 - head - aT * len;
    // Slight funnel convergence toward the far end.
    float funnel = 1.0 - clamp(head / corridor, 0.0, 1.0) * 0.3;
    p.xy *= funnel;
    vDepth = head / corridor;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const streamFragment = /* glsl */ `
  uniform float uDeploy;
  varying float vT;
  varying float vSeed;
  varying float vDepth;

  ${FABRIC_COLORS}

  void main() {
    if (uDeploy <= 0.01) discard;
    // Bright head fading along the tail; depth fade at both corridor ends.
    float body = 1.0 - vT;
    float fade = smoothstep(0.0, 0.12, vDepth) * smoothstep(1.0, 0.75, vDepth);
    vec3 color = mix(INK, INK_DEEP, body * 0.7);
    float alpha = body * fade * uDeploy * (0.25 + vSeed * 0.45);
    if (alpha <= 0.004) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;
