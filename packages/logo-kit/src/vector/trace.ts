import { parseHex } from '@app/color-engine';
import type { BinaryMask, RasterError, Rasterizer, Vectorizer } from '@app/contracts';
import { err, ok, type Result } from '@app/kernel';
import { sanitizeSvg } from '@app/svg-engine';
import { iou, type RgbaRaster } from '../mono/fidelity.js';

// Raster path of 05_ENGINES.md §5 (T-011): a small PNG logo becomes a vector one, colour by colour. Each
// pixel is unmixed into the logo's inks (anti-aliased edges are partial coverage), each ink's coverage is
// enlarged smoothly and cut at 0.5 — the outline the designer drew, not the pixel staircase —, then traced
// by the injected Vectorizer. The result is scored against the upload, never shown as the original.

type Rgb = readonly [number, number, number];
export interface VectorizeOptions {
  /** Inks of the logo (palette clusters), background excluded. */
  readonly colors: readonly string[];
  /** Opaque background colour, or null for a transparent upload. */
  readonly background: string | null;
  /** Target width of the traced drawing, in pixels. */
  readonly width: number;
}
export interface VectorLogo {
  /** Sanitized SVG, one path group per ink. */
  readonly svg: string;
  /** IoU of the drawing's coverage against the upload's, at the upload's size. */
  readonly fidelity: number;
  /** Inks that have ink in the logo, in the order drawn. */
  readonly colors: readonly string[];
}

const MIN_ALPHA = 0.03;
const MAX_SIDE = 4096;
// Below this local peak, coverage is noise (JPEG ringing, a shadow), not a stroke.
const MIN_PEAK = 0.05;
const PATH_DATA = /^[MLHVCSQTAZmlhvcsqtaz\d\s.,eE+-]*$/u;

const rgb = (hex: string): Rgb | null => {
  const parsed = parseHex(hex);
  return parsed.ok ? [parsed.value.r, parsed.value.g, parsed.value.b] : null;
};

/** Closest point of segment a→b to p: position t in [0, 1] and squared distance. */
function project(p: Rgb, a: Rgb, b: Rgb): readonly [number, number] {
  const v = [b[0] - a[0], b[1] - a[1], b[2] - a[2]] as const;
  const length = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const raw =
    length === 0
      ? 0
      : ((p[0] - a[0]) * v[0] + (p[1] - a[1]) * v[1] + (p[2] - a[2]) * v[2]) / length;
  const t = Math.min(1, Math.max(0, raw));
  const d = [p[0] - a[0] - t * v[0], p[1] - a[1] - t * v[1], p[2] - a[2] - t * v[2]] as const;
  return [t, d[0] * d[0] + d[1] * d[1] + d[2] * d[2]];
}

function isOpaque(raster: RgbaRaster): boolean {
  for (let offset = 3; offset < raster.rgba.length; offset += 4)
    if ((raster.rgba[offset] ?? 0) < 250) return false;
  return true;
}

/**
 * Share of each ink in every pixel. A pixel is the best of: background → ink (an anti-aliased edge), or
 * ink → ink (two inks touching); its alpha scales the result. An opaque upload without a detected
 * background is read on white.
 */
export function coverageLayers(
  raster: RgbaRaster,
  colors: readonly string[],
  background: string | null,
): Float32Array[] {
  const inks = colors.map(rgb).filter((ink): ink is Rgb => ink !== null);
  const ground = background === null ? (isOpaque(raster) ? rgb('#FFFFFF') : null) : rgb(background);
  const size = raster.width * raster.height;
  const layers = inks.map(() => new Float32Array(size));
  for (let pixel = 0; pixel < size; pixel += 1) {
    const offset = pixel * 4;
    const alpha = (raster.rgba[offset + 3] ?? 0) / 255;
    if (alpha < MIN_ALPHA) continue;
    const p: Rgb = [
      raster.rgba[offset] ?? 0,
      raster.rgba[offset + 1] ?? 0,
      raster.rgba[offset + 2] ?? 0,
    ];
    let best = Number.POSITIVE_INFINITY;
    let shares: readonly (readonly [number, number])[] = [];
    inks.forEach((ink, index) => {
      // A transparent edge pixel keeps its ink colour: only an opaque one is mixed with the ground.
      const [t, distance] =
        ground === null ? [1, project(p, ink, ink)[1]] : project(p, ground, ink);
      if (distance < best) {
        best = distance;
        shares = [[index, t]];
      }
      for (let other = index + 1; other < inks.length; other += 1) {
        const [s, between] = project(p, ink, inks[other] ?? ink);
        if (between < best) {
          best = between;
          shares = [
            [index, 1 - s],
            [other, s],
          ];
        }
      }
    });
    for (const [index, share] of shares) {
      const layer = layers[index];
      if (layer !== undefined) layer[pixel] = share * alpha;
    }
  }
  return layers;
}

/** Linear resampling of rows of `width` values to `width × scale` (pixel centres aligned). */
function stretchRows(
  values: Float32Array,
  width: number,
  rows: number,
  scale: number,
): Float32Array {
  const outWidth = width * scale;
  const out = new Float32Array(outWidth * rows);
  for (let x = 0; x < outWidth; x += 1) {
    const source = Math.min(width - 1, Math.max(0, (x + 0.5) / scale - 0.5));
    const left = Math.floor(source);
    const right = Math.min(width - 1, left + 1);
    const f = source - left;
    for (let y = 0; y < rows; y += 1)
      out[y * outWidth + x] =
        (values[y * width + left] ?? 0) * (1 - f) + (values[y * width + right] ?? 0) * f;
  }
  return out;
}

function transpose(values: Float32Array, width: number, height: number): Float32Array {
  const out = new Float32Array(values.length);
  for (let y = 0; y < height; y += 1)
    for (let x = 0; x < width; x += 1) out[x * height + y] = values[y * width + x] ?? 0;
  return out;
}

/** Box blur of each row (edge values repeated), radius r. */
function blurRows(values: Float32Array, width: number, rows: number, r: number): Float32Array {
  const out = new Float32Array(values.length);
  const span = 2 * r + 1;
  for (let y = 0; y < rows; y += 1) {
    const base = y * width;
    const at = (x: number) => values[base + Math.min(width - 1, Math.max(0, x))] ?? 0;
    let sum = 0;
    for (let x = -r; x <= r; x += 1) sum += at(x);
    for (let x = 0; x < width; x += 1) {
      out[base + x] = sum / span;
      sum += at(x + r + 1) - at(x - r);
    }
  }
  return out;
}

/**
 * Enlarges one ink's coverage `scale` times — linear interpolation, then a light blur that removes what
 * is left of the pixel grid — and cuts it at half coverage.
 */
export function smoothMask(
  coverage: Float32Array,
  width: number,
  height: number,
  scale: number,
): BinaryMask {
  const outWidth = width * scale;
  const outHeight = height * scale;
  const radius = Math.round(scale / 4);
  let rows = stretchRows(coverage, width, height, scale);
  if (radius > 0)
    rows = blurRows(blurRows(rows, outWidth, height, radius), outWidth, height, radius);
  let columns = stretchRows(transpose(rows, outWidth, height), height, outWidth, scale);
  if (radius > 0)
    columns = blurRows(blurRows(columns, outHeight, outWidth, radius), outHeight, outWidth, radius);
  const full = transpose(columns, outHeight, outWidth);
  // The cut follows the local peak m: 0.5 on solid ink, m(1 − m/2) on a stroke thinner than a pixel,
  // whose enlarged profile is a tent of height m — the level where the tent is as wide as the ink.
  // Window of half a source pixel: wide enough to see a hairline's peak, narrow enough not to take the
  // peak of the solid stroke it joins.
  const reach = Math.ceil(scale / 2);
  const peak = maxRows(
    transpose(maxRows(full, outWidth, outHeight, reach), outWidth, outHeight),
    outHeight,
    outWidth,
    reach,
  );
  const data = new Uint8Array(full.length);
  for (let y = 0; y < outHeight; y += 1)
    for (let x = 0; x < outWidth; x += 1) {
      const m = Math.min(1, peak[x * outHeight + y] ?? 0);
      const value = full[y * outWidth + x] ?? 0;
      data[y * outWidth + x] = m >= MIN_PEAK && value >= m * (1 - m / 2) ? 1 : 0;
    }
  return { width: outWidth, height: outHeight, data };
}

/** Running maximum of each row over [x − r, x + r]. */
function maxRows(values: Float32Array, width: number, rows: number, r: number): Float32Array {
  const out = new Float32Array(values.length);
  for (let y = 0; y < rows; y += 1) {
    const base = y * width;
    for (let x = 0; x < width; x += 1) {
      let max = 0;
      const end = Math.min(width - 1, x + r);
      for (let at = Math.max(0, x - r); at <= end; at += 1)
        max = Math.max(max, values[base + at] ?? 0);
      out[base + x] = max;
    }
  }
  return out;
}

const failed = (reason: string): RasterError => ({ code: 'RASTER_FAILED', reason });

/** Traces each ink of a raster logo and assembles a sanitized SVG, scored against the upload. */
export async function vectorizeRaster(
  raster: RgbaRaster,
  options: VectorizeOptions,
  vectorizer: Vectorizer,
  rasterizer: Rasterizer,
): Promise<Result<VectorLogo, RasterError>> {
  const { width, height } = raster;
  const scale = Math.max(
    1,
    Math.min(Math.ceil(options.width / width), Math.floor(MAX_SIDE / Math.max(width, height))),
  );
  const inks = options.colors.map((hex) => hex.toUpperCase()).filter((hex) => rgb(hex) !== null);
  const layers = coverageLayers(raster, inks, options.background);
  const drawn: string[] = [];
  const groups: string[] = [];
  for (const [index, layer] of layers.entries()) {
    const mask = smoothMask(layer, width, height, scale);
    if (!mask.data.includes(1)) continue;
    const traced = await vectorizer.trace(mask);
    if (!traced.ok) return traced;
    const paths: string[] = [];
    for (const { d, dx, dy } of traced.value) {
      if (!PATH_DATA.test(d) || !Number.isFinite(dx) || !Number.isFinite(dy))
        return err(failed('traced path data is not plain path syntax'));
      paths.push(`<path transform="translate(${String(dx)} ${String(dy)})" d="${d}"/>`);
    }
    if (paths.length === 0) continue;
    const hex = inks[index] ?? '#000000';
    drawn.push(hex);
    groups.push(`<g fill="${hex}">${paths.join('')}</g>`);
  }
  if (groups.length === 0) return err(failed('no ink to trace'));
  const [w, h] = [width * scale, height * scale].map(String);
  const sanitized = sanitizeSvg(
    new TextEncoder().encode(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w ?? ''} ${h ?? ''}" width="${w ?? ''}" height="${h ?? ''}">${groups.join('')}</svg>`,
    ),
  );
  if (!sanitized.ok) return err(failed(sanitized.error.code));

  // Fidelity: covered pixels of the drawing against the upload's inked pixels, at the upload's size.
  const rendered = await rasterizer.rasterize(sanitized.value.svg, width);
  if (!rendered.ok) return rendered;
  const original = new Uint8Array(width * height);
  for (let pixel = 0; pixel < original.length; pixel += 1) {
    let sum = 0;
    for (const layer of layers) sum += layer[pixel] ?? 0;
    original[pixel] = sum >= 0.5 ? 1 : 0;
  }
  const drawing = new Uint8Array(width * height);
  if (rendered.value.width === width && rendered.value.height === height)
    for (let pixel = 0; pixel < drawing.length; pixel += 1)
      drawing[pixel] = (rendered.value.rgba[pixel * 4 + 3] ?? 0) >= 128 ? 1 : 0;
  return ok({ svg: sanitized.value.svg, fidelity: iou(original, drawing), colors: drawn });
}
