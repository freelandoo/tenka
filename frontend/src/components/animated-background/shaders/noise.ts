/** Shared GLSL 2D simplex noise (Ashima/IQ derivative, public domain). */
export const SIMPLEX_2D = /* glsl */ `
  vec3 sn_permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = sn_permute(sn_permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
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
`;

/**
 * Palette constants shared by every fabric shader (sRGB 0..1).
 * Blueprint ink on white paper: fragments blend NORMALLY over the white page,
 * so colours are inks (dark = strong) and alpha is coverage. INK is the base
 * blue, INK_DEEP the emphasised stroke, INK_SOFT a faint idle line.
 */
export const FABRIC_COLORS = /* glsl */ `
  const vec3 INK = vec3(0.114, 0.420, 1.0);       // #1d6bff base blue
  const vec3 INK_DEEP = vec3(0.031, 0.196, 0.627); // #0832a0 emphasis
  const vec3 INK_SOFT = vec3(0.620, 0.741, 1.0);   // #9ebdff faint idle
  const vec3 NEUTRAL = vec3(0.80, 0.84, 0.92);     // faint slate
  // Legacy aliases (kept so any stray reference still compiles).
  const vec3 TQ = vec3(0.114, 0.420, 1.0);
  const vec3 TQ_LIGHT = vec3(0.031, 0.196, 0.627);
  const vec3 TQ_DARK = vec3(0.620, 0.741, 1.0);
`;
