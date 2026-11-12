import type { PsdBlend } from '@app/contracts';

// Scenes baked from Photoshop mockups (tools/psd-mockups/bake.py, schema 3): the PSD's layers replayed
// bottom to top. An image layer is drawn with its blend mode; a paint layer fills its mask with a brand
// colour; a slot shows the brand's artwork through a UV map that carries the smart object's perspective
// and warp. Blending is done on gamma-encoded values, as Photoshop does by default.

export const BLEND_CODES: Readonly<Record<PsdBlend, number>> = {
  normal: 0,
  multiply: 1,
  screen: 2,
  overlay: 3,
  'soft-light': 4,
  darken: 5,
  lighten: 6,
};

/** Photoshop's separable blend modes on one channel (a = backdrop, b = layer), values in [0, 1]. */
export function blendChannel(mode: number, a: number, b: number): number {
  switch (mode) {
    case 1:
      return a * b;
    case 2:
      return a + b - a * b;
    case 3:
      return a < 0.5 ? 2 * a * b : 1 - 2 * (1 - a) * (1 - b);
    case 4:
      return b < 0.5 ? a - (1 - 2 * b) * a * (1 - a) : a + (2 * b - 1) * (Math.sqrt(a) - a);
    case 5:
      return Math.min(a, b);
    case 6:
      return Math.max(a, b);
    default:
      return b;
  }
}

/** u or v of a UV map pixel: 16 bits, high byte in red, low byte in green. */
export function decodeUv(red: number, green: number): number {
  return (red * 256 + green) / 65535;
}

/**
 * Where the map ends, a neighbouring pixel outside it reads (0, 0): the step towards it is not a footprint,
 * and the coarsest mip level it picks (an average of the whole artwork) would draw a grey line along the
 * box. That neighbour is told by its coverage, zero, not by the size of the step: near the silhouette of a
 * squashed cylinder large steps are real and keep their mip level. Only the axis towards it drops.
 */
type Gradient = readonly [number, number];
const EDGE = 0.5 / 255;

const outside = (coverage: number, step: number) =>
  coverage > 0 && Math.abs(step) >= coverage - EDGE;

/** The derivatives the slot samples its artwork with, from the coverage and its derivatives (mirrors the shader). */
export function guardGradient(
  dx: Gradient,
  dy: Gradient,
  coverage: number,
  coverageStep: Gradient,
): readonly [Gradient, Gradient] {
  return [
    outside(coverage, coverageStep[0]) ? [0, 0] : dx,
    outside(coverage, coverageStep[1]) ? [0, 0] : dy,
  ];
}

export const PSD_LAYER_SHADER = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform vec2 uSize;
uniform sampler2D uPrev;
uniform sampler2D uSource;   // image layer, paint mask, or the slot's artwork
uniform sampler2D uU;
uniform sampler2D uV;
uniform int uKind;           // 0 image, 1 paint, 2 slot
uniform int uMode;
uniform float uOpacity;
uniform vec3 uColor;         // paint, sRGB
out vec4 outColor;

float blendOne(int mode, float a, float b) {
  if (mode == 1) return a * b;
  if (mode == 2) return a + b - a * b;
  if (mode == 3) return a < 0.5 ? 2.0 * a * b : 1.0 - 2.0 * (1.0 - a) * (1.0 - b);
  if (mode == 4) return b < 0.5 ? a - (1.0 - 2.0 * b) * a * (1.0 - a) : a + (2.0 * b - 1.0) * (sqrt(a) - a);
  if (mode == 5) return min(a, b);
  if (mode == 6) return max(a, b);
  return b;
}
vec3 blend(int mode, vec3 a, vec3 b) {
  return vec3(blendOne(mode, a.r, b.r), blendOne(mode, a.g, b.g), blendOne(mode, a.b, b.b));
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y) / uSize;
  vec3 backdrop = texelFetch(uPrev, ivec2(gl_FragCoord.xy), 0).rgb;
  vec4 layer;
  if (uKind == 0) {
    layer = texture(uSource, p);
  } else if (uKind == 1) {
    layer = vec4(uColor, texture(uSource, p).r);
  } else {
    vec4 eu = texture(uU, p);
    vec4 ev = texture(uV, p);
    vec2 uv = vec2((eu.r * 255.0 * 256.0 + eu.g * 255.0) / 65535.0,
                   (ev.r * 255.0 * 256.0 + ev.g * 255.0) / 65535.0);
    vec2 dx = dFdx(uv);
    vec2 dy = dFdy(uv);
    float edge = ${EDGE.toFixed(6)};
    // Derivatives taken outside any condition: they need the whole 2 x 2 quad.
    float cx = abs(dFdx(eu.b));
    float cy = abs(dFdy(eu.b));
    if (eu.b > 0.0 && cx >= eu.b - edge) dx = vec2(0.0);
    if (eu.b > 0.0 && cy >= eu.b - edge) dy = vec2(0.0);
    vec4 art = textureGrad(uSource, uv, dx, dy);
    // Coverage of the smart object (antialiased edge stored in blue) times the artwork's own alpha.
    layer = vec4(art.rgb, art.a * eu.b);
  }
  vec3 mixed = blend(uMode, backdrop, layer.rgb);
  outColor = vec4(mix(backdrop, mixed, layer.a * uOpacity), 1.0);
}
`;
