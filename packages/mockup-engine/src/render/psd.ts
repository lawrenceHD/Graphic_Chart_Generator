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
 * The footprint of a pixel on the artwork, for its mip level. Screen derivatives (dFdx) mix a pixel with
 * its 2 x 2 neighbours, which outside the map read (0, 0): the coarsest level they pick, an average of the
 * whole artwork, leaves grey dots along the box and the silhouette. The step is instead read on the map
 * itself, towards a neighbour that is on it (forward, else backward), and is zero for a lone pixel.
 */
interface MapTexel {
  readonly coverage: number;
  readonly uv: readonly [number, number];
}

/** Step of uv along one axis between `here` and a covered neighbour (mirrors the shader). */
export function mapStep(
  here: MapTexel,
  previous: MapTexel,
  next: MapTexel,
): readonly [number, number] {
  if (next.coverage > 0) return [next.uv[0] - here.uv[0], next.uv[1] - here.uv[1]];
  if (previous.coverage > 0) return [here.uv[0] - previous.uv[0], here.uv[1] - previous.uv[1]];
  return [0, 0];
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

// One texel of the slot map: uv, and its coverage in z.
vec3 mapTexel(ivec2 at) {
  ivec2 size = textureSize(uU, 0);
  if (any(lessThan(at, ivec2(0))) || any(greaterThanEqual(at, size))) return vec3(0.0);
  vec4 eu = texelFetch(uU, at, 0);
  vec4 ev = texelFetch(uV, at, 0);
  return vec3((eu.r * 255.0 * 256.0 + eu.g * 255.0) / 65535.0,
              (ev.r * 255.0 * 256.0 + ev.g * 255.0) / 65535.0, eu.b);
}
// Step of uv towards a neighbour on the map (forward, else backward): see mapStep.
vec2 mapStep(ivec2 at, ivec2 axis) {
  vec3 here = mapTexel(at);
  vec3 next = mapTexel(at + axis);
  vec3 previous = mapTexel(at - axis);
  if (next.z > 0.0) return next.xy - here.xy;
  if (previous.z > 0.0) return here.xy - previous.xy;
  return vec2(0.0);
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
    ivec2 texel = ivec2(int(gl_FragCoord.x), int(uSize.y) - 1 - int(gl_FragCoord.y));
    vec2 dx = mapStep(texel, ivec2(1, 0));
    vec2 dy = mapStep(texel, ivec2(0, 1));
    vec4 art = textureGrad(uSource, uv, dx, dy);
    // Coverage of the smart object (antialiased edge stored in blue) times the artwork's own alpha.
    layer = vec4(art.rgb, art.a * eu.b);
  }
  vec3 mixed = blend(uMode, backdrop, layer.rgb);
  outColor = vec4(mix(backdrop, mixed, layer.a * uOpacity), 1.0);
}
`;
