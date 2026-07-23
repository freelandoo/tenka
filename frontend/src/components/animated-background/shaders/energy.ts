import { SIMPLEX_2D, FABRIC_COLORS } from './noise';

/*
 * ENERGY FIELD — far-layer flowing turquoise bands. Extremely low alpha:
 * atmosphere, not spectacle.
 */

export const energyVertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const energyFragment = /* glsl */ `
  uniform float uTime;
  uniform float uEnergy;
  varying vec2 vUv;

  ${SIMPLEX_2D}
  ${FABRIC_COLORS}

  void main() {
    if (uEnergy <= 0.005) discard;
    float bands = snoise(vec2(vUv.x * 2.6 + uTime * 0.03, vUv.y * 5.5 - uTime * 0.018));
    float flow = smoothstep(0.15, 0.85, bands * 0.5 + 0.5);
    // Fade toward every edge so the plane never reads as a rectangle.
    float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x)
               * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
    vec3 color = mix(INK_SOFT, INK, flow * 0.5);
    gl_FragColor = vec4(color, flow * edge * uEnergy * 0.3);
  }
`;
