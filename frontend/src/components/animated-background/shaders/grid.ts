import { SIMPLEX_2D, FABRIC_COLORS } from './noise';

/*
 * DIGITAL GRID — architectural workspace floor. Local plane XY becomes world
 * XZ after the mesh is rotated flat; all line math runs in local space.
 */

export const gridVertex = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;      // pointer projected onto the plane, local space
  uniform float uPointerOn;
  uniform float uDistortion;
  uniform float uPulse;       // 0..1 impulse; ring radius grows as it decays
  uniform float uPulseR;
  uniform float uDeployment;

  varying vec2 vPlane;
  varying float vLift;
  varying float vDist;

  ${SIMPLEX_2D}

  void main() {
    vec3 p = position;
    vPlane = p.xy;
    vDist = length(p.xy);

    // Slow procedural deformation — the fabric breathing.
    float n = snoise(p.xy * 0.075 + vec2(uTime * 0.05, uTime * 0.032));
    p.z += n * uDistortion * 1.9;

    // Pointer bends the grid around it — magnetic, restrained.
    float pd = distance(p.xy, uPointer);
    float near = smoothstep(5.5, 0.0, pd) * uPointerOn;
    p.z += near * 0.85;

    // Energy pulse: a ring traveling outward through the scene.
    float ring = exp(-pow(vDist - uPulseR, 2.0) * 0.09) * uPulse;
    p.z += ring * 0.6;

    // Deployment: the fabric flattens and tightens into a corridor.
    p.z *= 1.0 - uDeployment * 0.55;

    vLift = near + ring;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

export const gridFragment = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uActivity;
  uniform float uDeployment;
  uniform float uTravel;
  uniform vec2 uPointer;
  uniform float uPointerOn;

  varying vec2 vPlane;
  varying float vLift;
  varying float vDist;

  ${SIMPLEX_2D}
  ${FABRIC_COLORS}

  float gridLine(float coord, float scale) {
    float g = abs(fract(coord / scale - 0.5) - 0.5) / max(fwidth(coord / scale), 1e-4);
    return 1.0 - min(g, 1.0);
  }

  void main() {
    // Incomplete regions: parts of the workspace are still unmapped; more of
    // the fabric fills in as intensity rises.
    float region01 = snoise(vPlane * 0.045) * 0.5 + 0.5;
    float mapped = smoothstep(0.0, 0.3, uIntensity * 1.65 - region01);
    if (mapped <= 0.001) discard;

    // Minor + major lines. Deployment suppresses cross lines so everything
    // aligns toward the shared travel direction.
    float lineAlong = gridLine(vPlane.x, 2.0);   // lines running with travel
    float lineCross = gridLine(vPlane.y, 2.0) * (1.0 - uDeployment * 0.85);
    float major = max(gridLine(vPlane.x, 10.0), gridLine(vPlane.y, 10.0) * (1.0 - uDeployment * 0.8));
    float line = max(max(lineAlong, lineCross) * 0.55, major * 0.85);

    // Intersection anchor points.
    vec2 cell = fract(vPlane / 2.0 - 0.5) - 0.5;
    float dotMask = smoothstep(0.075, 0.02, length(cell) * 2.0);

    // Sparse coordinate ticks (brighter anchors) via cell hash.
    vec2 id = floor(vPlane / 2.0);
    float hash = fract(sin(dot(id, vec2(127.1, 311.7))) * 43758.5453);
    float tick = step(0.94, hash) * dotMask;

    // Deployment: light packets race along the longitudinal lines.
    float dash = smoothstep(0.82, 1.0, fract(vPlane.y * 0.11 + uTravel + hash * 0.7));
    float streak = dash * lineAlong * uDeployment;

    float pd = distance(vPlane, uPointer);
    float near = smoothstep(5.0, 0.0, pd) * uPointerOn;

    float fade = exp(-vDist * 0.032);
    float activity = clamp(uActivity + vLift + near * 0.8, 0.0, 1.0);

    // Ink on white: hue stays blue, darkness rises with activity.
    float hot = clamp(activity + tick * 0.8 + streak, 0.0, 1.0);
    vec3 color = mix(INK, INK_DEEP, hot);

    float alpha = (line * (0.16 + uIntensity * 0.28) + dotMask * 0.1 + streak * 0.5 + tick * 0.2) * fade * mapped;
    if (alpha <= 0.003) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;
