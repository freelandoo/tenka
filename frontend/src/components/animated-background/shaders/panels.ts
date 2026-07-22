import { FABRIC_COLORS } from './noise';

/*
 * MODULAR PANELS — instanced translucent frames. They read as interface
 * modules during state 04, matrix layers during state 05, compressed packages
 * during deployment and calm frames when the system is online.
 */

export const panelVertex = /* glsl */ `
  attribute float aSeed;
  varying vec2 vUv;
  varying float vSeed;

  void main() {
    vUv = uv;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;

export const panelFragment = /* glsl */ `
  uniform float uTime;
  uniform float uAlpha;
  uniform float uScan;     // matrix scan-line strength
  uniform float uPulse;
  varying vec2 vUv;
  varying float vSeed;

  ${FABRIC_COLORS}

  void main() {
    vec2 d = abs(vUv - 0.5);
    float box = max(d.x, d.y);
    float aa = max(fwidth(box) * 1.5, 0.004);

    // Border frame + very faint fill.
    float frame = smoothstep(0.5, 0.5 - aa * 2.0, box) * smoothstep(0.46 - aa, 0.46 + aa, box);
    float fill = smoothstep(0.5, 0.0, box) * 0.05;

    // Corner anchors.
    vec2 corner = step(0.42, d);
    float anchors = corner.x * corner.y;

    // Scan line traveling through the logic layer.
    float scanPos = fract(uTime * 0.22 + vSeed * 0.83);
    float scan = exp(-pow(vUv.y - scanPos, 2.0) * 900.0) * uScan;

    vec3 color = TQ_DARK * frame * 0.95 + TQ * anchors * 0.5 + TQ * scan * 0.65 + TQ_DARK * fill * 1.4 + TQ_LIGHT * frame * uPulse * 0.4;
    float alpha = (frame * 0.3 + fill * 0.7 + anchors * 0.22 + scan * 0.45) * uAlpha;
    if (alpha <= 0.004) discard;
    gl_FragColor = vec4(color, min(alpha, 0.85));
  }
`;
