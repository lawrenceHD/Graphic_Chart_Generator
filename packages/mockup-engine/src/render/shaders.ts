// GLSL of the compositor (06_MOCKUP_ENGINE.md §4.2–§4.3, v2). Pixels are scene pixels, y down; textures
// are uploaded without flipping, so texture row 0 is the photograph's top. The composite lives in sRGB
// textures and is blended in linear light.

export const VERTEX = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const COMMON = `#version 300 es
precision highp float;
precision highp sampler2D;
uniform vec2 uSize;
out vec4 outColor;
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec2 scenePixel() { return vec2(gl_FragCoord.x, uSize.y - gl_FragCoord.y); }
`;

/** Copies the photograph into the composite, or the composite onto the canvas. */
export const COPY = `${COMMON}
uniform sampler2D uSource;
uniform bool uFromPhoto;
void main() {
  vec4 c = uFromPhoto
    ? texture(uSource, scenePixel() / uSize)
    : texelFetch(uSource, ivec2(gl_FragCoord.xy), 0);
  outColor = vec4(c.rgb, 1.0);
}
`;

/** One surface of the scene: paint its object, then lay the logo with its finish. */
export const SURFACE = `${COMMON}
uniform sampler2D uPrev;
uniform sampler2D uBase;
uniform sampler2D uMask;
uniform sampler2D uLogo;
uniform bool uHasMask;
uniform bool uHasPaint;
uniform bool uHasLogo;
uniform mat3 uInverse;   // scene pixel -> surface unit square
uniform vec4 uRect;      // logo box in the unit square: u0, v0, u1, v1
uniform vec3 uPaint;     // linear
uniform vec3 uTint;      // linear tint of the photographed surface
uniform int uFinish;     // 0 print, 1 emboss, 2 deboss, 3 foil, 4 embroidery, 5 engrave, 6 screen
uniform float uDisplace; // pixels of displacement per unit of luminance slope (fabric folds)
uniform float uWeave;    // how much the support's texture breaks the ink (0 paper, 1 coarse fabric)
uniform float uLogoLod;  // mip level whose texels are ~2 scene pixels (relief height map)
uniform vec3 uLight;     // x right, y down, z towards the viewer
uniform vec3 uFoilDark;
uniform vec3 uFoilLight;

float baseLuma(vec2 p) { return luma(toLinear(texture(uBase, p / uSize).rgb)); }
float baseLumaBlur(vec2 p) { return luma(toLinear(textureLod(uBase, p / uSize, 3.0).rgb)); }

vec2 logoUv(vec2 p) {
  vec3 q = uInverse * vec3(p, 1.0);
  vec2 uv = q.xy / q.z;
  return (uv - uRect.xy) / (uRect.zw - uRect.xy);
}
bool inside(vec2 l) { return all(greaterThanEqual(l, vec2(0.0))) && all(lessThanEqual(l, vec2(1.0))); }

float hash(vec2 p) { return fract(sin(dot(floor(p), vec2(12.9898, 78.233))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = smoothstep(0.0, 1.0, fract(p));
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}

void main() {
  vec2 p = scenePixel();
  vec3 colour = toLinear(texelFetch(uPrev, ivec2(gl_FragCoord.xy), 0).rgb);
  vec3 base = toLinear(texture(uBase, p / uSize).rgb);
  float tintLuma = max(luma(uTint), 0.02);
  // Shading of the photographed object: its light, folds and paper grain, relative to its own tint.
  float shade = clamp(luma(base) / tintLuma, 0.0, 1.6);
  float m = uHasMask ? texture(uMask, p / uSize).r : 0.0;

  if (uHasPaint && m > 0.0) {
    // No printed stock is truly black: a floor of ~2 % reflectance keeps its light, grain and shadows.
    vec3 stock = max(uPaint, vec3(0.02));
    vec3 painted = uFinish == 6
      ? uPaint + max(base - uTint, vec3(0.0)) * 0.9          // a screen: lit from within, glare kept
      : stock * min(shade, 1.0) + vec3(max(shade - 1.0, 0.0)) * 0.55; // ink on stock, sheen kept
    colour = mix(colour, painted, m);
  }

  if (uHasLogo) {
    // Fabric: the print follows the folds (displacement along the slope of the photograph's light).
    vec2 slope = vec2(baseLuma(p + vec2(2, 0)) - baseLuma(p - vec2(2, 0)),
                      baseLuma(p + vec2(0, 2)) - baseLuma(p - vec2(0, 2)));
    vec2 q = p + slope * uDisplace;
    // 2 x 2 supersampling of the projected logo.
    vec4 logo = vec4(0.0);
    for (int i = 0; i < 4; i++) {
      vec2 o = vec2(float(i % 2), float(i / 2)) * 0.5 - 0.25;
      vec2 l = logoUv(q + o);
      if (inside(l)) logo += texture(uLogo, l);
    }
    logo *= 0.25;
    float a = logo.a;
    if (a > 0.0) {
      vec3 ink = toLinear(logo.rgb / max(a, 1e-4));
      // Relief: normal of the blurred logo alpha (06 §4.3, emboss).
      vec2 l = logoUv(q);
      vec2 e = vec2(exp2(uLogoLod)) / vec2(textureSize(uLogo, 0));
      float hx = textureLod(uLogo, l + vec2(e.x, 0.0), uLogoLod).a - textureLod(uLogo, l - vec2(e.x, 0.0), uLogoLod).a;
      float hy = textureLod(uLogo, l + vec2(0.0, e.y), uLogoLod).a - textureLod(uLogo, l - vec2(0.0, e.y), uLogoLod).a;
      vec3 n = normalize(vec3(-hx * 3.0, -hy * 3.0, 1.0));
      float relief = dot(n, uLight) - uLight.z;
      // The support's own texture (weave, grain) breaks the ink a little.
      float detail = luma(base) / max(baseLumaBlur(p), 0.02) - 1.0;
      float support = clamp(1.0 + detail * 3.0 * uWeave, 0.55, 1.0);
      float surfaceShade = min(shade, 1.15);

      if (uFinish == 0) {
        vec3 printed = ink * mix(1.0, surfaceShade, 0.9);
        colour = mix(colour, printed, a * 0.96 * support);
      } else if (uFinish == 1 || uFinish == 2) {
        float sign = uFinish == 1 ? 1.0 : -1.0;
        float halo = textureLod(uLogo, l, uLogoLod).a;
        colour *= 1.0 + sign * relief * 0.9 - 0.06 * halo * (1.0 - a);
      } else if (uFinish == 3) {
        // Metal mirrors its surroundings: a broad band of environment, the relief's edges catching the
        // light, a fine hammered grain, and the scene's own light and shadows over it.
        vec3 r = reflect(-uLight, n);
        float facing = dot(r, vec3(0.0, 0.0, 1.0));
        float band = sin((p.x * 0.9 + p.y * 0.45) / uSize.x * 8.0);
        float grain = noise(l * 420.0) - 0.5;
        float t = clamp(0.42 + 0.3 * facing + 0.28 * band + 0.3 * relief + 0.14 * grain, 0.0, 1.0);
        vec3 foil = mix(uFoilDark, uFoilLight, smoothstep(0.08, 0.92, t));
        foil += uFoilLight * pow(clamp(relief * 2.2, 0.0, 1.0), 2.0) * 0.6;
        foil *= mix(0.55, 1.2, clamp(shade, 0.0, 1.3));
        colour = mix(colour, foil, a);
      } else if (uFinish == 4) {
        float threads = 0.82 + 0.18 * sin(dot(p, vec2(0.71, 0.71)) * 2.4);
        float lift = 0.78 + 0.5 * max(relief + 0.35, 0.0);
        vec3 stitched = ink * threads * lift * mix(1.0, surfaceShade, 0.6);
        float halo = textureLod(uLogo, l + vec2(0.004, 0.006), uLogoLod).a;
        colour *= 1.0 - 0.18 * halo * (1.0 - a);
        colour = mix(colour, stitched, a);
      } else if (uFinish == 5) {
        float carved = 0.42 + 0.25 * clamp(-relief, 0.0, 1.0);
        colour = mix(colour, colour * carved, a);
      } else {
        colour = mix(colour, ink, a);
      }
    }
  }
  outColor = vec4(toSrgb(colour), 1.0);
}
`;
