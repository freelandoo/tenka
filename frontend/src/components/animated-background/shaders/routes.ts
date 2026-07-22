import { FABRIC_COLORS } from './noise';

/*
 * DATA ROUTES — line segments between node pairs. Endpoints are rewritten on
 * the CPU every frame from live node positions, so routes stretch and redraw
 * as the fabric reorganises. The fragment runs a directional flow band.
 */

export const routeVertex = /* glsl */ `
  attribute float aT;     // 0 at route start, 1 at route end
  attribute float aSeed;  // per-segment
  varying float vT;
  varying float vSeed;

  void main() {
    vT = aT;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const routeFragment = /* glsl */ `
  uniform float uTime;
  uniform float uDensity;
  uniform float uSpeed;
  uniform float uPulse;
  varying float vT;
  varying float vSeed;

  ${FABRIC_COLORS}

  void main() {
    // Route activates once density passes its seed.
    float on = smoothstep(vSeed + 0.05, vSeed - 0.06, uDensity);
    if (on <= 0.01) discard;

    // Directional flow: a bright band travels start -> end.
    float band = fract(vT * 1.5 - uTime * (0.25 + uSpeed * 0.9) - vSeed * 7.0);
    float flow = smoothstep(0.86, 0.99, band) * (0.25 + uSpeed);

    // Endpoint pulse — connections light up where they meet nodes.
    float ends = max(smoothstep(0.12, 0.0, vT), smoothstep(0.88, 1.0, vT)) * 0.4;

    vec3 color = mix(NEUTRAL * 0.35, TQ_DARK * 1.6, on) + TQ * flow + TQ * ends * on + TQ_LIGHT * flow * uPulse * 0.5;
    float alpha = on * (0.09 + flow * 0.75 + ends * 0.35);
    gl_FragColor = vec4(color, min(alpha, 0.9));
  }
`;
