import { FABRIC_COLORS } from './noise';

/*
 * Point programs: data nodes (square technical glyphs), data packets (bright
 * travelers) and far atmospheric particles. Positions come from CPU-side
 * layout interpolation; shaders handle sizing, activation and glyph drawing.
 */

export const nodeVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uActivity;
  uniform float uPulse;
  uniform float uCta;
  uniform vec3 uPointerWorld;
  uniform float uPointerOn;
  uniform float uSizeScale;

  varying float vActive;
  varying float vSeed;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    float near = smoothstep(4.5, 0.5, distance(world.xyz, uPointerWorld)) * uPointerOn;

    // A node activates once the activity level passes its seed threshold.
    float act = smoothstep(aSeed + 0.06, aSeed - 0.04, uActivity + uCta * 0.25);
    vActive = clamp(act + near * 0.9 + uPulse * 0.35 * act, 0.0, 1.3);
    vSeed = aSeed;

    vec4 mv = viewMatrix * world;
    gl_Position = projectionMatrix * mv;
    float size = (2.2 + act * 2.6 + near * 2.4 + uPulse * act * 1.4) * uSizeScale;
    gl_PointSize = size * (30.0 / max(1.0, -mv.z));
  }
`;

export const nodeFragment = /* glsl */ `
  uniform float uTime;
  varying float vActive;
  varying float vSeed;

  ${FABRIC_COLORS}

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float box = max(abs(c.x), abs(c.y));
    if (box > 0.5) discard;

    // Square technical glyph: outer frame + inner core.
    float frame = smoothstep(0.5, 0.44, box) * smoothstep(0.3, 0.4, box);
    float core = smoothstep(0.2, 0.04, box);

    float blink = 0.9 + 0.1 * sin(uTime * 2.0 + vSeed * 40.0);
    // Idle node = base blue; active node darkens toward the deep stroke.
    vec3 color = mix(INK, INK_DEEP, clamp(vActive, 0.0, 1.0)) * blink;

    float alpha = frame * (0.22 + vActive * 0.75) + core * (0.1 + vActive * 0.95);
    if (alpha <= 0.004) discard;
    gl_FragColor = vec4(color, min(alpha, 1.0));
  }
`;

export const packetVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uDensity;
  uniform float uSizeScale;
  varying float vOn;

  void main() {
    vOn = smoothstep(aSeed + 0.05, aSeed - 0.05, uDensity);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (2.6 + aSeed * 1.4) * uSizeScale * (30.0 / max(1.0, -mv.z));
  }
`;

export const packetFragment = /* glsl */ `
  varying float vOn;
  ${FABRIC_COLORS}

  void main() {
    if (vOn <= 0.01) discard;
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float glow = smoothstep(0.25, 0.0, d);
    // Travellers read as solid deep-blue dots on the white page.
    gl_FragColor = vec4(mix(INK, INK_DEEP, glow), glow * vOn);
  }
`;

export const particleVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSizeScale;
  varying float vSeed;

  void main() {
    vec3 p = position;
    // Slow atmospheric drift, far layer only.
    p.x += sin(uTime * 0.05 + aSeed * 20.0) * 1.4;
    p.y += cos(uTime * 0.04 + aSeed * 32.0) * 0.9;
    vSeed = aSeed;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = (1.0 + aSeed * 1.6) * uSizeScale * (30.0 / max(1.0, -mv.z));
  }
`;

export const particleFragment = /* glsl */ `
  uniform float uOpacity;
  varying float vSeed;
  ${FABRIC_COLORS}

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = dot(c, c);
    if (d > 0.25) discard;
    float glow = smoothstep(0.25, 0.02, d);
    vec3 color = mix(INK_SOFT, INK, vSeed * 0.5);
    gl_FragColor = vec4(color, glow * uOpacity * (0.35 + vSeed * 0.4));
  }
`;
